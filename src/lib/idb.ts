/**
 * IndexedDB ユーティリティ — localStorage の永続化バックアップ層
 *
 * 設計方針:
 * - すべての操作は非同期・非ブロッキング。失敗しても localStorage に影響しない。
 * - DB: "sleep-forecast-v1" / stores: "records" + "session"
 * - "records"  → 睡眠記録の二重バックアップ (keyPath: "date")
 * - "session"  → Supabase 匿名セッションの refresh_token バックアップ (keyPath: "key")
 *
 * なぜ IndexedDB か:
 * - localStorage は PWA Service Worker の skipWaiting/clientsClaim サイクルや
 *   ブラウザ設定によって予期せずクリアされることがある
 * - IndexedDB は別ストレージエンジンを使用しており、同じ「サイトデータ削除」操作でも
 *   異なるタイミング・パスで消去されるため、どちらか一方が生き残るケースが多い
 * - localStorage が空でも IDB にデータがあれば自動復元できる
 */

import type { SleepRecord } from "./types";

const IDB_NAME = "sleep-forecast-v1";
const IDB_VERSION = 1;
const RECORDS_STORE = "records";
const SESSION_STORE = "session";
const SESSION_KEY = "sf_session_v1";

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type SessionBackup = {
  key: string;
  userId: string;
  refreshToken: string;
  savedAt: string;
};

// ─── 内部ユーティリティ ───────────────────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE, { keyPath: "date" });
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IDB blocked"));
  });
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("IDB transaction aborted"));
  });
}

// ─── 記録ストア ───────────────────────────────────────────────────────────────

/**
 * 全記録を IndexedDB に書き込む（既存データをすべて置き換え）。
 * writeAll() から fire-and-forget で呼ぶ。失敗は無視。
 */
export async function idbPutRecords(records: SleepRecord[]): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(RECORDS_STORE, "readwrite");
    const store = tx.objectStore(RECORDS_STORE);
    store.clear();
    for (const r of records) {
      store.put(r);
    }
    await txComplete(tx);
    db.close();
  } catch {
    // 非致命的エラー — localStorage が主ストアなので無視
  }
}

/**
 * IndexedDB から全記録を取得する。
 * localStorage が空のとき復元に使う。
 */
export async function idbGetRecords(): Promise<SleepRecord[]> {
  try {
    const db = await openIDB();
    const tx = db.transaction(RECORDS_STORE, "readonly");
    const req = tx.objectStore(RECORDS_STORE).getAll();
    const records = await new Promise<SleepRecord[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result ?? []) as SleepRecord[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return records;
  } catch {
    return [];
  }
}

// ─── セッションストア ─────────────────────────────────────────────────────────

/**
 * Supabase 匿名セッションの refresh_token を IndexedDB にバックアップする。
 * セッション確立・更新のたびに呼ぶ。
 */
export async function idbSaveSession(
  userId: string,
  refreshToken: string
): Promise<void> {
  if (!userId || !refreshToken) return;
  try {
    const db = await openIDB();
    const tx = db.transaction(SESSION_STORE, "readwrite");
    const entry: SessionBackup = {
      key: SESSION_KEY,
      userId,
      refreshToken,
      savedAt: new Date().toISOString(),
    };
    tx.objectStore(SESSION_STORE).put(entry);
    await txComplete(tx);
    db.close();
  } catch {
    // 非致命的
  }
}

/**
 * IndexedDB から Supabase セッションバックアップを取得する。
 * localStorage のセッションが消えたとき復元に使う。
 */
export async function idbGetSession(): Promise<{
  userId: string;
  refreshToken: string;
} | null> {
  try {
    const db = await openIDB();
    const tx = db.transaction(SESSION_STORE, "readonly");
    const req = tx.objectStore(SESSION_STORE).get(SESSION_KEY);
    const result = await new Promise<SessionBackup | null>((resolve, reject) => {
      req.onsuccess = () =>
        resolve((req.result as SessionBackup | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!result) return null;
    return { userId: result.userId, refreshToken: result.refreshToken };
  } catch {
    return null;
  }
}

/**
 * IndexedDB のセッションバックアップを削除する（ユーザーがサインアウトした時用）。
 */
export async function idbClearSession(): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(SESSION_STORE, "readwrite");
    tx.objectStore(SESSION_STORE).delete(SESSION_KEY);
    await txComplete(tx);
    db.close();
  } catch {
    // 非致命的
  }
}

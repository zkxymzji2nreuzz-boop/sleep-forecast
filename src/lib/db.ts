/**
 * SleepForecast 統合データレイヤー (REQ-P2-01)
 *
 * localStorage を一次ストレージとして維持しつつ、
 * Supabase へ非同期バックグラウンド同期を行う。
 *
 * 設計方針:
 * - 書き込み: localStorage へ即時 + Supabase へ fire-and-forget
 * - 読み込み: localStorage から（オフライン時も同速・同レスポンス）
 * - マイグレーション: 初回 Supabase 接続時に localStorage 全量をバルクアップロード
 * - 競合解決: updatedAt が新しい方を優先（双方向 sync 時）
 *
 * API は storage.ts と完全互換。コンポーネントは import 先を
 * "@/lib/storage" から "@/lib/db" に変えるだけで移行できる。
 */

import type { SleepRecord } from "./types";
import {
  saveRecord as lsSaveRecord,
  deleteRecord as lsDeleteRecord,
  clearAll as lsClearAll,
  clearAllRecords as lsClearAllRecords,
  getRecords as lsGetRecords,
  getRecordByDate as lsGetRecordByDate,
  getTodayRecord as lsTodayRecord,
  setDefaultPrefectureCode as lsSetPrefectureCode,
  STORAGE_KEY,
  DEFAULT_PREFECTURE_KEY,
  ONBOARDING_DISMISSED_KEY,
  STREAK_FREEZE_COUNT_KEY,
  STREAK_FREEZE_USED_DATES_KEY,
  // read-only / non-record functions — pass through as-is
  getStreakDays,
  formatDateJst,
  getDefaultPrefectureCode,
  tryEarnStreakFreeze,
  applyStreakFreeze,
  getFreezedDates,
  getStreakFreezeCount,
} from "./storage";
import { supabase } from "./supabase";

// ── Re-export: 変更不要の関数はそのまま再エクスポート ────────────────────────
export {
  getStreakDays,
  formatDateJst,
  getDefaultPrefectureCode,
  tryEarnStreakFreeze,
  applyStreakFreeze,
  getFreezedDates,
  getStreakFreezeCount,
  STORAGE_KEY,
  DEFAULT_PREFECTURE_KEY,
  ONBOARDING_DISMISSED_KEY,
  STREAK_FREEZE_COUNT_KEY,
  STREAK_FREEZE_USED_DATES_KEY,
};

// ─── 内部ユーティリティ ───────────────────────────────────────────────────────

/** 認証済みユーザーIDを取得（なければ null） */
async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/** SleepRecord → Supabase 行形式 */
function recordToRow(record: SleepRecord, userId: string) {
  return {
    user_id: userId,
    local_id: record.id,
    date: record.date,
    quality: record.quality,
    bedtime: record.bedtime ?? null,
    wake_time: record.wakeTime ?? null,
    note: record.note ?? null,
    prefecture_code: record.prefectureCode,
    weather: record.weather as unknown as Record<string, unknown>,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

/** Supabase 行 → SleepRecord */
function rowToRecord(row: Record<string, unknown>): SleepRecord {
  return {
    id: String(row.local_id ?? row.id),
    date: String(row.date),
    quality: Number(row.quality) as SleepRecord["quality"],
    bedtime: (row.bedtime as string | null) ?? undefined,
    wakeTime: (row.wake_time as string | null) ?? undefined,
    note: (row.note as string | null) ?? undefined,
    prefectureCode: String(row.prefecture_code),
    weather: row.weather as SleepRecord["weather"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** Supabase に1件 upsert（fire-and-forget） */
async function syncRecordToSupabase(record: SleepRecord): Promise<void> {
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    await supabase
      .from("sleep_logs")
      .upsert(recordToRow(record, userId), { onConflict: "user_id,date" });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[db] Supabase upsert failed:", err);
    }
  }
}

/** Supabase から日付指定で削除（fire-and-forget） */
async function deleteFromSupabase(date: string): Promise<void> {
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    await supabase
      .from("sleep_logs")
      .delete()
      .eq("user_id", userId)
      .eq("date", date);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[db] Supabase delete failed:", err);
    }
  }
}

// ─── Public API (storage.ts と同じインターフェース) ───────────────────────────

export function getRecords(): SleepRecord[] {
  return lsGetRecords();
}

export function getRecordByDate(date: string): SleepRecord | null {
  return lsGetRecordByDate(date);
}

export function getTodayRecord(now?: Date): SleepRecord | null {
  return lsTodayRecord(now);
}

/**
 * 記録を保存する。
 * localStorage へ即時保存 → Supabase へ fire-and-forget 同期。
 */
export function saveRecord(
  input: Omit<SleepRecord, "id" | "createdAt" | "updatedAt">
): SleepRecord {
  const saved = lsSaveRecord(input);
  void syncRecordToSupabase(saved);
  return saved;
}

/**
 * id 指定で記録を削除する。
 * localStorage から削除 → Supabase からも fire-and-forget 削除。
 */
export function deleteRecord(id: string): void {
  const record = lsGetRecords().find((r) => r.id === id);
  lsDeleteRecord(id);
  if (record) {
    void deleteFromSupabase(record.date);
  }
}

/** 全記録を localStorage から削除（Supabase レコードは保持）。 */
export function clearAll(): void {
  lsClearAll();
}

/** clearAll のエイリアス（設定画面から呼ぶ）。 */
export function clearAllRecords(): void {
  lsClearAllRecords();
}

/**
 * デフォルト都道府県コードを保存する。
 * localStorage へ即時保存 → Supabase user_settings へ fire-and-forget 同期。
 */
export function setDefaultPrefectureCode(code: string): void {
  lsSetPrefectureCode(code);
  void syncPrefectureToSupabase(code);
}

async function syncPrefectureToSupabase(code: string): Promise<void> {
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, default_prefecture_code: code },
        { onConflict: "user_id" }
      );
  } catch {
    // ignore
  }
}

// ─── マイグレーション / 双方向同期 ───────────────────────────────────────────

/**
 * localStorage の全記録を Supabase にバルクアップロードする。
 * 初回匿名ログイン時に1度だけ呼ぶ。
 * `ignoreDuplicates: true` により既存の Supabase レコードは上書きしない。
 */
export async function migrateLocalStorageToSupabase(): Promise<{
  migrated: number;
  skipped: number;
}> {
  if (!supabase) return { migrated: 0, skipped: 0 };
  const userId = await getCurrentUserId();
  if (!userId) return { migrated: 0, skipped: 0 };

  const localRecords = lsGetRecords();
  if (localRecords.length === 0) return { migrated: 0, skipped: 0 };

  let migrated = 0;
  let skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < localRecords.length; i += BATCH) {
    const batch = localRecords.slice(i, i + BATCH);
    const rows = batch.map((r) => recordToRow(r, userId));
    try {
      const { data, error } = await supabase
        .from("sleep_logs")
        .upsert(rows, { onConflict: "user_id,date", ignoreDuplicates: true })
        .select("id");
      if (!error && data) {
        migrated += data.length;
        skipped += batch.length - data.length;
      } else {
        skipped += batch.length;
      }
    } catch {
      skipped += batch.length;
    }
  }

  return { migrated, skipped };
}

/**
 * Supabase の全記録をダウンロードして localStorage とマージする。
 * 複数デバイス間のデータ取り込み用（手動実行）。
 * 競合は updatedAt が新しい方を採用。
 */
export async function syncFromSupabase(): Promise<{ synced: number } | null> {
  if (!supabase) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error || !data) return null;

    const remote = (data as unknown as Record<string, unknown>[]).map(rowToRecord);
    const local = lsGetRecords();

    // updatedAt が新しい方を優先してマージ
    const map = new Map<string, SleepRecord>();
    for (const r of local) map.set(r.date, r);
    for (const r of remote) {
      const existing = map.get(r.date);
      if (!existing || r.updatedAt > existing.updatedAt) {
        map.set(r.date, r);
      }
    }

    const merged = Array.from(map.values()).sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    );

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, records: merged })
      );
    }

    return { synced: remote.length };
  } catch {
    return null;
  }
}

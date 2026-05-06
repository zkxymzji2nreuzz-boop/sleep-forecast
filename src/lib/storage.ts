/**
 * SleepForecast の localStorage 永続化レイヤ (MVP 用)。
 *
 * - key: `sleep_records_v1`
 * - 形式: `{ version: 1, records: SleepRecord[] }`
 * - 将来的に Supabase 等へ差し替え可能にするため、外部には
 *   純粋関数としての save / get / delete のみを公開する。
 * - SSR 時は window 不在なので空配列を返す安全モード。
 * - JSON parse 失敗時も壊れず空状態にフォールバックする。
 */

import type { SleepRecord, StoredRecords } from "./types";
import { idbPutRecords, idbGetRecords } from "./idb";

export const STORAGE_KEY = "sleep_records_v1";
/** 設定画面・記録画面で共有する「デフォルト都道府県コード」キー */
export const DEFAULT_PREFECTURE_KEY = "sf_default_prefecture";
/** オンボーディングバナーを非表示にしたことを記録するキー */
export const ONBOARDING_DISMISSED_KEY = "sf_onboarding_dismissed";
/** ストリークフリーズの残りトークン数（数値文字列） */
export const STREAK_FREEZE_COUNT_KEY = "sf_streak_freeze_count";
/** ストリークフリーズを使用した日付の配列（JSON 文字列） */
export const STREAK_FREEZE_USED_DATES_KEY = "sf_streak_freeze_used_dates";

/** 安全に localStorage へアクセスできるかチェック */
function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** 内部: ストレージから `{version, records}` を取り出す。壊れていたら空で初期化 */
function readAll(): StoredRecords {
  if (!hasStorage()) {
    return { version: 1, records: [] };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { version: 1, records: [] };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "records" in parsed &&
      Array.isArray((parsed as StoredRecords).records)
    ) {
      return { version: 1, records: (parsed as StoredRecords).records };
    }
    return { version: 1, records: [] };
  } catch {
    // JSON 破損時は黙ってリセット (MVP 方針)
    return { version: 1, records: [] };
  }
}

/** 内部: ストレージへ書き込み（localStorage 即時 + IndexedDB 非同期バックアップ） */
function writeAll(next: StoredRecords): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // IndexedDB へ非同期バックアップ（失敗しても localStorage は影響なし）
  void idbPutRecords(next.records);
}

/** date 文字列の大小比較で新しい順にソートする */
function sortByDateDesc(records: SleepRecord[]): SleepRecord[] {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * 全記録を新しい順で取得する。
 */
export function getRecords(): SleepRecord[] {
  return sortByDateDesc(readAll().records);
}

/**
 * 指定 date (YYYY-MM-DD) の記録を 1 件取得する。無ければ null。
 */
export function getRecordByDate(date: string): SleepRecord | null {
  const all = readAll().records;
  return all.find((r) => r.date === date) ?? null;
}

/**
 * 今日 (Asia/Tokyo 基準) の記録を取得する。
 * Date の `toLocaleDateString('en-CA')` で YYYY-MM-DD を取得する。
 */
export function getTodayRecord(now: Date = new Date()): SleepRecord | null {
  return getRecordByDate(formatDateJst(now));
}

/**
 * Asia/Tokyo タイムゾーン基準で YYYY-MM-DD を返す。
 * SSR / ブラウザ双方で動作する (Intl.DateTimeFormat 使用)。
 */
export function formatDateJst(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  // en-CA は YYYY-MM-DD 形式を返す
  return parts;
}

/**
 * 記録を保存する。
 * - 同じ `date` のレコードが既にあれば `id` / `createdAt` を保持して上書き。
 * - 無ければ新規 id を採番して追加。
 * - 戻り値は最終的に保存されたレコード (id / createdAt / updatedAt を反映)。
 */
export function saveRecord(
  input: Omit<SleepRecord, "id" | "createdAt" | "updatedAt">
): SleepRecord {
  const store = readAll();
  const nowIso = new Date().toISOString();
  const existing = store.records.find((r) => r.date === input.date);

  const merged: SleepRecord = existing
    ? {
        ...input,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: nowIso,
      }
    : {
        ...input,
        id: generateRecordId(input.date),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

  const nextRecords = existing
    ? store.records.map((r) => (r.id === existing.id ? merged : r))
    : [...store.records, merged];

  writeAll({ version: 1, records: nextRecords });
  return merged;
}

/**
 * id 指定で記録を削除する。存在しなければ no-op。
 */
export function deleteRecord(id: string): void {
  const store = readAll();
  const nextRecords = store.records.filter((r) => r.id !== id);
  writeAll({ version: 1, records: nextRecords });
}

/**
 * 全記録を削除する (テスト・リセット用)。
 */
export function clearAll(): void {
  writeAll({ version: 1, records: [] });
}

/**
 * 全記録を削除する (設定画面からのリセット用エイリアス)。
 * clearAll() と同一。
 */
export function clearAllRecords(): void {
  clearAll();
}

/**
 * IndexedDB から記録を復元する。
 *
 * localStorage が空（0件）かつ IndexedDB にデータがある場合のみ復元する。
 * アプリ起動時に AuthProvider から呼ぶことで、localStorage が予期せず
 * クリアされた際にデータを自動回復できる。
 *
 * @returns 復元した場合 true、不要だった場合 false
 */
export async function recoverFromIDB(): Promise<boolean> {
  const existing = readAll();
  if (existing.records.length > 0) return false; // localStorage にデータあり → 不要

  const idbRecords = await idbGetRecords();
  if (idbRecords.length === 0) return false; // IDB も空 → 何もできない

  // localStorage へ復元（void idbPutRecords は再呼出しになるが無害）
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, records: idbRecords })
  );
  return true;
}

/**
 * デフォルト都道府県コードの取得。未設定なら null。
 */
export function getDefaultPrefectureCode(): string | null {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(DEFAULT_PREFECTURE_KEY);
}

/**
 * デフォルト都道府県コードを保存する。
 */
export function setDefaultPrefectureCode(code: string): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(DEFAULT_PREFECTURE_KEY, code);
}

/**
 * ストリークフリーズを使用済みの日付セットを返す。
 */
export function getFreezedDates(): Set<string> {
  if (!hasStorage()) return new Set();
  const raw = window.localStorage.getItem(STREAK_FREEZE_USED_DATES_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((v): v is string => typeof v === "string"));
    }
  } catch {
    // 壊れていたら空で返す
  }
  return new Set();
}

/**
 * 残りストリークフリーズトークン数を返す。
 */
export function getStreakFreezeCount(): number {
  if (!hasStorage()) return 0;
  const raw = window.localStorage.getItem(STREAK_FREEZE_COUNT_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/**
 * ストリークフリーズトークン数を設定する（内部用）。
 */
function setStreakFreezeCount(n: number): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(STREAK_FREEZE_COUNT_KEY, String(Math.max(0, Math.floor(n))));
}

/**
 * 連続記録マイルストーン（7 の倍数）でフリーズを 1 枚付与する。
 * - 最大 3 枚まで蓄積可能
 * - 付与した場合 true を返す
 */
export function tryEarnStreakFreeze(currentStreak: number): boolean {
  if (currentStreak <= 0 || currentStreak % 7 !== 0) return false;
  const current = getStreakFreezeCount();
  if (current >= 3) return false; // 上限
  setStreakFreezeCount(current + 1);
  return true;
}

/**
 * ストリークフリーズを 1 枚消費して指定日をフリーズ日として登録する。
 * - トークンが 0 の場合は false を返す
 * - 成功した場合 true を返す
 */
export function applyStreakFreeze(date: string): boolean {
  const count = getStreakFreezeCount();
  if (count <= 0) return false;
  setStreakFreezeCount(count - 1);
  const frozen = getFreezedDates();
  frozen.add(date);
  if (hasStorage()) {
    window.localStorage.setItem(
      STREAK_FREEZE_USED_DATES_KEY,
      JSON.stringify(Array.from(frozen))
    );
  }
  return true;
}

/**
 * 現在の連続記録日数を返す。
 * - 今日の記録があればそこから遡る
 * - なければ昨日から遡る (昨日も無ければ 0)
 * - ストリークフリーズ使用済み日も「記録あり」扱いで計算する
 */
export function getStreakDays(now: Date = new Date()): number {
  const records = getRecords(); // sorted desc
  if (records.length === 0) return 0;

  const recordDates = new Set([
    ...records.map((r) => r.date),
    ...Array.from(getFreezedDates()),
  ]);

  /** YYYY-MM-DD 文字列から1日前の文字列を返す */
  function prevDay(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return [
      dt.getUTCFullYear(),
      String(dt.getUTCMonth() + 1).padStart(2, "0"),
      String(dt.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  const todayStr = formatDateJst(now);
  const yesterdayStr = prevDay(todayStr);

  // 起点: 今日 or 昨日
  let current = recordDates.has(todayStr)
    ? todayStr
    : recordDates.has(yesterdayStr)
    ? yesterdayStr
    : null;

  if (!current) return 0;

  let streak = 0;
  while (current && recordDates.has(current)) {
    streak++;
    current = prevDay(current);
  }
  return streak;
}

/** `rec_YYYY-MM-DD_xxxx` 形式の id を生成する */
function generateRecordId(date: string): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `rec_${date}_${rand}`;
}

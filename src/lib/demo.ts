/**
 * デモモード (REQ-DEMO-01)
 *
 * URL パラメータ `?demo=N` を検出し、N 日分のサンプル睡眠記録を生成する。
 * 本番データ（localStorage / Supabase）には一切書き込まない。
 * HomeClient / DashboardPage / RecordForm が `getRecords()` の代わりにこのデータを使う。
 *
 * セッション持続:
 *   ?demo=N を一度検出すると sessionStorage に保存し、ページ遷移後も維持される。
 *   DemoModeBanner の × ボタンで clearDemoMode() を呼ぶとセッションが終了する。
 *   タブを閉じると sessionStorage は自動消去される。
 *
 * 使用例:
 *   /?demo=4            → 4 日分（P1 状態のプレビュー）
 *   /?demo=7            → 7 日分（予測解放直後のプレビュー）
 *   /?demo=30           → 30 日分（フル機能のプレビュー）
 *   /dashboard?demo=30  → ダッシュボードから直接デモ開始
 *   /record?demo=30     → 記録ページから直接デモ開始
 */

/** sessionStorage キー */
const DEMO_SESSION_KEY = "sf_demo_count";

import type { SleepRecord, SleepQuality, WeatherData } from "./types";

// ---------------------------------------------------------------------------
// URL パラメータ解析
// ---------------------------------------------------------------------------

/**
 * `?demo=N` パラメータを読み取る。
 * 優先順位:
 *   1. URL パラメータ `?demo=N` → 有効なら sessionStorage に保存して返す
 *   2. sessionStorage に保存済みの値 → 返す（ページ遷移後も維持）
 *   3. どちらもなければ null
 * - N が 1〜365 の整数でなければ null を返す。
 * - SSR（window なし）でも安全に動作する。
 */
export function getDemoCount(): number | null {
  if (typeof window === "undefined") return null;

  // 1. URL パラメータを確認
  const params = new URLSearchParams(window.location.search);
  const val = params.get("demo");
  if (val) {
    const n = parseInt(val, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 365) {
      // sessionStorage に保存してページ遷移後も維持
      try { sessionStorage.setItem(DEMO_SESSION_KEY, String(n)); } catch { /* ignore */ }
      return n;
    }
  }

  // 2. sessionStorage にキャッシュがあれば返す
  try {
    const cached = sessionStorage.getItem(DEMO_SESSION_KEY);
    if (cached) {
      const n = parseInt(cached, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 365) return n;
    }
  } catch { /* ignore */ }

  return null;
}

/** デモモードが有効かどうかを返す */
export function isDemoMode(): boolean {
  return getDemoCount() !== null;
}

/**
 * デモモードを終了する。
 * sessionStorage のキャッシュを消去し、ページをリロードする。
 * DemoModeBanner の × ボタンから呼び出す。
 */
export function clearDemoMode(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(DEMO_SESSION_KEY); } catch { /* ignore */ }
  // URL から ?demo パラメータを除去してリロード
  const url = new URL(window.location.href);
  url.searchParams.delete("demo");
  window.location.replace(url.toString());
}

// ---------------------------------------------------------------------------
// 内部ユーティリティ
// ---------------------------------------------------------------------------

/** 決定論的な疑似乱数（シード付き）0..1 */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** YYYY-MM-DD の文字列から n 日前の YYYY-MM-DD を返す */
function subDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return [
    dt.getUTCFullYear(),
    String(dt.getUTCMonth() + 1).padStart(2, "0"),
    String(dt.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** 今日の YYYY-MM-DD（Asia/Tokyo 基準） */
function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 値を min〜max の範囲にクランプする */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ---------------------------------------------------------------------------
// デモ記録生成
// ---------------------------------------------------------------------------

/**
 * N 日分のリアルなデモ睡眠記録を生成する。
 *
 * 生成ルール:
 * - 東京（都道府県コード "13"）基準の気象データを模擬する。
 * - 気圧急落日は睡眠品質が低下する相関を組み込む（ダッシュボードの相関グラフで確認可能）。
 * - 満月前後はわずかに品質が低下する。
 * - seededRand により同じ N なら毎回同じ結果が返る（決定論的）。
 *
 * @returns 新しい順（[0]=今日, [N-1]=N日前）の SleepRecord 配列
 */
export function generateDemoRecords(n: number): SleepRecord[] {
  const today = todayJst();
  const records: SleepRecord[] = [];

  for (let i = 0; i < n; i++) {
    const date = subDays(today, i);
    const s = i * 17; // シード基底（i ごとに分散）

    // ── 気象データ ──────────────────────────────────────────────────────────
    // 東京の平均気圧 ~1013 hPa に ±8 hPa の変動
    const pressureHpa = Math.round(
      (1013 + (seededRand(s + 0) - 0.5) * 16) * 10
    ) / 10;

    // 前日比気圧差（−8〜+8 hPa の範囲）
    const pressureDeltaHpa = Math.round(
      (seededRand(s + 1) - 0.5) * 16 * 10
    ) / 10;

    // 気温（春〜秋の東京: 12〜30°C）
    const temperatureC = Math.round(12 + seededRand(s + 2) * 18);

    // 湿度（40〜90%）
    const humidity = Math.round(40 + seededRand(s + 3) * 50);

    // 月の位相（0〜1 のサイクル、約 29.5 日周期）
    const moonPhase = (i * (1 / 29.5)) % 1;
    const moonIllumination = clamp(Math.sin(moonPhase * Math.PI), 0, 1);

    const weather: WeatherData = {
      temperatureC,
      humidity,
      pressureHpa,
      pressureDeltaHpa,
      moonPhase: Math.round(moonPhase * 1000) / 1000,
      moonIllumination: Math.round(moonIllumination * 1000) / 1000,
      fetchedAt: `${date}T08:00:00+09:00`,
      source: "open-meteo",
      apparentTemperatureC: temperatureC - 2,
    };

    // ── 睡眠品質（気象相関を内包） ──────────────────────────────────────────
    // 基準: 3（普通）から気象要因で増減
    let base = 3.0;

    // 気圧急落 → 睡眠悪化
    if (pressureDeltaHpa < -6) base -= 1.5;
    else if (pressureDeltaHpa < -3) base -= 0.8;

    // 気圧上昇 → やや改善
    if (pressureDeltaHpa > 4) base += 0.5;

    // 満月前後（0.45〜0.55）→ わずかに悪化
    if (moonPhase >= 0.45 && moonPhase <= 0.55) base -= 0.4;

    // 高湿度（80%〜）→ やや悪化
    if (humidity >= 80) base -= 0.3;

    // ランダム変動（±1.0）
    const noise = (seededRand(s + 5) - 0.5) * 2.0;
    base += noise;

    const quality = clamp(Math.round(base), 1, 5) as SleepQuality;

    // ── レコード組み立て ────────────────────────────────────────────────────
    const ts = new Date(`${date}T08:00:00+09:00`).toISOString();
    records.push({
      id: `demo_${date}_${i.toString(36).padStart(3, "0")}`,
      date,
      quality,
      prefectureCode: "13",
      weather,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  return records; // 新しい順（[0]=今日）
}

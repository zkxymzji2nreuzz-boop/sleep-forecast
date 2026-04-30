/**
 * SleepForecast 相関分析ライブラリ (F003)。
 *
 * - ピアソン積率相関係数
 * - 線形回帰 (最小二乗法)
 * - ダッシュボード集計 (KPI 4 種)
 * - 自然言語インサイト生成
 *
 * いずれも純粋関数。`SleepRecord[]` を受け取るが localStorage には触れない。
 * テストしやすさとサーバ/クライアント両対応を優先する。
 */

import type { SleepRecord } from "./types";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** ダッシュボード上部に並ぶ KPI の集計結果。 */
export type DashboardStats = {
  /** 直近 7 件 (最新寄り) の quality 平均、小数 1 桁。0 件なら null。 */
  avg7Days: number | null;
  /** 当月 (YYYY-MM) に属する記録件数。 */
  recordCountThisMonth: number;
  /** 最長連続記録日数 (日付差 1 日で連続判定)。 */
  longestStreak: number;
  /** quality が最小のレコード (同点なら最新 date)。0 件なら null。 */
  worstDay: { date: string; quality: number } | null;
  /**
   * 気圧感受性スコア 0〜10（急落日 vs 通常日の平均品質差から算出）。
   * データ不足（急落日 < 2 件 or 通常日 < 2 件）なら null。
   */
  pressureSensitivity: number | null;
};

/** 自然言語インサイト 1 件。 */
export type InsightItem = {
  /** 集計ルール識別子 */
  key:
    | "pressure_drop"
    | "moon_phase"
    | "temperature"
    | "humidity"
    | "general";
  /** 画面に表示する日本語文 */
  message: string;
  /** 表示スタイル: 警告 / 情報 / ポジティブ */
  severity: "info" | "warning" | "positive";
  /** 関連記事スラッグ（あれば記事リンクを表示） */
  articleSlug?: string;
  /** 関連記事のリンクラベル */
  articleLabel?: string;
};

// ---------------------------------------------------------------------------
// 1. ピアソン相関係数
// ---------------------------------------------------------------------------

/**
 * Pearson 積率相関係数を計算する。
 *
 * - xs.length !== ys.length → NaN
 * - xs.length < 2           → NaN
 * - 分母 0 (定数列)         → NaN
 * - 戻り値は -1.0 〜 1.0
 */
export function calculatePearsonCorrelation(
  xs: number[],
  ys: number[]
): number {
  if (xs.length !== ys.length) return NaN;
  const n = xs.length;
  if (n < 2) return NaN;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  if (denom === 0) return NaN;

  const r = num / denom;
  // -1..1 の範囲外に floating point でこぼれた場合はクランプ
  return Math.max(-1, Math.min(1, r));
}

// ---------------------------------------------------------------------------
// 2. 線形回帰 (最小二乗法)
// ---------------------------------------------------------------------------

/**
 * 単回帰直線 y = slope * x + intercept を最小二乗法で推定する。
 *
 * - 長さ不一致 / 2 未満 → null
 * - 分母 0 (全 xs 同値) → null
 * - それ以外            → { slope, intercept }
 */
export function calculateLinearRegression(
  xs: number[],
  ys: number[]
): { slope: number; intercept: number } | null {
  if (xs.length !== ys.length) return null;
  const n = xs.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }
  if (den === 0) return null;

  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

// ---------------------------------------------------------------------------
// 3. ダッシュボード集計
// ---------------------------------------------------------------------------

/** YYYY-MM-DD 文字列を Date (UTC 正午) に変換する。タイムゾーンずれ回避のため。 */
function parseDateKey(key: string): Date {
  // "2026-04-10" → 2026-04-10T12:00:00Z (タイムゾーン境界で日付が繰り上がらない正午)
  return new Date(`${key}T12:00:00Z`);
}

/** 2 つの YYYY-MM-DD 文字列が「隣接する日」かどうか。 */
function areConsecutiveDays(earlier: string, later: string): boolean {
  const diffMs = parseDateKey(later).getTime() - parseDateKey(earlier).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // 浮動小数点対策: 20 時間〜28 時間を "1 日" とみなす
  return diffMs >= oneDayMs * 0.8 && diffMs <= oneDayMs * 1.2;
}

/** 今日の YYYY-MM を返す (Asia/Tokyo)。 */
function currentYearMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  // en-CA は "YYYY-MM" を返す
  return parts;
}

/**
 * ダッシュボード用の集計を計算する。
 *
 * 入力は `getRecords()` と同じ date 降順の配列を想定するが、
 * 順序が崩れていても最長連続計算のために内部で昇順にソートする。
 */
export function calculateStats(records: SleepRecord[]): DashboardStats {
  if (records.length === 0) {
    return {
      avg7Days: null,
      recordCountThisMonth: 0,
      longestStreak: 0,
      worstDay: null,
    };
  }

  // --- 7 日平均 (最新寄り 7 件) ---
  const desc = [...records].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );
  const head = desc.slice(0, 7);
  const avg7Raw =
    head.reduce((acc, r) => acc + r.quality, 0) / Math.max(1, head.length);
  const avg7Days = head.length === 0 ? null : Math.round(avg7Raw * 10) / 10;

  // --- 今月の記録日数 ---
  const yearMonth = currentYearMonth();
  const recordCountThisMonth = desc.filter((r) => r.date.startsWith(yearMonth))
    .length;

  // --- 最長連続記録日数 ---
  // date を一意に昇順ソートしてから隣接判定を走らせる
  const uniqueAsc = Array.from(new Set(desc.map((r) => r.date))).sort();
  let longestStreak = uniqueAsc.length === 0 ? 0 : 1;
  let currentStreak = longestStreak;
  for (let i = 1; i < uniqueAsc.length; i++) {
    if (areConsecutiveDays(uniqueAsc[i - 1], uniqueAsc[i])) {
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 1;
    }
  }

  // --- 最も浅かった日 ---
  // quality 最小、同点なら最新 date
  const worst = desc.reduce<SleepRecord | null>((acc, r) => {
    if (acc === null) return r;
    if (r.quality < acc.quality) return r;
    if (r.quality === acc.quality && r.date > acc.date) return r;
    return acc;
  }, null);
  const worstDay = worst
    ? { date: worst.date, quality: worst.quality }
    : null;

  // --- 気圧感受性スコア (0〜10) ---
  // 急落日（-3hPa以下）と通常日の平均品質差を 0〜10 にスケーリング
  // 差 0 → スコア 0、差 2.0 以上 → スコア 10（最大品質差は 4 なので 2.0 = 中程度）
  const dropRecs = records.filter((r) => r.weather.pressureDeltaHpa <= -3);
  const normalRecs = records.filter((r) => r.weather.pressureDeltaHpa > -3);
  let pressureSensitivity: number | null = null;
  if (dropRecs.length >= 2 && normalRecs.length >= 2) {
    const dropAvg = dropRecs.reduce((s, r) => s + r.quality, 0) / dropRecs.length;
    const normalAvg = normalRecs.reduce((s, r) => s + r.quality, 0) / normalRecs.length;
    const diff = Math.max(0, normalAvg - dropAvg); // 通常日の方が良い場合のみ
    pressureSensitivity = Math.min(10, Math.round((diff / 2.0) * 10));
  }

  return {
    avg7Days,
    recordCountThisMonth,
    longestStreak,
    worstDay,
    pressureSensitivity,
  };
}

// ---------------------------------------------------------------------------
// 4. 自然言語インサイト生成
// ---------------------------------------------------------------------------

/** 記録群から平均 quality を計算 (空なら null)。 */
function averageQuality(records: SleepRecord[]): number | null {
  if (records.length === 0) return null;
  return records.reduce((acc, r) => acc + r.quality, 0) / records.length;
}

/**
 * 気象傾向を日本語インサイトに変換する。
 *
 * 優先度順:
 * 1. 気圧急低下相関 (pressureDeltaHpa <= -3) / severity: warning
 * 2. 満月前後相関 (moonPhase 0.45〜0.55) / severity: info
 * 3. 気温相関 (上位 25% vs 下位 25%) / severity: info
 * 4. 5〜9 件時の汎用インサイト / severity: info
 *
 * どれも該当しなければ `[]` を返す。
 */
export function generateInsights(records: SleepRecord[]): InsightItem[] {
  const insights: InsightItem[] = [];

  // --- 1. 気圧急低下 ---
  const lowPressureDays = records.filter(
    (r) => r.weather.pressureDeltaHpa <= -3
  );
  const otherDays = records.filter((r) => r.weather.pressureDeltaHpa > -3);
  const lowAvg = averageQuality(lowPressureDays);
  const otherAvg = averageQuality(otherDays);
  if (
    lowAvg !== null &&
    otherAvg !== null &&
    otherAvg - lowAvg >= 0.5 &&
    otherAvg > 0
  ) {
    const dropPct = Math.round((1 - lowAvg / otherAvg) * 100);
    insights.push({
      key: "pressure_drop",
      severity: "warning",
      message: `気圧が 3hPa 以上下がる日は、そうでない日と比べて睡眠品質が約 ${dropPct}% 低下しています。`,
      articleSlug: "kiatsu-jiritsu-shinkei",
      articleLabel: "自律神経の整え方を読む",
    });
  }

  // --- 2. 満月前後 ---
  const fullMoonDays = records.filter(
    (r) => r.weather.moonPhase >= 0.45 && r.weather.moonPhase <= 0.55
  );
  const allAvg = averageQuality(records);
  const fullMoonAvg = averageQuality(fullMoonDays);
  if (
    fullMoonAvg !== null &&
    allAvg !== null &&
    allAvg - fullMoonAvg >= 0.3
  ) {
    insights.push({
      key: "moon_phase",
      severity: "info",
      message: "満月の前後 2 日間は睡眠が浅い傾向があります。",
      articleSlug: "suimin-shitsu-up",
      articleLabel: "睡眠の質を上げる方法を読む",
    });
  }

  // --- 3. 気温相関 (上位 25% vs 下位 25%) ---
  if (records.length >= 4) {
    const sorted = [...records].sort(
      (a, b) => a.weather.temperatureC - b.weather.temperatureC
    );
    const q = Math.max(1, Math.floor(sorted.length / 4));
    const coldSlice = sorted.slice(0, q);
    const hotSlice = sorted.slice(sorted.length - q);
    const coldAvg = averageQuality(coldSlice);
    const hotAvg = averageQuality(hotSlice);
    if (coldAvg !== null && hotAvg !== null) {
      if (coldAvg - hotAvg >= 0.5) {
        insights.push({
          key: "temperature",
          severity: "info",
          message: "気温が高い日ほど眠りが浅い傾向が見られます。",
          articleSlug: "kandansa-hirou",
          articleLabel: "寒暖差疲労の対策を読む",
        });
      } else if (hotAvg - coldAvg >= 0.5) {
        insights.push({
          key: "temperature",
          severity: "info",
          message: "気温が低い日ほど眠りが浅い傾向が見られます。",
          articleSlug: "kandansa-hirou",
          articleLabel: "寒暖差疲労の対策を読む",
        });
      }
    }
  }

  // --- 4. データ不足時の汎用インサイト (5〜9 件) ---
  if (insights.length === 0 && records.length >= 5 && records.length <= 9) {
    insights.push({
      key: "general",
      severity: "info",
      message:
        "データが 10 件を超えると、より精度の高い分析ができます。毎朝 15 秒の記録を続けてみましょう。",
    });
  }

  return insights;
}

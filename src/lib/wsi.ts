/**
 * WSI（WeatherSleep Index）計算 — Web版
 * iOSアプリの wsiService.ts から移植
 */

export type WSILevel = 1 | 2 | 3 | 4 | 5;

export interface WSIScore {
  level: WSILevel;
  label: string;
  reason: string;
  pressureDelta6h: number;
  tempDelta: number;
  humidity: number;
}

const WSI_LABELS: Record<WSILevel, string> = {
  5: "とても良い",
  4: "良い",
  3: "普通",
  2: "注意",
  1: "難しい夜",
};

const WSI_COLORS: Record<WSILevel, string> = {
  5: "#4ade80",
  4: "#86efac",
  3: "#facc15",
  2: "#fb923c",
  1: "#f87171",
};

function pressurePenalty(delta6h: number): number {
  const abs = Math.abs(delta6h);
  if (abs >= 10) return 60;
  if (abs >= 7) return 45;
  if (abs >= 5) return 30;
  if (abs >= 3) return 15;
  if (abs >= 1) return 5;
  return 0;
}

function tempDeltaPenalty(tempDelta: number): number {
  if (tempDelta >= 15) return 25;
  if (tempDelta >= 12) return 18;
  if (tempDelta >= 10) return 12;
  if (tempDelta >= 8) return 6;
  return 0;
}

function humidityPenalty(humidity: number): number {
  if (humidity >= 90) return 15;
  if (humidity >= 80) return 8;
  if (humidity >= 70) return 3;
  return 0;
}

function penaltyToLevel(totalPenalty: number): WSILevel {
  if (totalPenalty >= 70) return 1;
  if (totalPenalty >= 45) return 2;
  if (totalPenalty >= 25) return 3;
  if (totalPenalty >= 10) return 4;
  return 5;
}

function buildReasonText(
  level: WSILevel,
  delta6h: number,
  tempDelta: number,
  humidity: number
): string {
  if (level === 5) {
    return "気圧・気温・湿度がいずれも安定しており、眠りやすい気象条件です";
  }

  const reasons: string[] = [];

  if (Math.abs(delta6h) >= 3) {
    const dir = delta6h < 0 ? "低下" : "上昇";
    reasons.push(`気圧が6時間で${Math.abs(delta6h).toFixed(1)}hPa${dir}中`);
  }
  if (tempDelta >= 8) {
    reasons.push(`昼夜の気温差が${tempDelta.toFixed(0)}°Cと大きい`);
  }
  if (humidity >= 80) {
    reasons.push(`湿度${humidity}%と高い`);
  }

  const mainReason = reasons.length > 0 ? reasons.join("・") : "複数の気象要因が重なっている";

  switch (level) {
    case 1:
      return `${mainReason}ため、自律神経が乱れやすく、眠りに影響が出やすい気象条件です`;
    case 2:
      return `${mainReason}ため、眠りに影響が出やすい傾向があります。早めの就寝をお勧めします`;
    case 3:
      return `${mainReason}ため、やや影響が出やすい気象条件です`;
    case 4:
      return "気象条件は比較的落ち着いています。いつも通りの就寝ルーティンで問題ありません";
    default:
      return "";
  }
}

export function computeWSI(
  pressureDelta6h: number,
  tempDelta: number,
  humidity: number
): WSIScore {
  const penalty =
    pressurePenalty(pressureDelta6h) +
    tempDeltaPenalty(tempDelta) +
    humidityPenalty(humidity);

  const level = penaltyToLevel(penalty);

  return {
    level,
    label: WSI_LABELS[level],
    reason: buildReasonText(level, pressureDelta6h, tempDelta, humidity),
    pressureDelta6h,
    tempDelta,
    humidity,
  };
}

export function wsiColor(level: WSILevel): string {
  return WSI_COLORS[level];
}

/** 気圧レベルゾーン（グラフの色分けに使う） */
export type PressureZone = "safe" | "caution" | "warning" | "danger";

/** 気圧ゾーン判定（hPaの絶対値ベース） */
export function getPressureZone(hPa: number): PressureZone {
  if (hPa >= 1016) return "safe";
  if (hPa >= 1008) return "caution";
  if (hPa >= 1000) return "warning";
  return "danger";
}

/** 気圧ゾーンのラベル・色マップ
 * color: グラフ描画用の原色（非テキスト用）
 * textColor: WCAG AA 準拠のテキスト用 CSS 変数色
 */
export const PRESSURE_ZONE_CONFIG: Record<PressureZone, { label: string; color: string; textColor: string; bg: string }> = {
  safe:    { label: "安定",   color: "#4ade80", textColor: "hsl(var(--primary))",          bg: "rgba(74,222,128,0.06)" },
  caution: { label: "やや低", color: "#facc15", textColor: "hsl(var(--muted-foreground))", bg: "rgba(250,204,21,0.06)" },
  warning: { label: "低気圧", color: "#fb923c", textColor: "hsl(var(--destructive))",      bg: "rgba(251,146,60,0.08)" },
  danger:  { label: "警戒",   color: "#f87171", textColor: "hsl(var(--destructive))",      bg: "rgba(248,113,113,0.10)" },
};

/** ペナルティ合計を 0-100 スコアに変換 */
function penaltyToScore100(totalPenalty: number): number {
  return Math.max(0, Math.round(100 - totalPenalty));
}

/** 体感気温による不快ペナルティ（オプション） */
function apparentTempPenalty(apparentTempC: number): number {
  // 28°C超: 蒸し暑い / 5°C未満: 寒すぎ
  if (apparentTempC >= 32) return 15;
  if (apparentTempC >= 28) return 8;
  if (apparentTempC <= 2)  return 12;
  if (apparentTempC <= 8)  return 6;
  return 0;
}

/** WSI スコア（0-100）— 大きいほど快眠しやすい */
export function computeWSIScore100(
  pressureDelta6h: number,
  tempDelta: number,
  humidity: number,
  apparentTempC?: number
): number {
  const penalty =
    pressurePenalty(pressureDelta6h) +
    tempDeltaPenalty(tempDelta) +
    humidityPenalty(humidity) +
    (apparentTempC !== undefined ? apparentTempPenalty(apparentTempC) : 0);
  return penaltyToScore100(penalty);
}

/** スコア100点満点に対応したラベル・色 */
export function getScore100Display(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "快眠しやすい夜",   color: "#4ade80" };
  if (score >= 60) return { label: "比較的良好",       color: "#86efac" };
  if (score >= 40) return { label: "やや注意",         color: "#facc15" };
  if (score >= 20) return { label: "影響が出やすい",   color: "#fb923c" };
  return           { label: "難しい夜",                color: "#f87171" };
}

/** ケアヒントをWSIレベルと各要因から生成 */
export function getCareHints(score: WSIScore): string[] {
  const hints: string[] = [];

  if (Math.abs(score.pressureDelta6h) >= 3) {
    hints.push("気圧変化が大きい日は、入浴を就寝2時間前に済ませると体が整いやすくなります。");
  }
  if (score.tempDelta >= 8) {
    hints.push("寒暖差が大きいので、就寝時の室温を一定に保つと自律神経が落ち着きます");
  }
  if (score.humidity >= 80) {
    hints.push("湿度が高いので、除湿や通気を意識すると睡眠の質が改善しやすいです");
  }
  if (score.level <= 2) {
    hints.push("低気圧接近時はカフェインを夕方以降に控えると入眠しやすくなります");
    hints.push("耳の後ろを温めると内耳の圧力変化による不調が和らぐことがあります");
  }
  if (hints.length === 0) {
    hints.push("今夜は眠りやすい気象条件です。いつも通りのルーティンで休みましょう");
  }

  return hints;
}

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

/** ケアヒントをWSIレベルと各要因から生成 */
export function getCareHints(score: WSIScore): string[] {
  const hints: string[] = [];

  if (Math.abs(score.pressureDelta6h) >= 3) {
    hints.push("気圧変化が大きい日は、入浴を就寝2時間前に済ませると体が整いやすくなります");
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

import { describe, expect, it } from "vitest";

import {
  calculateLinearRegression,
  calculatePearsonCorrelation,
  calculateStats,
  generateInsights,
} from "../correlation";
import type { SleepQuality, SleepRecord, WeatherData } from "../types";

/** テスト用に最低限の WeatherData を生成するヘルパ */
function weather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    temperatureC: 18.0,
    humidity: 60,
    pressureHpa: 1013.0,
    pressureDeltaHpa: 0.0,
    moonPhase: 0.25,
    moonIllumination: 0.5,
    fetchedAt: "2026-04-10T09:00:00+09:00",
    source: "open-meteo",
    ...overrides,
  };
}

/** テスト用 SleepRecord を生成するヘルパ */
function rec(
  date: string,
  quality: SleepQuality,
  w: Partial<WeatherData> = {}
): SleepRecord {
  return {
    id: `rec_${date}`,
    date,
    quality,
    prefectureCode: "13",
    weather: weather(w),
    createdAt: `${date}T09:00:00+09:00`,
    updatedAt: `${date}T09:00:00+09:00`,
  };
}

// ---------------------------------------------------------------------------
// calculatePearsonCorrelation
// ---------------------------------------------------------------------------

describe("calculatePearsonCorrelation", () => {
  it("完全負相関 [1,2,3] / [3,2,1] → -1.0 (±0.001)", () => {
    const r = calculatePearsonCorrelation([1, 2, 3], [3, 2, 1]);
    expect(Math.abs(r - -1.0)).toBeLessThan(0.001);
  });

  it("完全正相関 [1,2,3,4] / [2,4,6,8] → 1.0", () => {
    const r = calculatePearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(Math.abs(r - 1.0)).toBeLessThan(0.001);
  });

  it("長さ不一致は NaN を返す", () => {
    expect(Number.isNaN(calculatePearsonCorrelation([1, 2], [1]))).toBe(true);
  });

  it("長さ 1 以下は NaN を返す", () => {
    expect(Number.isNaN(calculatePearsonCorrelation([1], [1]))).toBe(true);
    expect(Number.isNaN(calculatePearsonCorrelation([], []))).toBe(true);
  });

  it("定数列 (分母 0) は NaN を返す", () => {
    expect(Number.isNaN(calculatePearsonCorrelation([3, 3, 3], [1, 2, 3]))).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// calculateLinearRegression
// ---------------------------------------------------------------------------

describe("calculateLinearRegression", () => {
  it("y = 2x + 1 のデータから slope=2, intercept=1 を推定する", () => {
    const result = calculateLinearRegression([0, 1, 2, 3], [1, 3, 5, 7]);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(2, 5);
    expect(result!.intercept).toBeCloseTo(1, 5);
  });

  it("全同値 xs は null を返す", () => {
    expect(calculateLinearRegression([3, 3, 3], [1, 2, 3])).toBeNull();
  });

  it("長さ不一致は null を返す", () => {
    expect(calculateLinearRegression([1, 2, 3], [1, 2])).toBeNull();
  });

  it("長さ 1 以下は null を返す", () => {
    expect(calculateLinearRegression([1], [1])).toBeNull();
    expect(calculateLinearRegression([], [])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calculateStats
// ---------------------------------------------------------------------------

describe("calculateStats", () => {
  it("(a) 空配列 → avg7Days:null, counts:0, longestStreak:0, worstDay:null", () => {
    const stats = calculateStats([]);
    expect(stats.avg7Days).toBeNull();
    expect(stats.recordCountThisMonth).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.worstDay).toBeNull();
  });

  it("(b) 7 件データで avg7Days が正しく計算される (小数 1 桁丸め)", () => {
    // quality 合計 = 3+5+2+4+3+3+4 = 24 → 24/7 = 3.4285… → 3.4
    const records: SleepRecord[] = [
      rec("2026-04-10", 3),
      rec("2026-04-09", 5),
      rec("2026-04-08", 2),
      rec("2026-04-07", 4),
      rec("2026-04-06", 3),
      rec("2026-04-05", 3),
      rec("2026-04-04", 4),
    ];
    const stats = calculateStats(records);
    expect(stats.avg7Days).toBeCloseTo(3.4, 5);
  });

  it("(b2) 10 件データでも先頭 7 件のみで平均を算出する", () => {
    // 最初 7 件: 5,5,5,5,5,5,5 → 平均 5.0
    // 残り 3 件: 1,1,1 (無視されるべき)
    const records: SleepRecord[] = [
      rec("2026-04-10", 5),
      rec("2026-04-09", 5),
      rec("2026-04-08", 5),
      rec("2026-04-07", 5),
      rec("2026-04-06", 5),
      rec("2026-04-05", 5),
      rec("2026-04-04", 5),
      rec("2026-04-03", 1),
      rec("2026-04-02", 1),
      rec("2026-04-01", 1),
    ];
    const stats = calculateStats(records);
    expect(stats.avg7Days).toBe(5);
  });

  it("(c) 連続 5 日のデータで longestStreak = 5", () => {
    const records: SleepRecord[] = [
      rec("2026-04-10", 3),
      rec("2026-04-09", 3),
      rec("2026-04-08", 3),
      rec("2026-04-07", 3),
      rec("2026-04-06", 3),
    ];
    expect(calculateStats(records).longestStreak).toBe(5);
  });

  it("(d) 非連続データで streak が正しく分割される (最長 3)", () => {
    // 4/10, 4/09, 4/08 (3 連続) ← ここが最長
    // ギャップ (4/05 欠落)
    // 4/04, 4/03 (2 連続)
    const records: SleepRecord[] = [
      rec("2026-04-10", 3),
      rec("2026-04-09", 3),
      rec("2026-04-08", 3),
      rec("2026-04-06", 3),
      rec("2026-04-04", 3),
      rec("2026-04-03", 3),
    ];
    expect(calculateStats(records).longestStreak).toBe(3);
  });

  it("worstDay: 最小 quality、同点なら最新 date", () => {
    const records: SleepRecord[] = [
      rec("2026-04-10", 5),
      rec("2026-04-09", 1), // 同点のうち新しい方
      rec("2026-04-08", 3),
      rec("2026-04-07", 1), // 同点だが古い
    ];
    const stats = calculateStats(records);
    expect(stats.worstDay).toEqual({ date: "2026-04-09", quality: 1 });
  });
});

// ---------------------------------------------------------------------------
// generateInsights (受入基準 #10 用)
// ---------------------------------------------------------------------------

describe("generateInsights", () => {
  it("気圧急低下日と通常日の平均差が 0.5 以上あれば warning を返す", () => {
    // 低気圧日 (-5 hPa): quality 1, 2, 2 → 平均 1.67
    // それ以外 (0 hPa): quality 4, 5, 5, 5 → 平均 4.75
    // 差 3.08 >> 0.5
    const records: SleepRecord[] = [
      rec("2026-04-10", 1, { pressureDeltaHpa: -5 }),
      rec("2026-04-09", 2, { pressureDeltaHpa: -5 }),
      rec("2026-04-08", 2, { pressureDeltaHpa: -5 }),
      rec("2026-04-07", 4, { pressureDeltaHpa: 0 }),
      rec("2026-04-06", 5, { pressureDeltaHpa: 0 }),
      rec("2026-04-05", 5, { pressureDeltaHpa: 0 }),
      rec("2026-04-04", 5, { pressureDeltaHpa: 0 }),
    ];
    const insights = generateInsights(records);
    const warn = insights.find((i) => i.key === "pressure_drop");
    expect(warn).toBeDefined();
    expect(warn!.severity).toBe("warning");
  });

  it("インサイトがなければ空配列を返す", () => {
    // 全 quality 同じ → どのルールも該当しない
    const records: SleepRecord[] = [
      rec("2026-04-10", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 15 }),
      rec("2026-04-09", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 16 }),
      rec("2026-04-08", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 17 }),
      rec("2026-04-07", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 18 }),
    ];
    expect(generateInsights(records)).toEqual([]);
  });

  it("空配列を渡した場合は空配列を返す", () => {
    expect(generateInsights([])).toEqual([]);
  });

  it("5〜9 件でほかのルールに非該当なら general インサイトを返す", () => {
    // 全 quality 同じ (3)、気圧変動なし → どのルールも非該当
    // 件数 7 件 → 5〜9 の range に入るので general が返るはず
    const records: SleepRecord[] = [
      rec("2026-04-10", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 15 }),
      rec("2026-04-09", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 16 }),
      rec("2026-04-08", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 15 }),
      rec("2026-04-07", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 16 }),
      rec("2026-04-06", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 15 }),
      rec("2026-04-05", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 16 }),
      rec("2026-04-04", 3, { pressureDeltaHpa: 0, moonPhase: 0.2, temperatureC: 15 }),
    ];
    const insights = generateInsights(records);
    const general = insights.find((i) => i.key === "general");
    expect(general).toBeDefined();
    expect(general!.severity).toBe("info");
  });
});

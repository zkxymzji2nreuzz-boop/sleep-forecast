/**
 * F004 予測ロジックのユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
  predictTomorrow,
  calculateContinuousRecordBadge,
} from "../prediction";
import type { SleepRecord, WeatherData } from "../types";

// テスト用のダミーデータ生成ヘルパ
function createWeatherData(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    temperatureC: 20,
    humidity: 60,
    pressureHpa: 1013,
    pressureDeltaHpa: 0,
    moonPhase: 0.25,
    moonIllumination: 0.5,
    fetchedAt: new Date().toISOString(),
    source: "open-meteo",
    ...overrides,
  };
}

function createSleepRecord(
  overrides: Partial<SleepRecord> = {},
  weatherOverrides: Partial<WeatherData> = {}
): SleepRecord {
  return {
    id: `rec_${Date.now()}`,
    date: "2026-04-10",
    quality: 3,
    prefectureCode: "13",
    weather: createWeatherData(weatherOverrides),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("predictTomorrow", () => {
  it("7件以上のデータで線形回帰を使用し、1.0〜5.0 の範囲で予測を返す", () => {
    // 7 件のダミー記録を作成
    const records = Array.from({ length: 7 }, (_, i) =>
      createSleepRecord(
        { quality: (3 + (i % 2)) as 1 | 2 | 3 | 4 | 5, date: `2026-04-0${i + 1}` },
        { pressureDeltaHpa: (i % 2) * 2 - 1 }
      )
    );

    const forecast = createWeatherData({ pressureDeltaHpa: 0.5 });
    const result = predictTomorrow(records, forecast);

    expect(result.predictedQuality).toBeGreaterThanOrEqual(1.0);
    expect(result.predictedQuality).toBeLessThanOrEqual(5.0);
    expect(result.confidence).toBe("medium");
    expect(result.isSample).toBe(false);
    expect(result.dataPointCount).toBe(7);
  });

  it("7件未満のデータでサンプル予測を使用し、isSample=true を返す", () => {
    const records = Array.from({ length: 3 }, (_, i) =>
      createSleepRecord(
        { quality: 3, date: `2026-04-0${i + 1}` },
        { pressureDeltaHpa: 0 }
      )
    );

    const forecast = createWeatherData({ pressureDeltaHpa: 0 });
    const result = predictTomorrow(records, forecast);

    expect(result.confidence).toBe("low");
    expect(result.isSample).toBe(true);
    expect(result.dataPointCount).toBe(3);
    expect(result.predictedQuality).toBeGreaterThanOrEqual(1.0);
    expect(result.predictedQuality).toBeLessThanOrEqual(5.0);
  });

  it("15件以上のデータで信頼度 'high' を返す", () => {
    const records = Array.from({ length: 15 }, (_, i) =>
      createSleepRecord(
        { quality: (3 + (i % 2)) as 1 | 2 | 3 | 4 | 5 },
        { pressureDeltaHpa: 0 }
      )
    );

    const forecast = createWeatherData();
    const result = predictTomorrow(records, forecast);

    expect(result.confidence).toBe("high");
  });

  it("気圧が -5hPa で気圧低下を identify する", () => {
    const records = Array.from({ length: 7 }, (_, i) =>
      createSleepRecord(
        { quality: 3 },
        { pressureDeltaHpa: 0 }
      )
    );

    const forecast = createWeatherData({ pressureDeltaHpa: -5 });
    const result = predictTomorrow(records, forecast);

    expect(result.factors).toContain("pressure_drop");
  });

  it("moonPhase=0.5 で満月を identify する", () => {
    const records = Array.from({ length: 7 }, (_, i) =>
      createSleepRecord(
        { quality: 3 },
        { moonPhase: 0.25 }
      )
    );

    const forecast = createWeatherData({ moonPhase: 0.5 });
    const result = predictTomorrow(records, forecast);

    expect(result.factors).toContain("full_moon");
  });

  it("useLinearRegression=false でサンプル予測を強制する", () => {
    const records = Array.from({ length: 10 }, () =>
      createSleepRecord({ quality: 3 })
    );

    const forecast = createWeatherData();
    const result = predictTomorrow(records, forecast, false);

    expect(result.isSample).toBe(true);
  });
});

describe("calculateContinuousRecordBadge", () => {
  it("3日で bronze レベルを返す", () => {
    const badge = calculateContinuousRecordBadge(3);

    expect(badge.level).toBe("bronze");
    expect(badge.longestStreak).toBe(3);
    expect(badge.displayText).toContain("3");
  });

  it("7日で silver レベルを返す", () => {
    const badge = calculateContinuousRecordBadge(7);

    expect(badge.level).toBe("silver");
    expect(badge.longestStreak).toBe(7);
    expect(badge.displayText).toContain("7");
  });

  it("30日で gold レベルを返す", () => {
    const badge = calculateContinuousRecordBadge(30);

    expect(badge.level).toBe("gold");
    expect(badge.longestStreak).toBe(30);
  });

  it("100日で platinum レベルを返す", () => {
    const badge = calculateContinuousRecordBadge(100);

    expect(badge.level).toBe("platinum");
    expect(badge.longestStreak).toBe(100);
  });

  it("2日で level=null を返す", () => {
    const badge = calculateContinuousRecordBadge(2);

    expect(badge.level).toBeNull();
    expect(badge.displayText).toBe("");
  });
});

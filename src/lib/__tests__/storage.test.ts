import { describe, it, expect, beforeEach } from "vitest";

import {
  STORAGE_KEY,
  clearAll,
  getRecords,
  getRecordByDate,
  saveRecord,
  deleteRecord,
} from "../storage";
import type { WeatherData } from "../types";

const dummyWeather: WeatherData = {
  temperatureC: 18.5,
  humidity: 55,
  pressureHpa: 1012.3,
  pressureDeltaHpa: -1.2,
  moonPhase: 0.25,
  moonIllumination: 0.4,
  fetchedAt: "2026-04-10T09:00:00.000Z",
  source: "open-meteo",
};

beforeEach(() => {
  // 各テストで localStorage をクリア
  window.localStorage.clear();
});

describe("storage", () => {
  it("happy: saveRecord → getRecords で 1 件取得、saveRecord の戻り値に id/createdAt/updatedAt が付く", () => {
    const saved = saveRecord({
      date: "2026-04-10",
      quality: 3,
      prefectureCode: "13",
      weather: dummyWeather,
    });
    expect(saved.id).toMatch(/^rec_2026-04-10_/);
    expect(saved.createdAt).toBeTruthy();
    expect(saved.updatedAt).toBeTruthy();
    expect(saved.createdAt).toBe(saved.updatedAt);

    const all = getRecords();
    expect(all).toHaveLength(1);
    expect(all[0].date).toBe("2026-04-10");
    expect(all[0].quality).toBe(3);
  });

  it("edge: 同じ date で再 save すると件数は 1 件のまま、id/createdAt は保持され updatedAt のみ更新", async () => {
    const first = saveRecord({
      date: "2026-04-10",
      quality: 3,
      prefectureCode: "13",
      weather: dummyWeather,
    });
    // 時刻差を作るために少し待つ
    await new Promise((r) => setTimeout(r, 5));
    const second = saveRecord({
      date: "2026-04-10",
      quality: 5,
      prefectureCode: "27",
      weather: { ...dummyWeather, temperatureC: 20 },
    });

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt >= first.updatedAt).toBe(true);

    const all = getRecords();
    expect(all).toHaveLength(1);
    expect(all[0].quality).toBe(5);
    expect(all[0].prefectureCode).toBe("27");
    expect(all[0].weather.temperatureC).toBe(20);
  });

  it("happy: getRecords() は date 降順で返る", () => {
    saveRecord({
      date: "2026-04-08",
      quality: 2,
      prefectureCode: "13",
      weather: dummyWeather,
    });
    saveRecord({
      date: "2026-04-10",
      quality: 4,
      prefectureCode: "13",
      weather: dummyWeather,
    });
    saveRecord({
      date: "2026-04-09",
      quality: 3,
      prefectureCode: "13",
      weather: dummyWeather,
    });
    const all = getRecords();
    expect(all.map((r) => r.date)).toEqual([
      "2026-04-10",
      "2026-04-09",
      "2026-04-08",
    ]);
  });

  it("edge: localStorage が空なら getRecords() は [] を返す", () => {
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getRecords()).toEqual([]);
    expect(getRecordByDate("2026-04-10")).toBeNull();
  });

  it("failure: JSON 破損時でも壊れず空配列でフォールバックする", () => {
    window.localStorage.setItem(STORAGE_KEY, "this is not json {");
    expect(() => getRecords()).not.toThrow();
    expect(getRecords()).toEqual([]);

    // 破損後でも saveRecord が動く (上書きされる)
    const saved = saveRecord({
      date: "2026-04-10",
      quality: 4,
      prefectureCode: "13",
      weather: dummyWeather,
    });
    expect(saved.id).toBeTruthy();
    expect(getRecords()).toHaveLength(1);
  });

  it("edge: deleteRecord / clearAll が期待通り動く", () => {
    const rec = saveRecord({
      date: "2026-04-10",
      quality: 3,
      prefectureCode: "13",
      weather: dummyWeather,
    });
    saveRecord({
      date: "2026-04-09",
      quality: 4,
      prefectureCode: "13",
      weather: dummyWeather,
    });
    expect(getRecords()).toHaveLength(2);

    deleteRecord(rec.id);
    expect(getRecords()).toHaveLength(1);
    expect(getRecordByDate("2026-04-10")).toBeNull();

    clearAll();
    expect(getRecords()).toHaveLength(0);
  });
});

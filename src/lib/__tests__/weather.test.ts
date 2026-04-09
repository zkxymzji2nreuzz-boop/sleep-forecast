import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  computePressureDelta,
  fetchWeather,
  getMoonData,
  mapOpenMeteoResponse,
  WeatherFetchError,
  type OpenMeteoResponse,
} from "../weather";

describe("weather", () => {
  describe("computePressureDelta", () => {
    it("happy: 24h 前の pressure_msl を index から選んで差分を返す", () => {
      // 2026-04-10T12:00:00Z を現在とし、hourly は 48 点
      const now = new Date("2026-04-10T12:00:00Z");
      const times: string[] = [];
      const pressures: number[] = [];
      for (let i = 0; i < 48; i += 1) {
        // 2026-04-09T00:00Z から 1h 刻みで 48 点
        const t = new Date("2026-04-09T00:00:00Z");
        t.setUTCHours(t.getUTCHours() + i);
        times.push(t.toISOString());
        pressures.push(1010 + i * 0.1);
      }
      // 24h 前 = 2026-04-09T12:00Z → index 12
      const expectedPast = pressures[12];
      const delta = computePressureDelta(
        { time: times, pressure_msl: pressures },
        1020,
        now
      );
      expect(delta).toBeCloseTo(1020 - expectedPast, 3);
    });

    it("edge: hourly が空なら 0 を返す", () => {
      expect(
        computePressureDelta({ time: [], pressure_msl: [] }, 1013, new Date())
      ).toBe(0);
      expect(computePressureDelta({}, 1013, new Date())).toBe(0);
    });

    it("failure: 数値でない past は 0 にフォールバックする", () => {
      const now = new Date("2026-04-10T12:00:00Z");
      const times = ["2026-04-09T12:00:00Z"];
      // 意図的に undefined を混ぜる
      const pressures = [undefined as unknown as number];
      const delta = computePressureDelta(
        { time: times, pressure_msl: pressures },
        1020,
        now
      );
      expect(delta).toBe(0);
    });
  });

  describe("getMoonData / mapOpenMeteoResponse", () => {
    it("happy: 月齢データは 0..1 範囲に収まる", () => {
      const moon = getMoonData(new Date("2026-04-10T00:00:00Z"));
      expect(moon.phase).toBeGreaterThanOrEqual(0);
      expect(moon.phase).toBeLessThanOrEqual(1);
      expect(moon.illumination).toBeGreaterThanOrEqual(0);
      expect(moon.illumination).toBeLessThanOrEqual(1);
    });

    it("happy: mapOpenMeteoResponse が WeatherData を正しく組み立てる", () => {
      const now = new Date("2026-04-10T12:00:00Z");
      const times: string[] = [];
      const pressures: number[] = [];
      for (let i = 0; i < 48; i += 1) {
        const t = new Date("2026-04-09T00:00:00Z");
        t.setUTCHours(t.getUTCHours() + i);
        times.push(t.toISOString());
        pressures.push(1012);
      }
      const raw: OpenMeteoResponse = {
        current: {
          temperature_2m: 18.42,
          relative_humidity_2m: 55.6,
          surface_pressure: 1010.2,
          pressure_msl: 1013.7,
        },
        hourly: { time: times, pressure_msl: pressures },
      };
      const w = mapOpenMeteoResponse(raw, now);
      expect(w.temperatureC).toBeCloseTo(18.4, 1);
      expect(w.humidity).toBe(56);
      expect(w.pressureHpa).toBeCloseTo(1013.7, 1);
      // 全部 1012 なので delta = 1013.7 - 1012 = 1.7
      expect(w.pressureDeltaHpa).toBeCloseTo(1.7, 1);
      expect(w.moonPhase).toBeGreaterThanOrEqual(0);
      expect(w.moonPhase).toBeLessThanOrEqual(1);
      expect(w.moonIllumination).toBeGreaterThanOrEqual(0);
      expect(w.moonIllumination).toBeLessThanOrEqual(1);
      expect(w.source).toBe("open-meteo");
      expect(w.fetchedAt).toBe(now.toISOString());
    });
  });

  describe("fetchWeather (fetch モック)", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      // 各テストごとにリセット
      globalThis.fetch = originalFetch;
    });
    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it("happy: /api/weather を叩いて WeatherData を返す (fetch をモック)", async () => {
      const fake = {
        temperatureC: 20.1,
        humidity: 60,
        pressureHpa: 1015,
        pressureDeltaHpa: -0.5,
        moonPhase: 0.3,
        moonIllumination: 0.5,
        fetchedAt: "2026-04-10T09:00:00.000Z",
        source: "open-meteo",
      };
      const fetchMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => fake,
      })) as unknown as typeof fetch;
      globalThis.fetch = fetchMock;

      const result = await fetchWeather(35.6895, 139.6917);
      expect(result).toEqual(fake);
      // URL が /api/weather に向いているか確認
      const callArg = (fetchMock as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0][0] as string;
      expect(callArg).toContain("/api/weather");
      expect(callArg).toContain("lat=35.6895");
      expect(callArg).toContain("lon=139.6917");
    });

    it("failure: /api/weather が 500 なら WeatherFetchError を throw する", async () => {
      globalThis.fetch = vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "boom" }),
      })) as unknown as typeof fetch;

      await expect(fetchWeather(35.68, 139.69)).rejects.toBeInstanceOf(
        WeatherFetchError
      );
    });
  });
});

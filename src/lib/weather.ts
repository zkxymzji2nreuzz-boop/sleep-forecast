/**
 * Open-Meteo 気象 API のクライアントと、月齢計算ヘルパ。
 *
 * ブラウザから直接 open-meteo.com を叩かず、Next.js の Route Handler
 * (`/api/weather`) をプロキシとして経由する。CORS / キャッシュ / 将来の
 * API 差し替えを容易にするため。
 */

import SunCalc from "suncalc";

import type { WeatherData } from "./types";

/** Open-Meteo API ベース URL (認証不要、非商用無料) */
export const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

/** /api/weather が失敗した場合に throw するエラー型 */
export class WeatherFetchError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "WeatherFetchError";
  }
}

/** Open-Meteo の `current` レスポンス部分の型 (必要なフィールドのみ) */
type OpenMeteoCurrent = {
  time?: string;
  temperature_2m?: number;
  relative_humidity_2m?: number;
  surface_pressure?: number;
  pressure_msl?: number;
};

/** Open-Meteo の `hourly` レスポンス部分の型 (必要なフィールドのみ) */
type OpenMeteoHourly = {
  time?: string[];
  pressure_msl?: number[];
};

/** Open-Meteo レスポンス全体 (必要なフィールドのみ) */
export type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
};

/**
 * Open-Meteo から取得した生レスポンスを `WeatherData` に変換する。
 * 月齢はサーバ・クライアントどちらでも計算可能なので、ここで付与する。
 */
export function mapOpenMeteoResponse(
  data: OpenMeteoResponse,
  now: Date = new Date()
): WeatherData {
  const current = data.current ?? {};
  const hourly = data.hourly ?? {};

  const temperatureC = numberOr(current.temperature_2m, 0);
  const humidity = numberOr(current.relative_humidity_2m, 0);
  const pressureHpa = numberOr(
    current.pressure_msl ?? current.surface_pressure,
    1013
  );

  const pressureDeltaHpa = computePressureDelta(hourly, pressureHpa, now);
  const moon = getMoonData(now);

  return {
    temperatureC: round1(temperatureC),
    humidity: Math.round(humidity),
    pressureHpa: round1(pressureHpa),
    pressureDeltaHpa: round1(pressureDeltaHpa),
    moonPhase: round4(moon.phase),
    moonIllumination: round4(moon.illumination),
    fetchedAt: now.toISOString(),
    source: "open-meteo",
  };
}

/**
 * 24 時間前との気圧差 (hPa, 小数 1 桁) を算出する。
 * `hourly.time[]` の中から「現在時刻 - 24h」に最も近い (以上の) index を選び、
 * その時点の `pressure_msl` と現在値の差を返す。
 * 参照点が見つからない場合は 0 を返す。
 */
export function computePressureDelta(
  hourly: OpenMeteoHourly,
  currentPressure: number,
  now: Date
): number {
  const times = hourly.time ?? [];
  const values = hourly.pressure_msl ?? [];
  if (times.length === 0 || values.length === 0) {
    return 0;
  }

  const targetMs = now.getTime() - 24 * 60 * 60 * 1000;
  let chosenIdx = -1;
  for (let i = 0; i < times.length; i += 1) {
    const t = Date.parse(times[i]);
    if (Number.isFinite(t) && t >= targetMs) {
      chosenIdx = i;
      break;
    }
  }
  if (chosenIdx === -1) {
    chosenIdx = 0;
  }
  const past = values[chosenIdx];
  if (typeof past !== "number" || !Number.isFinite(past)) {
    return 0;
  }
  return currentPressure - past;
}

/**
 * suncalc による月齢データ。
 * - `phase`        : 0..1 (new moon 0, full moon 0.5)
 * - `illumination` : 0..1 (fraction, 満月で 1 に近づく)
 */
export function getMoonData(date: Date = new Date()): {
  phase: number;
  illumination: number;
} {
  const m = SunCalc.getMoonIllumination(date);
  return { phase: m.phase, illumination: m.fraction };
}

/**
 * Next.js の Route Handler (`/api/weather`) 経由で気象データを取得する。
 * クライアント (Client Component) からの呼び出し専用。
 * 失敗時は `WeatherFetchError` を throw する。
 */
export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const url = `/api/weather?lat=${encodeURIComponent(
    latitude
  )}&lon=${encodeURIComponent(longitude)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", cache: "no-store" });
  } catch (err) {
    throw new WeatherFetchError(
      `ネットワークエラー: ${(err as Error).message}`
    );
  }
  if (!res.ok) {
    throw new WeatherFetchError(
      `気象データの取得に失敗しました (status=${res.status})`,
      res.status
    );
  }
  const json = (await res.json()) as WeatherData;
  return json;
}

/** 小数 1 桁で丸める */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 小数 4 桁で丸める */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** 数値以外を fallback にフォールバックする */
function numberOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

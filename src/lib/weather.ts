/**
 * Open-Meteo 気象 API のクライアントと、月齢計算ヘルパ。
 *
 * ブラウザから直接 open-meteo.com を叩かず、Next.js の Route Handler
 * (`/api/weather`) をプロキシとして経由する。CORS / キャッシュ / 将来の
 * API 差し替えを容易にするため。
 */

import SunCalc from "suncalc";

import type { WeatherData, FullWeatherData, HourlyPressureData, DailyForecast } from "./types";

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

/** Open-Meteo の `daily` レスポンス部分の型 (必要なフィールドのみ) */
type OpenMeteoDaily = {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  relative_humidity_2m_max?: number[];
  precipitation_probability?: number[];
  pressure_msl_min?: number[];
  pressure_msl_max?: number[];
  weathercode?: number[];
};

/** Open-Meteo レスポンス全体 (必要なフィールドのみ) */
export type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
  daily?: OpenMeteoDaily;
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

/**
 * 明日の気象予報を取得する。
 * `/api/weather` の `forecast=true` パラメータを使用。
 *
 * @param latitude   緯度 (-90..90)
 * @param longitude  経度 (-180..180)
 * @returns 明日の気象予報 WeatherData
 * @throws WeatherFetchError
 */
export async function fetchWeatherForecast(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const url = `/api/weather?lat=${encodeURIComponent(
    latitude
  )}&lon=${encodeURIComponent(longitude)}&forecast=true`;
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", cache: "no-store" });
  } catch (err) {
    throw new WeatherFetchError(
      `ネットワークエラー (明日の予報): ${(err as Error).message}`
    );
  }
  if (!res.ok) {
    throw new WeatherFetchError(
      `明日の予報取得に失敗しました (status=${res.status})`,
      res.status
    );
  }
  const json = (await res.json()) as WeatherData;
  return json;
}

/**
 * Open-Meteo の full レスポンス (current + hourly + daily) を
 * `FullWeatherData` に変換する。
 */
export function mapOpenMeteoFullResponse(
  data: OpenMeteoResponse & {
    hourly?: { time?: string[]; pressure_msl?: number[] };
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      relative_humidity_2m_max?: number[];
      precipitation_probability_max?: number[];
      pressure_msl_min?: number[];
      pressure_msl_max?: number[];
      weathercode?: number[];
    };
  },
  now: Date = new Date()
): FullWeatherData {
  // 現在の気象
  const current = mapOpenMeteoResponse(data, now);

  // hourly 気圧 (72h 分)
  const rawTimes = data.hourly?.time ?? [];
  const rawValues = data.hourly?.pressure_msl ?? [];

  // 現在時刻以降 72 エントリのみ抽出 (past_days=1 で過去分も入る)
  const nowMs = now.getTime();
  const filteredTimes: string[] = [];
  const filteredValues: number[] = [];

  rawTimes.forEach((t, i) => {
    const tMs = Date.parse(t);
    if (
      Number.isFinite(tMs) &&
      tMs >= nowMs - 3600 * 1000 && // 1h 前まで含める (グラフのアンカー用)
      filteredTimes.length < 73 &&
      typeof rawValues[i] === "number" &&
      Number.isFinite(rawValues[i])
    ) {
      filteredTimes.push(t);
      filteredValues.push(round1(rawValues[i] as number));
    }
  });

  const hourlyPressure: HourlyPressureData = {
    times: filteredTimes,
    values: filteredValues,
  };

  // daily 予報 (7 日分)
  const daily = data.daily ?? {};
  const dailyTimes = daily.time ?? [];
  const forecast: DailyForecast[] = dailyTimes.slice(0, 7).map((date, i) => {
    const tempMax = round1(daily.temperature_2m_max?.[i] ?? 0);
    const tempMin = round1(daily.temperature_2m_min?.[i] ?? 0);
    const humidity = Math.round(daily.relative_humidity_2m_max?.[i] ?? 50);
    const precipProbability = Math.round(
      daily.precipitation_probability_max?.[i] ?? 0
    );
    const pressureMin = round1(daily.pressure_msl_min?.[i] ?? 1013);
    const pressureMax = round1(daily.pressure_msl_max?.[i] ?? 1013);
    const weatherCode = daily.weathercode?.[i];

    // 前日比気圧差: 今日は current.pressureDeltaHpa、それ以降は前日 max → 当日 min で近似
    let pressureDelta = 0;
    if (i === 0) {
      pressureDelta = current.pressureDeltaHpa;
    } else {
      const prevMax = daily.pressure_msl_max?.[i - 1];
      if (typeof prevMax === "number" && Number.isFinite(prevMax)) {
        pressureDelta = round1(pressureMin - prevMax);
      }
    }

    return {
      date,
      tempMax,
      tempMin,
      humidity,
      precipProbability,
      pressureMin,
      pressureMax,
      pressureDelta,
      weatherCode,
    };
  });

  return { current, hourlyPressure, forecast };
}

/**
 * `/api/weather?type=full` 経由で完全な気象データを取得する。
 */
export async function fetchFullWeather(
  latitude: number,
  longitude: number
): Promise<FullWeatherData> {
  const url = `/api/weather?lat=${encodeURIComponent(
    latitude
  )}&lon=${encodeURIComponent(longitude)}&type=full`;
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", cache: "no-store" });
  } catch (err) {
    throw new WeatherFetchError(
      `ネットワークエラー (full): ${(err as Error).message}`
    );
  }
  if (!res.ok) {
    throw new WeatherFetchError(
      `完全気象データの取得に失敗しました (status=${res.status})`,
      res.status
    );
  }
  const json = (await res.json()) as FullWeatherData;
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

/**
 * Open-Meteo の daily レスポンスから指定インデックスの気象を WeatherData に変換。
 * 月齢は計算日(明日)基準。気圧差は daily の min/max 平均で補完。
 *
 * @param daily        Open-Meteo daily オブジェクト
 * @param dayIndex     0=今日, 1=明日, ...
 * @param baseDate     基準日時
 */
export function mapOpenMeteoDailyToWeather(
  daily: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    relative_humidity_2m_max?: number[];
    precipitation_probability?: number[];
    pressure_msl_min?: number[];
    pressure_msl_max?: number[];
  },
  dayIndex: number,
  baseDate: Date
): WeatherData {
  // dayIndex=1 なら、baseDate + 1日
  const tomorrowDate = new Date(baseDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + dayIndex);

  // 気温: min/max 平均
  const tempMin = daily.temperature_2m_min?.[dayIndex] ?? 0;
  const tempMax = daily.temperature_2m_max?.[dayIndex] ?? 0;
  const temperatureC = round1((tempMin + tempMax) / 2);

  // 湿度: max を使用
  const humidity = Math.round(daily.relative_humidity_2m_max?.[dayIndex] ?? 50);

  // 気圧: min/max 平均
  const pressureMin = daily.pressure_msl_min?.[dayIndex] ?? 1013;
  const pressureMax = daily.pressure_msl_max?.[dayIndex] ?? 1013;
  const pressureHpa = round1((pressureMin + pressureMax) / 2);

  // 気圧差: 予報では 24h 前を持たないため、
  // 「最低気圧 (min) - 前日の最高気圧 (max[0])」で補完
  let pressureDeltaHpa = 0;
  if (dayIndex === 1 && daily.pressure_msl_max && daily.pressure_msl_max[0]) {
    pressureDeltaHpa = round1(pressureMin - daily.pressure_msl_max[0]);
  }

  // 月齢: 明日の日付で計算
  const moon = getMoonData(tomorrowDate);

  return {
    temperatureC,
    humidity,
    pressureHpa,
    pressureDeltaHpa,
    moonPhase: round4(moon.phase),
    moonIllumination: round4(moon.illumination),
    fetchedAt: new Date().toISOString(),
    source: "open-meteo",
  };
}

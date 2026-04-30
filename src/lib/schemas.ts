/**
 * SleepForecast Zod ランタイム検証スキーマ。
 *
 * TypeScript の型はコンパイル時のみ保証されるため、
 * 外部 API レスポンスやフォーム入力にはランタイム検証を追加する。
 *
 * 使用箇所:
 * - /api/weather レスポンスの検証 (WeatherData, FullWeatherData)
 * - 設定フォーム入力の検証 (SettingsFormSchema)
 */

import { z } from "zod";

// ─── 気象データ ───────────────────────────────────────────────

export const WeatherDataSchema = z.object({
  temperatureC: z.number().min(-50).max(60),
  humidity: z.number().min(0).max(100),
  pressureHpa: z.number().min(800).max(1100),
  pressureDeltaHpa: z.number().min(-50).max(50),
  moonPhase: z.number().min(0).max(1),
  moonIllumination: z.number().min(0).max(1),
  fetchedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  source: z.enum(["open-meteo", "manual"]),
  apparentTemperatureC: z.number().min(-50).max(60).optional(),
});

export type WeatherDataInput = z.input<typeof WeatherDataSchema>;

// ─── 時間別気圧データ ─────────────────────────────────────────

export const HourlyPressureDataSchema = z.object({
  times: z.array(z.string()),
  values: z.array(z.number()),
});

// ─── 時間別天気データ ─────────────────────────────────────────

export const HourlyWeatherDataSchema = z.object({
  times: z.array(z.string()),
  temps: z.array(z.number()),
  weatherCodes: z.array(z.number()),
  precipProbs: z.array(z.number()),
  precipMm: z.array(z.number()),
  humidity: z.array(z.number()),
  pressures: z.array(z.number()),
});

// ─── 日次予報データ ───────────────────────────────────────────

export const DailyForecastSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tempMax: z.number(),
  tempMin: z.number(),
  humidity: z.number().min(0).max(100),
  precipProbability: z.number().min(0).max(100),
  pressureMin: z.number().min(800).max(1100),
  pressureMax: z.number().min(800).max(1100),
  pressureDelta: z.number(),
  weatherCode: z.number().optional(),
});

// ─── AQI データ ───────────────────────────────────────────────

export const AQIDataSchema = z.object({
  usAqi: z.number().min(0),
  pm25: z.number().min(0),
  category: z.string(),
  color: z.string(),
});

// ─── /api/weather?type=full レスポンス全体 ───────────────────

export const FullWeatherDataSchema = z.object({
  current: WeatherDataSchema,
  hourlyPressure: HourlyPressureDataSchema,
  hourlyWeather: HourlyWeatherDataSchema,
  forecast: z.array(DailyForecastSchema),
  aqi: AQIDataSchema.optional(),
});

export type FullWeatherDataInput = z.input<typeof FullWeatherDataSchema>;

// ─── 設定フォーム ─────────────────────────────────────────────

/**
 * SettingsForm の入力値バリデーション。
 * React Hook Form の resolver として使用可能。
 */
export const SettingsFormSchema = z.object({
  /** JIS X 0401 の都道府県コード "01".."47" */
  prefectureCode: z
    .string()
    .regex(/^(0[1-9]|[1-3][0-9]|4[0-7])$/, "都道府県を選択してください"),

  /** 気圧感受度 1〜5 */
  pressureSensitivity: z
    .number({ invalid_type_error: "気圧感受度を選択してください" })
    .int()
    .min(1)
    .max(5)
    .nullable()
    .optional(),

  /** プッシュ通知の有効化 */
  notificationEnabled: z.boolean().optional(),

  /** 通知時刻 HH:mm 形式 (任意) */
  notificationTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm 形式で入力してください")
    .optional()
    .or(z.literal("")),
});

export type SettingsFormValues = z.infer<typeof SettingsFormSchema>;

// ─── API レスポンス汎用ラッパー ───────────────────────────────

/**
 * Zod スキーマで外部データを安全に検証するユーティリティ。
 * 検証失敗時は null を返し、コンソールに警告を出力する。
 *
 * @example
 * const data = safeParseOrNull(FullWeatherDataSchema, rawJson);
 * if (!data) return; // フォールバック処理
 */
export function safeParseOrNull<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label = "data"
): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Zod] ${label} validation failed:`, result.error.flatten());
    }
    return null;
  }
  return result.data;
}

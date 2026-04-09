/**
 * SleepForecast の共通型定義。
 * F002 (STEP 2) で本実装。F003 以降で拡張される可能性がある場合でも、
 * 後方互換を意識して追加プロパティは optional で差し込むこと。
 */

/**
 * 睡眠品質の 5 段階評価。
 * 1: とても悪い / 2: 悪い / 3: 普通 / 4: 良い / 5: とても良い
 */
export type SleepQuality = 1 | 2 | 3 | 4 | 5;

/**
 * Open-Meteo (もしくは手動入力) から取得した気象データのスナップショット。
 * `pressureDeltaHpa` は 24 時間前との海面更正気圧差 (小数 1 桁)。
 */
export type WeatherData = {
  /** 気温 (°C) */
  temperatureC: number;
  /** 相対湿度 (%) */
  humidity: number;
  /** 海面更正気圧 (hPa, `pressure_msl`) */
  pressureHpa: number;
  /** 24 時間前との気圧差 (hPa, 小数 1 桁, 取得不可時は 0) */
  pressureDeltaHpa: number;
  /** 月の位相 0..1 (suncalc.getMoonIllumination().phase) */
  moonPhase: number;
  /** 月の照度 0..1 (suncalc.getMoonIllumination().fraction) */
  moonIllumination: number;
  /** 取得 (または手動入力) 時刻 (ISO 8601, +09:00) */
  fetchedAt: string;
  /** データソース: API か手動入力か */
  source: "open-meteo" | "manual";
};

/**
 * 1 日分の睡眠記録。localStorage に配列で永続化される。
 * 日付 (`date`) は YYYY-MM-DD、時刻 (`bedtime`/`wakeTime`) は HH:mm。
 */
export type SleepRecord = {
  /** 例: "rec_2026-04-10_8f3a" */
  id: string;
  /** YYYY-MM-DD (Asia/Tokyo 基準) */
  date: string;
  /** 1..5 の 5 段階評価 */
  quality: SleepQuality;
  /** HH:mm (任意) */
  bedtime?: string;
  /** HH:mm (任意) */
  wakeTime?: string;
  /** 自由メモ 280 字以内 (任意) */
  note?: string;
  /** JIS X 0401 の都道府県コード "01".."47" */
  prefectureCode: string;
  /** 気象データのスナップショット (必須) */
  weather: WeatherData;
  /** 作成時刻 (ISO 8601) */
  createdAt: string;
  /** 更新時刻 (ISO 8601) */
  updatedAt: string;
};

/**
 * 47 都道府県マスタ。県庁所在地の緯度経度を保持する。
 */
export type PrefectureMaster = {
  /** JIS X 0401 "01".."47" */
  code: string;
  /** 日本語名 (例: "東京都") */
  name: string;
  /** 英字表記 (例: "Tokyo") */
  nameEn: string;
  /** 県庁所在地の緯度 (小数 4 桁) */
  latitude: number;
  /** 県庁所在地の経度 (小数 4 桁) */
  longitude: number;
};

/**
 * localStorage に保存する JSON のトップレベル形。
 */
export type StoredRecords = {
  version: 1;
  records: SleepRecord[];
};

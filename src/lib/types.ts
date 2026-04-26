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
  /** 体感気温 (°C, apparent_temperature。取得失敗時は undefined) */
  apparentTemperatureC?: number;
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

/**
 * 予測に寄与した主要な気象要因を区分。
 * 複数該当する可能性があるため配列で返す。
 */
export type PredictionFactor =
  | "pressure_drop"      // 気圧が 3hPa 以上下降
  | "pressure_rise"      // 気圧が 3hPa 以上上昇
  | "full_moon"          // 満月前後 (moonPhase 0.45〜0.55)
  | "new_moon"           // 新月前後 (moonPhase 0.0〜0.1 または 0.9〜1.0)
  | "high_temperature"   // 気温が過去平均より 3°C 以上高い
  | "low_temperature"    // 気温が過去平均より 3°C 以上低い
  | "high_humidity"      // 湿度が 70% 以上
  | "neutral";           // 特に顕著な要因なし

/**
 * predictTomorrow() の戻り値。
 * 明日の睡眠品質予測をまるごと包含する。
 */
export type PredictionResult = {
  /** 予測睡眠品質 (1.0 〜 5.0, 小数 1 桁) */
  predictedQuality: number;

  /** 信頼度: "low" (7日未満) | "medium" (7〜14日) | "high" (15日以上) */
  confidence: "low" | "medium" | "high";

  /** 主要因配列 (最大 2 個) */
  factors: PredictionFactor[];

  /** 日本語の詳細説明 (1 行, 最大 80 字) */
  factorDescription: string;

  /**
   * アドバイスメッセージ (複数)。
   * 優先度順で返す (最初の 2 件を UI に表示)。
   */
  advice: {
    /** "info" | "warning" | "positive" */
    severity: "info" | "warning" | "positive";
    /** 日本語のアクション文 (最大 60 字) */
    text: string;
  }[];

  /** このサンプルデータか否か (7日未満 = true) */
  isSample: boolean;

  /**
   * 返す際に使用した過去データの有効件数。
   * "0 件のため全サンプル" とか "12 件から計算" を UI に表示するのに使う。
   */
  dataPointCount: number;
};

/**
 * SEO 記事のフロントマターから抽出するメタデータ。
 * 記事一覧ページ・JSON-LD 構造化データ・sitemap 用に使用する。
 */
export type ArticleMeta = {
  /** ファイル名から導出する識別子 (例: "kiatsu-zutsu") */
  slug: string;
  /** 記事タイトル (日本語可, 最大 70 字) */
  title: string;
  /** SEO 用説明文 (日本語可, 120-160 字推奨) */
  description: string;
  /** 初出公開日 (YYYY-MM-DD) */
  publishedAt: string;
  /** 最終更新日 (YYYY-MM-DD) */
  updatedAt: string;
  /** カテゴリー (例: "気象病", "睡眠改善") */
  category: string;
  /** タグ配列 */
  tags: string[];
  /** 関連記事のスラッグ配列 */
  relatedSlugs: string[];
  /** おおよその文字数 (任意) */
  wordCount?: number;
};

/**
 * 目次項目。記事本文の H2 見出しから抽出した最小構造。
 * `id` は rehype-slug によって付与された見出し id、
 * `text` は見出しのプレーンテキスト。
 */
export type TocItem = {
  /** rehype-slug が付与した見出し id (例: "kiatsu-to-zutsu") */
  id: string;
  /** 見出しのプレーンテキスト */
  text: string;
  /** 見出しレベル (現時点では 2 のみ使用) */
  level: 2;
};

/**
 * 記事の本文付き完全体。
 * `contentHtml` は remark-rehype で HTML 文字列化したもの。
 * Server Component からのみ取得されるため、XSS の心配は相対的に低い
 * (ソースは信頼できるリポジトリ内の Markdown ファイル)。
 */
export type ArticleFull = ArticleMeta & {
  /** remark → rehype 変換済みの HTML 文字列 */
  contentHtml: string;
  /** contentHtml から抽出した H2 目次 (3 件未満なら UI は非表示) */
  toc: TocItem[];
};

/**
 * 72時間の気圧hourlyデータ (WeatherWidget 用)
 */
export type HourlyPressureData = {
  /** ISO 8601 タイムスタンプ配列 */
  times: string[];
  /** 各時刻の海面更正気圧 (hPa) */
  values: number[];
};

/**
 * 時間別天気データ（今日〜翌日早朝、1時間ごと）
 * WeatherWidget の時間別天気セクションに使用。
 */
export type HourlyWeatherData = {
  /** ISO 8601 タイムスタンプ配列 */
  times: string[];
  /** 気温 (°C, 整数) */
  temps: number[];
  /** WMO 天気コード */
  weatherCodes: number[];
  /** 降水確率 (%) */
  precipProbs: number[];
  /** 降水量 (mm, 小数1桁) */
  precipMm: number[];
  /** 相対湿度 (%) */
  humidity: number[];
  /** 海面更正気圧 (hPa, 整数) */
  pressures: number[];
};

/**
 * 1日分の天気予報データ
 */
export type DailyForecast = {
  /** YYYY-MM-DD */
  date: string;
  /** 最高気温 (°C) */
  tempMax: number;
  /** 最低気温 (°C) */
  tempMin: number;
  /** 最大湿度 (%) */
  humidity: number;
  /** 降水確率 (%) */
  precipProbability: number;
  /** 最低海面更正気圧 (hPa) */
  pressureMin: number;
  /** 最高海面更正気圧 (hPa) */
  pressureMax: number;
  /** 前日比気圧差 (hPa) */
  pressureDelta: number;
  /** WMO 天気コード (0=快晴, 1=晴れ, 2=曇り時々晴れ, 3=曇り, 45/48=霧, 51-55=小雨, 61-65=雨, 71-75=雪, 80-82=にわか雨, 95=雷雨) */
  weatherCode?: number;
};

/**
 * 大気質（Air Quality Index）データ。
 * Open-Meteo Air Quality API から取得。
 */
export type AQIData = {
  /** US AQI 値 (0〜500+) */
  usAqi: number;
  /** PM2.5 濃度 (μg/m³) */
  pm25: number;
  /**
   * AQI カテゴリ:
   * "良好" (0-50) / "普通" (51-100) / "敏感な人に注意" (101-150) /
   * "悪い" (151-200) / "とても悪い" (201+)
   */
  category: string;
  /** カテゴリに対応するカラーコード */
  color: string;
};

/**
 * WeatherWidget 用の完全な気象データ。
 * /api/weather?type=full で取得。
 */
export type FullWeatherData = {
  /** 現在の気象スナップショット */
  current: WeatherData;
  /** 72時間の気圧推移 (グラフ用) */
  hourlyPressure: HourlyPressureData;
  /** 時間別天気データ (今日〜翌日早朝) */
  hourlyWeather: HourlyWeatherData;
  /** 7日分の天気予報 */
  forecast: DailyForecast[];
  /** 大気質データ (取得失敗時は undefined) */
  aqi?: AQIData;
};

/**
 * トップページに表示する連続記録バッジ。
 * 最長連続日数に応じた 4 段階バッジ。
 */
export type ContinuousRecordBadge = {
  /** 最長連続記録日数 */
  longestStreak: number;

  /**
   * バッジレベル:
   * - "bronze"   : 3〜6日
   * - "silver"   : 7〜29日
   * - "gold"     : 30〜99日
   * - "platinum" : 100日以上
   * - null       : 3日未満 (非表示)
   */
  level: "bronze" | "silver" | "gold" | "platinum" | null;

  /** 表示用テキスト (例: "7 日連続記録 🥈") */
  displayText: string;
};

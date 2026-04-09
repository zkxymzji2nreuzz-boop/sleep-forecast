# F004 実装仕様書 — 明日の予測機能 (STEP 4)

**作成日**: 2026-04-10  
**ターゲット**: Generator (Opus) が直接コーディングできるレベルの具体性

---

## 概要

気象予報データと過去の睡眠記録から、**明日の睡眠品質を 1.0〜5.0 の数値で予測** し、その理由（主要因）とアドバイスを提示する機能。

- **7 日以上の記録** → 線形回帰で予測
- **7 日未満の記録** → サンプル予測 (デモ値)
- **予測カード** → トップページ上部 + ダッシュボード上部に配置
- **連続記録バッジ** → トップページに表示

---

## 1. 型定義追加 (`src/lib/types.ts` に追記)

### 1.1 `PredictionFactor` — 主要因

```typescript
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
```

### 1.2 `PredictionResult` — 予測結果

```typescript
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
```

### 1.3 `ContinuousRecordBadge` — 連続記録バッジ

```typescript
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
```

---

## 2. 気象 API 拡張 (`src/lib/weather.ts` + `src/app/api/weather/route.ts`)

### 2.1 `fetchWeatherForecast()` 関数の追加

**責務**: 明日の気象予報を取得する。

```typescript
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
```

### 2.2 API ルートの拡張 (`src/app/api/weather/route.ts`)

**変更内容**:

- クエリパラメータ `forecast` を追加する
- `forecast=true` の場合、Open-Meteo に対して `forecast_days=2` を設定し、`daily` 値を取得
- `daily` の `[1]` (明日の値) をマッピングして返す

**実装ロジック**:

```typescript
// parseLatLon() 関数の後に以下を追加

function parseForecast(searchParams: URLSearchParams): boolean {
  const val = searchParams.get("forecast");
  return val === "true";
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = parseLatLon(searchParams);
  if (!parsed.ok) {
    return Response.json({ error: parsed.reason }, { status: 400 });
  }

  const isForecast = parseForecast(searchParams);

  const upstream = new URL(OPEN_METEO_BASE_URL);
  upstream.searchParams.set("latitude", parsed.lat.toString());
  upstream.searchParams.set("longitude", parsed.lon.toString());

  if (isForecast) {
    // 明日の予報を取得
    upstream.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,precipitation_probability,pressure_msl_min,pressure_msl_max"
    );
    upstream.searchParams.set("forecast_days", "2");
    upstream.searchParams.set("timezone", "Asia/Tokyo");
  } else {
    // 現在の気象を取得 (既存ロジック)
    upstream.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl"
    );
    upstream.searchParams.set("hourly", "pressure_msl");
    upstream.searchParams.set("past_days", "1");
    upstream.searchParams.set("forecast_days", "1");
    upstream.searchParams.set("timezone", "Asia/Tokyo");
    upstream.searchParams.set("windspeed_unit", "ms");
  }

  // fetch と応答処理 (既存ロジックを踏襲)
  // ...

  if (isForecast) {
    // daily[1] をマッピング
    const daily = json.daily;
    if (!daily || !daily.time || daily.time.length < 2) {
      return Response.json(
        { error: "明日の予報データが利用できません" },
        { status: 502 }
      );
    }
    const forecastData = mapOpenMeteoDailyToWeather(daily, 1, new Date());
    return Response.json(forecastData, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } else {
    // 既存の現在値マッピング
    const weather = mapOpenMeteoResponse(json, new Date());
    return Response.json(weather, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  }
}
```

### 2.3 `mapOpenMeteoDailyToWeather()` ヘルパ

**責務**: Open-Meteo の `daily` レスポンスから明日の `WeatherData` を抽出。

```typescript
/**
 * Open-Meteo の daily レスポンスから指定インデックスの気象を WeatherData に変換。
 * 月齢は計算日(明日)基準。気圧差は daily の min/max 平均で補完。
 *
 * @param daily        Open-Meteo daily オブジェクト
 * @param dayIndex     0=今日, 1=明日, ...
 * @param baseDate     基準日時
 */
function mapOpenMeteoDailyToWeather(
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
```

---

## 3. 予測ロジック (`src/lib/prediction.ts` — 新規作成)

### 3.1 `predictTomorrow()` メイン関数

```typescript
import type {
  SleepRecord,
  WeatherData,
  PredictionResult,
  PredictionFactor,
} from "./types";
import { calculateLinearRegression, calculatePearsonCorrelation } from "./correlation";

/**
 * 明日の睡眠品質を予測する。
 *
 * - 記録 7 件以上: 線形回帰で予測
 * - 記録 7 件未満: サンプル予測 (デモ値) + isSample=true
 * - 信頼度を計算: low (7日未満) / medium (7〜14日) / high (15日以上)
 * - 主要因を判定: 最大 2 個、優先度順
 * - アドバイスを生成: severity 別に複数
 *
 * @param records              localStorage から取得した過去記録
 * @param forecastData         明日の気象予報 (fetchWeatherForecast() で取得)
 * @param useLinearRegression  デバッグ用: false でサンプル予測を強制
 */
export function predictTomorrow(
  records: SleepRecord[],
  forecastData: WeatherData,
  useLinearRegression: boolean = true
): PredictionResult {
  const validRecords = records.filter(
    (r) =>
      typeof r.quality === "number" &&
      r.quality >= 1 &&
      r.quality <= 5 &&
      r.weather
  );

  // --- 信頼度と予測ロジック分岐 ---
  let predictedQuality: number;
  let confidence: "low" | "medium" | "high";
  let isSample: boolean;

  if (validRecords.length >= 15) {
    confidence = "high";
  } else if (validRecords.length >= 7) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  if (confidence !== "low" && useLinearRegression) {
    // 線形回帰で予測
    predictedQuality = predictByRegression(
      validRecords,
      forecastData,
      confidence
    );
    isSample = false;
  } else {
    // サンプル予測
    predictedQuality = generateSamplePrediction(forecastData);
    isSample = true;
  }

  // クランプ: 1.0 〜 5.0
  predictedQuality = Math.max(1.0, Math.min(5.0, predictedQuality));

  // --- 主要因判定 ---
  const factors = identifyFactors(validRecords, forecastData);

  // --- 主要因の日本語説明 ---
  const factorDescription = generateFactorDescription(factors, forecastData);

  // --- アドバイス生成 ---
  const advice = generateAdvice(
    predictedQuality,
    factors,
    forecastData,
    validRecords
  );

  return {
    predictedQuality: Math.round(predictedQuality * 10) / 10,
    confidence,
    factors,
    factorDescription,
    advice,
    isSample,
    dataPointCount: validRecords.length,
  };
}
```

### 3.2 `predictByRegression()` — 線形回帰予測

```typescript
/**
 * 過去データから線形回帰モデルを構築し、明日の気象で予測。
 *
 * ロジック:
 * 1. 4 つの単回帰モデルを構築
 *    - quality vs pressureDeltaHpa
 *    - quality vs temperatureC
 *    - quality vs humidity
 *    - quality vs moonPhase
 * 2. 各モデルのピアソン相関を計算、|r| >= 0.3 なら信頼度あり
 * 3. 信頼度のあるモデルで予測値を計算、平均を取る
 * 4. 信頼度のないモデルのみの場合は sample fallback
 */
function predictByRegression(
  records: SleepRecord[],
  forecast: WeatherData,
  confidence: "low" | "medium" | "high"
): number {
  const pressureDelta = records.map((r) => r.weather.pressureDeltaHpa);
  const temperatures = records.map((r) => r.weather.temperatureC);
  const humidities = records.map((r) => r.weather.humidity);
  const moonPhases = records.map((r) => r.weather.moonPhase);
  const qualities = records.map((r) => r.quality);

  const predictions: number[] = [];
  const weights: number[] = [];

  // --- Model 1: pressureDeltaHpa ---
  const rPressure = Math.abs(
    calculatePearsonCorrelation(pressureDelta, qualities)
  );
  if (rPressure >= 0.3) {
    const reg = calculateLinearRegression(pressureDelta, qualities);
    if (reg) {
      predictions.push(
        reg.slope * forecast.pressureDeltaHpa + reg.intercept
      );
      weights.push(rPressure);
    }
  }

  // --- Model 2: temperatureC ---
  const rTemp = Math.abs(
    calculatePearsonCorrelation(temperatures, qualities)
  );
  if (rTemp >= 0.3) {
    const reg = calculateLinearRegression(temperatures, qualities);
    if (reg) {
      predictions.push(reg.slope * forecast.temperatureC + reg.intercept);
      weights.push(rTemp);
    }
  }

  // --- Model 3: humidity ---
  const rHum = Math.abs(
    calculatePearsonCorrelation(humidities, qualities)
  );
  if (rHum >= 0.3) {
    const reg = calculateLinearRegression(humidities, qualities);
    if (reg) {
      predictions.push(reg.slope * forecast.humidity + reg.intercept);
      weights.push(rHum);
    }
  }

  // --- Model 4: moonPhase ---
  const rMoon = Math.abs(
    calculatePearsonCorrelation(moonPhases, qualities)
  );
  if (rMoon >= 0.25) {
    const reg = calculateLinearRegression(moonPhases, qualities);
    if (reg) {
      // moonPhase は 0..1 スケール。0.5 を中心に傾斜
      predictions.push(
        reg.slope * (forecast.moonPhase - 0.5) + reg.intercept
      );
      weights.push(rMoon);
    }
  }

  // 予測値がなければ sample fallback
  if (predictions.length === 0) {
    return generateSamplePrediction(forecast);
  }

  // 重み付き平均
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const weighted = predictions.reduce(
    (acc, pred, i) => acc + pred * weights[i],
    0
  );
  return weighted / sumWeights;
}
```

### 3.3 `generateSamplePrediction()` — サンプル予測

```typescript
/**
 * 気象データから簡易的なサンプル予測を生成する。
 * 線形回帰にデータが不足している場合や、デバッグ時に使用。
 *
 * ルール:
 * - 基準: quality 3.0 (普通)
 * - 気圧が 3hPa 以上下: -0.4 (かなり悪くなる)
 * - 気圧が 3hPa 以上上: +0.3
 * - 気温が 25°C 以上: -0.2 (暑い)
 * - 気温が 10°C 以下: -0.1 (寒い)
 * - 湿度が 70% 以上: -0.15 (蒸し蒸し)
 * - 満月前後 (0.45〜0.55): -0.25
 * - 新月前後 (0.0〜0.1 or 0.9〜1.0): -0.1
 */
function generateSamplePrediction(forecast: WeatherData): number {
  let quality = 3.0;

  // 気圧
  if (forecast.pressureDeltaHpa <= -3) {
    quality -= 0.4;
  } else if (forecast.pressureDeltaHpa >= 3) {
    quality += 0.3;
  }

  // 気温
  if (forecast.temperatureC >= 25) {
    quality -= 0.2;
  } else if (forecast.temperatureC <= 10) {
    quality -= 0.1;
  }

  // 湿度
  if (forecast.humidity >= 70) {
    quality -= 0.15;
  }

  // 月齢
  if (forecast.moonPhase >= 0.45 && forecast.moonPhase <= 0.55) {
    quality -= 0.25;
  } else if (
    forecast.moonPhase < 0.1 ||
    forecast.moonPhase > 0.9
  ) {
    quality -= 0.1;
  }

  return quality;
}
```

### 3.4 `identifyFactors()` — 主要因判定

```typescript
/**
 * 明日の気象と過去データから、主要因を最大 2 個識別する。
 * 優先度: pressure_drop > full_moon > temperature > humidity > neutral
 */
function identifyFactors(
  records: SleepRecord[],
  forecast: WeatherData
): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  // --- 気圧が 3hPa 以上下降 (最優先) ---
  if (forecast.pressureDeltaHpa <= -3) {
    factors.push("pressure_drop");
  } else if (forecast.pressureDeltaHpa >= 3) {
    factors.push("pressure_rise");
  }

  // 既に 2 個あれば終了 (優先度順)
  if (factors.length >= 2) return factors;

  // --- 満月前後 ---
  if (forecast.moonPhase >= 0.45 && forecast.moonPhase <= 0.55) {
    factors.push("full_moon");
    if (factors.length >= 2) return factors;
  } else if (forecast.moonPhase < 0.1 || forecast.moonPhase > 0.9) {
    factors.push("new_moon");
    if (factors.length >= 2) return factors;
  }

  // --- 気温が過去平均より 3°C 以上異なる ---
  if (records.length > 0) {
    const avgTemp =
      records.reduce((sum, r) => sum + r.weather.temperatureC, 0) /
      records.length;
    if (forecast.temperatureC >= avgTemp + 3) {
      factors.push("high_temperature");
      if (factors.length >= 2) return factors;
    } else if (forecast.temperatureC <= avgTemp - 3) {
      factors.push("low_temperature");
      if (factors.length >= 2) return factors;
    }
  }

  // --- 湿度が 70% 以上 ---
  if (forecast.humidity >= 70) {
    factors.push("high_humidity");
    if (factors.length >= 2) return factors;
  }

  // 要因がなければ neutral
  if (factors.length === 0) {
    factors.push("neutral");
  }

  return factors;
}
```

### 3.5 `generateFactorDescription()` — 主要因の説明

```typescript
/**
 * factors 配列から日本語の説明を生成 (最大 80 字)。
 */
function generateFactorDescription(
  factors: PredictionFactor[],
  forecast: WeatherData
): string {
  if (factors.length === 0 || factors[0] === "neutral") {
    return "特に顕著な気象変化はありません。";
  }

  const descriptions: Record<PredictionFactor, string> = {
    pressure_drop: `気圧が ${Math.abs(Math.round(forecast.pressureDeltaHpa * 10) / 10)}hPa 低下する予想。`,
    pressure_rise: `気圧が ${Math.round(forecast.pressureDeltaHpa * 10) / 10}hPa 上昇する予想。`,
    full_moon: "満月の前後で月の引力の影響が考えられます。",
    new_moon: "新月周辺で睡眠が浅くなりやすい傾向。",
    high_temperature: `気温が ${Math.round(forecast.temperatureC)}°C まで上がる予想。`,
    low_temperature: `気温が ${Math.round(forecast.temperatureC)}°C まで下がる予想。`,
    high_humidity: `湿度が ${forecast.humidity}% に達する予想。`,
    neutral: "特に顕著な気象変化はありません。",
  };

  // 第 1 要因と第 2 要因を組み合わせ (長さ 80 字以内)
  let desc = descriptions[factors[0]];
  if (factors.length >= 2 && factors[1] !== "neutral") {
    const second = descriptions[factors[1]];
    if ((desc + second).length <= 80) {
      desc = desc.slice(0, -1) + "、" + second;
    }
  }

  return desc.length > 80 ? desc.slice(0, 80) : desc;
}
```

### 3.6 `generateAdvice()` — アドバイス生成

```typescript
/**
 * 予測品質と主要因からアドバイスを生成する。
 * severity 別に複数返す (UI は最初の 2 個を表示)。
 *
 * ロジック:
 * - 予測値が 2.0 以下: warning "早めの就寝を推奨" など
 * - 主要因が pressure_drop / full_moon: warning
 * - その他: info, positive
 */
function generateAdvice(
  predictedQuality: number,
  factors: PredictionFactor[],
  forecast: WeatherData,
  records: SleepRecord[]
): { severity: "info" | "warning" | "positive"; text: string }[] {
  const advice: { severity: "info" | "warning" | "positive"; text: string }[] =
    [];

  // --- 予測が 2.0 以下: 警告 ---
  if (predictedQuality <= 2.0) {
    advice.push({
      severity: "warning",
      text: "眠りが浅くなると予想されます。寝る 1 時間前からスマホを避けてください。",
    });
  } else if (predictedQuality >= 4.5) {
    advice.push({
      severity: "positive",
      text: "明日は良好な睡眠が期待できます。いつも通りのルーティンで過ごしましょう。",
    });
  }

  // --- 気圧が 3hPa 以上低下: 警告 ---
  if (
    factors.includes("pressure_drop") ||
    forecast.pressureDeltaHpa <= -3
  ) {
    advice.push({
      severity: "warning",
      text: "気圧低下に備え、就寝 2 時間前から light な運動がおすすめです。",
    });
  }

  // --- 満月: 情報提供 ---
  if (factors.includes("full_moon")) {
    advice.push({
      severity: "info",
      text: "満月周辺です。いつもより 30 分早めの就寝を試してみてください。",
    });
  }

  // --- 気温が高い: 対策案 ---
  if (factors.includes("high_temperature") && forecast.temperatureC >= 25) {
    advice.push({
      severity: "info",
      text: "気温が高いので、就寝 1 時間前から室温を 18〜20°C に冷やすと良好です。",
    });
  }

  // --- 湿度が高い: 対策案 ---
  if (factors.includes("high_humidity") && forecast.humidity >= 70) {
    advice.push({
      severity: "info",
      text: "湿度が高いため、除湿機や窓の空気循環で環境を整えてください。",
    });
  }

  // --- データが不足している場合の汎用アドバイス ---
  if (records.length < 7) {
    advice.push({
      severity: "info",
      text: "データを 7 日分集めると、より正確な予測ができます。毎朝記録してみましょう。",
    });
  }

  // 重複排除、最大 3 個に制限
  const uniqueAdvice = Array.from(
    new Map(advice.map((a) => [a.text, a])).values()
  ).slice(0, 3);

  return uniqueAdvice.length > 0
    ? uniqueAdvice
    : [
        {
          severity: "info",
          text: "毎日の記録を続けて、あなた独自の睡眠パターンを発見しましょう。",
        },
      ];
}
```

### 3.7 `calculateContinuousRecordBadge()` — 連続記録バッジ

```typescript
/**
 * 最長連続記録日数からバッジレベルを決定する。
 * correlation.ts の calculateStats() の longestStreak を使用。
 */
export function calculateContinuousRecordBadge(
  longestStreak: number
): ContinuousRecordBadge {
  let level: "bronze" | "silver" | "gold" | "platinum" | null = null;
  let displayText = "";

  if (longestStreak >= 100) {
    level = "platinum";
    displayText = `${longestStreak} 日連続記録 🏆`;
  } else if (longestStreak >= 30) {
    level = "gold";
    displayText = `${longestStreak} 日連続記録 🥇`;
  } else if (longestStreak >= 7) {
    level = "silver";
    displayText = `${longestStreak} 日連続記録 🥈`;
  } else if (longestStreak >= 3) {
    level = "bronze";
    displayText = `${longestStreak} 日連続記録 🥉`;
  }
  // longestStreak < 3: level = null, displayText = ""

  return { longestStreak, level, displayText };
}
```

---

## 4. `PredictionCard.tsx` コンポーネント (新規作成)

**ファイル**: `src/components/PredictionCard.tsx`

### 4.1 Props 型定義

```typescript
import type { PredictionResult } from "@/lib/types";

interface PredictionCardProps {
  /** predictTomorrow() の戻り値 */
  prediction: PredictionResult;

  /** カード高さ: "compact" (トップページ) | "full" (ダッシュボード) */
  variant?: "compact" | "full";

  /** className でスタイルをオーバーライド可能にする */
  className?: string;
}
```

### 4.2 レイアウト仕様

#### 4.2.1 "compact" バージョン (トップページ用, 高さ ~200px)

```
┌─────────────────────────────────────┐
│ 明日の眠気レベル (右上: 信頼度バッジ)│
├─────────────────────────────────────┤
│  大きく中央に予測スコア (3.5)          │
│  スコア下: 主要因の短い説明            │
├─────────────────────────────────────┤
│  アドバイス 1 行目 (最初のアドバイス) │
│  [詳しく見る →]                       │
└─────────────────────────────────────┘
```

#### 4.2.2 "full" バージョン (ダッシュボード用, 高さ ~320px)

```
┌─────────────────────────────────────┐
│ 明日の眠気レベル (右上: 信頼度バッジ)│
├─────────────────────────────────────┤
│  大きく中央に予測スコア (3.5)          │
│  スコア下: 主要因の詳しい説明          │
├─────────────────────────────────────┤
│  【アドバイス】                       │
│  ✓ アドバイス 1 (severity に応じた色) │
│  ✓ アドバイス 2 (severity に応じた色) │
├─────────────────────────────────────┤
│ 【このスコアについて】                │
│ - 記録データ: N 日分から計算           │
│ - 信頼度: medium (7 日以上 15 日未満) │
│ - 線形回帰モデルで予測                 │
│ (isSample=true なら:                  │
│  「データが不足しているため参考値です」)│
├─────────────────────────────────────┤
│ 医療免責: 本機能の予測は統計的な        │
│ 参考値であり、診断・治療ではありません。│
└─────────────────────────────────────┘
```

### 4.3 実装詳細

**背景グラデーション**: Tailwind で `bg-gradient-to-br from-[#1d9bf0] to-[#7c4dff]` (青 → 紫)

**スコア表示の背景色**: 予測値で色分け
- 1.0〜2.0: `#ef4444` (赤)
- 2.0〜3.0: `#f97316` (オレンジ)
- 3.0〜4.0: `#facc15` (黄)
- 4.0〜5.0: `#4ade80` (緑)

**信頼度バッジ** (右上):
- "high": `bg-[#4ade80] text-[#0f1117]` + テキスト "高"
- "medium": `bg-[#facc15] text-[#0f1117]` + テキスト "中"
- "low": `bg-[#8b92a5] text-[#0f1117]` + テキスト "低"

**アドバイス項目の左アイコン**:
- severity="warning": `<AlertCircle className="h-4 w-4 text-[#ef4444]" />`
- severity="info": `<Info className="h-4 w-4 text-[#1d9bf0]" />`
- severity="positive": `<CheckCircle className="h-4 w-4 text-[#4ade80]" />`

**モバイル対応**:
- `max-w-screen-md` で幅制限
- コンパクトバージョンは「詳しく見る」リンクでダッシュボードへ遷移
- タップターゲット 44px 以上

### 4.4 実装コード例

```typescript
"use client";

import { AlertCircle, Info, CheckCircle } from "lucide-react";
import type { PredictionResult } from "@/lib/types";

interface PredictionCardProps {
  prediction: PredictionResult;
  variant?: "compact" | "full";
  className?: string;
}

export function PredictionCard({
  prediction,
  variant = "compact",
  className = "",
}: PredictionCardProps) {
  const scoreColor = getScoreColor(prediction.predictedQuality);
  const confidenceColor = getConfidenceColor(prediction.confidence);

  return (
    <div
      className={`
        bg-gradient-to-br from-[#1d9bf0] to-[#7c4dff] rounded-xl p-6
        ${variant === "full" ? "min-h-[320px]" : "min-h-[200px]"}
        ${className}
      `}
    >
      {/* ヘッダー: タイトル + 信頼度バッジ */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-semibold text-lg">明日の眠気レベル</h2>
        <div
          className={`
            text-xs font-bold px-2.5 py-1 rounded-full
            ${confidenceColor.bg} ${confidenceColor.text}
          `}
        >
          {prediction.confidence === "high"
            ? "高"
            : prediction.confidence === "medium"
              ? "中"
              : "低"}
        </div>
      </div>

      {/* スコア表示 */}
      <div className="flex flex-col items-center justify-center py-4">
        <div
          className={`
            text-6xl font-bold tabular-nums
            ${scoreColor}
          `}
        >
          {prediction.predictedQuality.toFixed(1)}
        </div>
        <div className="text-white text-sm mt-2 max-w-xs text-center">
          {prediction.factorDescription}
        </div>
      </div>

      {/* アドバイス */}
      {variant === "full" && prediction.advice.length > 0 && (
        <div className="mt-4 border-t border-white/20 pt-4">
          <h3 className="text-white text-sm font-semibold mb-3">アドバイス</h3>
          {prediction.advice.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2 text-white text-sm">
              {item.severity === "warning" && (
                <AlertCircle className="h-4 w-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
              )}
              {item.severity === "info" && (
                <Info className="h-4 w-4 text-[#1d9bf0] flex-shrink-0 mt-0.5" />
              )}
              {item.severity === "positive" && (
                <CheckCircle className="h-4 w-4 text-[#4ade80] flex-shrink-0 mt-0.5" />
              )}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* サンプルデータ表示 */}
      {prediction.isSample && (
        <div className="mt-4 border-t border-white/20 pt-4 text-white text-xs">
          📊 <strong>参考値:</strong> データが不足しているため、現在の気象傾向
          から推定した値です。
        </div>
      )}

      {/* 医療免責 */}
      <div className="mt-4 border-t border-white/20 pt-3 text-white/70 text-xs leading-tight">
        本予測は統計的な参考値であり、医療診断・治療を目的としたものではありません。体調に不安がある場合は医療機関にご相談ください。
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score <= 2.0) return "text-[#ef4444]";
  if (score <= 3.0) return "text-[#f97316]";
  if (score <= 4.0) return "text-[#facc15]";
  return "text-[#4ade80]";
}

function getConfidenceColor(
  confidence: "low" | "medium" | "high"
): { bg: string; text: string } {
  switch (confidence) {
    case "high":
      return { bg: "bg-[#4ade80]", text: "text-[#0f1117]" };
    case "medium":
      return { bg: "bg-[#facc15]", text: "text-[#0f1117]" };
    case "low":
    default:
      return { bg: "bg-[#8b92a5]", text: "text-[#0f1117]" };
  }
}
```

---

## 5. トップページへの統合 (`src/app/page.tsx`)

### 5.1 予測カード配置

```typescript
"use client";

import { useEffect, useState } from "react";
import { PredictionCard } from "@/components/PredictionCard";
import { ContinuousRecordBadge } from "@/components/ContinuousRecordBadge";
import { getRecords } from "@/lib/storage";
import { predictTomorrow, calculateContinuousRecordBadge } from "@/lib/prediction";
import { fetchWeatherForecast } from "@/lib/weather";
import { getPrefectureByCode } from "@/lib/prefectures";
import type { PredictionResult } from "@/lib/types";

export default function HomePage() {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [badge, setBadge] = useState<ReturnType<typeof calculateContinuousRecordBadge> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrediction = async () => {
      try {
        const records = getRecords();

        // 連続記録バッジを計算
        if (records.length > 0) {
          const stats = calculateStats(records);
          setBadge(calculateContinuousRecordBadge(stats.longestStreak));
        }

        // 予測を計算
        if (records.length > 0) {
          const lastRecord = records[0];
          const prefecture = getPrefectureByCode(lastRecord.prefectureCode);

          if (prefecture) {
            const forecast = await fetchWeatherForecast(
              prefecture.latitude,
              prefecture.longitude
            );
            const result = predictTomorrow(records, forecast);
            setPrediction(result);
          }
        } else {
          // サンプル予測を表示
          // (本来は UI を "記録がありません" に変える)
        }
      } catch (err) {
        console.error("予測計算エラー:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPrediction();
  }, []);

  return (
    <main className="container mx-auto px-4 max-w-screen-md py-6">
      {/* 連続記録バッジ */}
      {badge?.level && <ContinuousRecordBadge badge={badge} className="mb-4" />}

      {/* 予測カード */}
      {loading ? (
        <div className="bg-[#1a1f2e] rounded-xl p-6 text-center text-[#8b92a5]">
          読み込み中...
        </div>
      ) : prediction ? (
        <PredictionCard prediction={prediction} variant="compact" className="mb-6" />
      ) : null}

      {/* 既存のコンテンツ */}
      {/* ... */}
    </main>
  );
}
```

### 5.2 ダッシュボード上部への配置

```typescript
// src/app/dashboard/page.tsx のコンポーネント内で

{prediction && (
  <PredictionCard prediction={prediction} variant="full" className="mb-8" />
)}
```

---

## 6. `ContinuousRecordBadge.tsx` コンポーネント (新規作成)

**ファイル**: `src/components/ContinuousRecordBadge.tsx`

```typescript
"use client";

import type { ContinuousRecordBadge as BadgeType } from "@/lib/types";

interface ContinuousRecordBadgeProps {
  badge: BadgeType;
  className?: string;
}

export function ContinuousRecordBadge({
  badge,
  className = "",
}: ContinuousRecordBadgeProps) {
  if (!badge.level) return null;

  const bgColor: Record<"bronze" | "silver" | "gold" | "platinum", string> = {
    bronze: "bg-[#cd7f32]",
    silver: "bg-[#c0c0c0]",
    gold: "bg-[#ffd700]",
    platinum: "bg-[#e5e4e2]",
  };

  const textColor: Record<"bronze" | "silver" | "gold" | "platinum", string> = {
    bronze: "text-white",
    silver: "text-[#0f1117]",
    gold: "text-[#0f1117]",
    platinum: "text-[#0f1117]",
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-4 py-2
        ${bgColor[badge.level]} ${textColor[badge.level]}
        rounded-full font-bold text-sm
        ${className}
      `}
    >
      {badge.displayText}
    </div>
  );
}
```

---

## 7. テストケース (`src/lib/__tests__/prediction.test.ts`)

**最低限のテストリスト**:

```typescript
describe("predictTomorrow", () => {
  // 1. 7日未満データ → サンプル予測、isSample=true
  test("returns sample prediction when records < 7");

  // 2. 7日以上データ + 気圧急低下 → warning アドバイス
  test("returns warning advice on pressure drop");

  // 3. 予測値が 1.0〜5.0 のクランプ内
  test("clamps predicted quality to 1.0-5.0");

  // 4. 空配列 → サンプル予測
  test("handles empty records array");

  // 5. 信頼度が正しく計算される
  test("confidence='low' when records < 7");
  test("confidence='medium' when 7 <= records < 15");
  test("confidence='high' when records >= 15");

  // 6. 主要因が最大 2 個
  test("identifies max 2 factors");

  // 7. 主要因の説明が 80 字以内
  test("factor description is <= 80 chars");

  // 8. アドバイスが空配列でない
  test("always returns at least 1 advice");
});

describe("calculateContinuousRecordBadge", () => {
  // 1. streak < 3 → level=null
  test("returns null level when streak < 3");

  // 2. 3 <= streak < 7 → bronze
  test("returns 'bronze' for 3-6 day streak");

  // 3. 7 <= streak < 30 → silver
  test("returns 'silver' for 7-29 day streak");

  // 4. 30 <= streak < 100 → gold
  test("returns 'gold' for 30-99 day streak");

  // 5. streak >= 100 → platinum
  test("returns 'platinum' for 100+ day streak");

  // 6. displayText に正しい日数が含まれる
  test("displayText includes streak count");
});

describe("identifyFactors", () => {
  // 1. pressureDeltaHpa <= -3 → pressure_drop
  test("identifies pressure_drop");

  // 2. moonPhase 0.45-0.55 → full_moon
  test("identifies full_moon");

  // 3. factors.length <= 2
  test("limits factors to 2");

  // 4. 要因がなければ neutral
  test("returns 'neutral' when no factors");
});

describe("generateAdvice", () => {
  // 1. predictedQuality <= 2.0 → warning
  test("returns warning for quality <= 2.0");

  // 2. predictedQuality >= 4.5 → positive
  test("returns positive for quality >= 4.5");

  // 3. データ 7 日未満 → "毎日記録してみましょう"
  test("includes data collection advice for < 7 records");

  // 4. 最大 3 個のアドバイス
  test("limits advice to 3 items");
});
```

---

## 8. 受け入れ基準チェックリスト

- [ ] 1 週間分のダミーデータを入れると予測が表示される
- [ ] 予測値が常に 1.0〜5.0 の範囲内
- [ ] 主要因が日本語で表示される (例: "気圧が 3.2hPa 低下する予想。")
- [ ] アドバイスが表示される (最初の 2 個)
- [ ] 記録が 7 日未満でもサンプル予測が表示される (`isSample=true`)
- [ ] 連続記録バッジが正しく計算される (3/7/30/100 日の閾値)
- [ ] 医療免責: 「診断ではありません」が小さく表示される
- [ ] トップページとダッシュボードの両方に予測カードが表示される
- [ ] モバイル (375px) で横スクロールなし、レイアウト崩れなし
- [ ] `npm run build` と `npm run lint` がエラー・警告ゼロ

---

## 9. デバッグ・ローカルテストのコマンド

```bash
# 型チェック
npm run tsc

# ビルド
npm run build

# lint
npm run lint

# dev サーバ起動
npm run dev

# ユニットテスト (Vitest)
npm run test

# テスト カバレッジ
npm run test -- --coverage
```

---

## 10. 関連ファイル一覧

| ファイル | 作成/変更 | 説明 |
|---------|---------|------|
| `src/lib/types.ts` | 追記 | `PredictionResult`, `PredictionFactor`, `ContinuousRecordBadge` 型追加 |
| `src/lib/prediction.ts` | **新規** | 予測ロジック全実装 |
| `src/lib/weather.ts` | 追記 | `fetchWeatherForecast()`, `mapOpenMeteoDailyToWeather()` 追加 |
| `src/app/api/weather/route.ts` | 変更 | `forecast=true` パラメータ対応 |
| `src/components/PredictionCard.tsx` | **新規** | 予測表示用カードコンポーネント |
| `src/components/ContinuousRecordBadge.tsx` | **新規** | 連続記録バッジコンポーネント |
| `src/app/page.tsx` | 変更 | 予測カード + バッジを配置 |
| `src/app/dashboard/page.tsx` | 変更 | 予測カードを full 版で配置 |
| `src/lib/__tests__/prediction.test.ts` | **新規** | ユニットテスト (最低 8 テストケース) |

---

## 11. 実装順序 (Generator 向けガイド)

1. **`src/lib/types.ts`**: 型定義を追記
2. **`src/lib/prediction.ts`**: 全関数を実装 (テストなし)
3. **`src/lib/weather.ts` + `src/app/api/weather/route.ts`**: 気象予報対応
4. **`src/components/PredictionCard.tsx`**: カードコンポーネント実装
5. **`src/components/ContinuousRecordBadge.tsx`**: バッジコンポーネント実装
6. **`src/app/page.tsx` + `src/app/dashboard/page.tsx`**: 配置
7. **`src/lib/__tests__/prediction.test.ts`**: テスト実装 + `npm run test`
8. **動作確認**: `npm run dev` でトップ・ダッシュボードを確認
9. **ビルド確認**: `npm run build` + `npm run lint`

---

## 12. 既知の制約・注意事項

- **Open-Meteo の daily データ**: `forecast_days=2` で「今日と明日」の 2 日分を取得。インデックス 1 が明日。
- **気圧差の補完**: 予報では「24h 前」が持てないため、「前日最高気圧 - 明日最低気圧」で補完。
- **月齢計算**: 常に計算日 (明日) を基準に `suncalc.getMoonIllumination()` を呼ぶ。
- **エッジケース**: records.length=0 時はサンプル予測のみ。線形回帰は不可。
- **UI 優先度**: アドバイスは最初の 2 個のみ表示。完全なリスト表示は将来機能。

---

## 13. 参考: デモデータでの動作確認フロー

```
1. localStorage をクリア
2. 本来なら 7 日分データを手入力 (30 秒 × 7 = 210 秒)
   → 時間短縮: JS console で DEMO_RECORDS を import して
     setRecords(DEMO_RECORDS) で注入
3. トップページを開く
   → 予測カードが compact で表示 ✓
   → 連続記録バッジが表示 ✓
4. ダッシュボードを開く
   → 予測カードが full で表示 ✓
   → アドバイス 2 個が表示 ✓
5. devtools で /api/weather?lat=X&lon=Y&forecast=true を叩く
   → 明日の WeatherData が JSON で返される ✓
6. npm run test で 8 テストケース通る ✓
```


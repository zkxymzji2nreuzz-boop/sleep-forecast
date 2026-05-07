/**
 * SleepForecast 明日の予測ロジック (F004)。
 *
 * - 線形回帰による睡眠品質予測 (7 日以上)
 * - サンプル予測 (7 日未満)
 * - 主要因判定と説明文生成
 * - アドバイス生成
 * - 連続記録バッジ計算
 */

import type {
  SleepRecord,
  WeatherData,
  PredictionResult,
  PredictionFactor,
  ContinuousRecordBadge,
} from "./types";
import {
  calculateLinearRegression,
  calculatePearsonCorrelation,
} from "./correlation";

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
    predictedQuality = predictByRegression(validRecords, forecastData);
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
    breakdown: computeBreakdown(validRecords, forecastData),
  };
}

/**
 * 過去データから線形回帰モデルを構築し、明日の気象で予測。
 *
 * ロジック:
 * 1. 4 つの単回帰モデルを構築
 *    - quality vs pressureDeltaHpa
 *    - quality vs temperatureC
 *    - quality vs humidity
 *    - quality vs moonPhase
 * 2. 各モデルのピアソン相関を計算、|r| >= 0.3 (moonPhase >= 0.25) なら信頼度あり
 * 3. 信頼度のあるモデルで予測値を計算、重み付き平均を取る
 * 4. 信頼度のないモデルのみの場合は sample fallback
 */
function predictByRegression(
  records: SleepRecord[],
  forecast: WeatherData
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

/**
 * factors 配列から日本語の説明を生成 (最大 80 字)。
 */
function generateFactorDescription(
  factors: PredictionFactor[],
  forecast: WeatherData
): string {
  if (factors.length === 0 || factors[0] === "neutral") {
    return "特に顕著な気象変化はありません";
  }

  const descriptions: Record<PredictionFactor, string> = {
    pressure_drop: `気圧が ${Math.abs(Math.round(forecast.pressureDeltaHpa * 10) / 10)}hPa 低下する予想`,
    pressure_rise: `気圧が ${Math.round(forecast.pressureDeltaHpa * 10) / 10}hPa 上昇する予想`,
    full_moon: "満月の前後で月の引力の影響が考えられます",
    new_moon: "新月周辺で睡眠が浅くなりやすい傾向",
    high_temperature: `気温が ${Math.round(forecast.temperatureC)}°C まで上がる予想`,
    low_temperature: `気温が ${Math.round(forecast.temperatureC)}°C まで下がる予想`,
    high_humidity: `湿度が ${forecast.humidity}% に達する予想`,
    neutral: "特に顕著な気象変化はありません",
  };

  // 第 1 要因と第 2 要因を組み合わせ (長さ 80 字以内)
  let desc = descriptions[factors[0]];
  if (factors.length >= 2 && factors[1] !== "neutral") {
    const second = descriptions[factors[1]];
    if ((desc + "、" + second).length <= 80) {
      desc = desc + "、" + second;
    }
  }

  return desc.length > 80 ? desc.slice(0, 80) : desc;
}

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
      text: "眠りが浅くなると予想されます、寝る 1 時間前からスマホを避けてください。",
    });
  } else if (predictedQuality >= 4.5) {
    advice.push({
      severity: "positive",
      text: "明日は良好な睡眠が期待できます いつも通りのルーティンで過ごしましょう。",
    });
  }

  // --- 気圧が 3hPa 以上低下: 警告 ---
  if (
    factors.includes("pressure_drop") ||
    forecast.pressureDeltaHpa <= -3
  ) {
    advice.push({
      severity: "warning",
      text: "気圧低下に備え、就寝 2 時間前から軽めのストレッチや散歩がおすすめです。",
    });
  }

  // --- 満月: 情報提供 ---
  if (factors.includes("full_moon")) {
    advice.push({
      severity: "info",
      text: "満月周辺です いつもより 30 分早めの就寝を試してみてください。",
    });
  }

  // --- 気温が高い: 対策案 ---
  if (factors.includes("high_temperature") && forecast.temperatureC >= 25) {
    advice.push({
      severity: "info",
      text: "気温が高いので、就寝 1 時間前から室温を 18〜20°C に冷やすと良好です",
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
      text: "データを 7 日分集めると、より正確な予測ができます 毎朝記録してみましょう。",
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
          text: "毎日の記録を続けて、あなた独自の睡眠パターンを発見しましょう",
        },
      ];
}

/**
 * 気象要素ごとの予測スコア内訳を計算する。
 * 各要素が睡眠スコアにどれだけ寄与するかをサンプル予測ルールに基づいて推定。
 * (線形回帰モードでも同様にルールベースの寄与量を返す—参考値として活用)
 */
function computeBreakdown(
  records: SleepRecord[],
  forecast: WeatherData
): PredictionResult["breakdown"] {
  type Severity = "bad" | "neutral" | "good";
  const items: NonNullable<PredictionResult["breakdown"]>["items"] = [];

  // ── 気圧変化 ──
  const dp = forecast.pressureDeltaHpa;
  let pressureContrib = 0;
  let pressureSeverity: Severity = "neutral";
  if (dp <= -5) {
    pressureContrib = -0.8;
    pressureSeverity = "bad";
  } else if (dp <= -3) {
    pressureContrib = -0.4;
    pressureSeverity = "bad";
  } else if (dp >= 3) {
    pressureContrib = +0.3;
    pressureSeverity = "good";
  }
  items.push({
    label: "気圧変化",
    value: `${dp >= 0 ? "+" : ""}${dp.toFixed(1)} hPa`,
    contrib: pressureContrib,
    severity: pressureSeverity,
  });

  // ── 月齢 ──
  let moonContrib = 0;
  let moonSeverity: Severity = "neutral";
  let moonLabel = "月齢";
  if (forecast.moonPhase >= 0.45 && forecast.moonPhase <= 0.55) {
    moonContrib = -0.25;
    moonSeverity = "bad";
    moonLabel = "月齢（満月）";
  } else if (forecast.moonPhase < 0.1 || forecast.moonPhase > 0.9) {
    moonContrib = -0.1;
    moonSeverity = "bad";
    moonLabel = "月齢（新月）";
  }
  const moonPct = Math.round(forecast.moonIllumination * 100);
  items.push({
    label: moonLabel,
    value: `照度 ${moonPct}%`,
    contrib: moonContrib,
    severity: moonSeverity,
  });

  // ── 気温 ──
  let tempContrib = 0;
  let tempSeverity: Severity = "neutral";
  if (forecast.temperatureC >= 25) {
    tempContrib = -0.2;
    tempSeverity = "bad";
  } else if (forecast.temperatureC <= 10) {
    tempContrib = -0.1;
    tempSeverity = "bad";
  } else if (
    records.length > 0 &&
    forecast.temperatureC >=
      records.reduce((s, r) => s + r.weather.temperatureC, 0) / records.length - 1 &&
    forecast.temperatureC <=
      records.reduce((s, r) => s + r.weather.temperatureC, 0) / records.length + 1
  ) {
    // 過去平均に近い気温は微プラス
    tempContrib = +0.1;
    tempSeverity = "good";
  }
  items.push({
    label: "気温",
    value: `${forecast.temperatureC.toFixed(1)}°C`,
    contrib: tempContrib,
    severity: tempSeverity,
  });

  // ── 湿度 ──
  let humidContrib = 0;
  let humidSeverity: Severity = "neutral";
  if (forecast.humidity >= 70) {
    humidContrib = -0.15;
    humidSeverity = "bad";
  } else if (forecast.humidity >= 50 && forecast.humidity < 70) {
    humidContrib = 0;
    humidSeverity = "neutral";
  } else if (forecast.humidity < 40) {
    humidContrib = -0.05;
    humidSeverity = "bad";
  } else {
    humidContrib = +0.05;
    humidSeverity = "good";
  }
  items.push({
    label: "湿度",
    value: `${forecast.humidity}%`,
    contrib: humidContrib,
    severity: humidSeverity,
  });

  return { items };
}

/**
 * 最長連続記録日数からバッジレベルを決定する。
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

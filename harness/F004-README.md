# F004 実装ガイド — Generator (Opus) 向け

**このドキュメントは何?**  
`F004-SPEC.md` の 📋 実装チェックリスト版。コーディング開始前に必ず読んでください。

---

## 🎯 F004 の目標

**明日の睡眠品質を 1.0〜5.0 で予測する機能を実装する**

- ✅ 過去 7 日以上のデータ → 線形回帰で科学的に予測
- ✅ 過去 7 日未満 → デモ値で予測 (isSample=true)
- ✅ 主要因を日本語で説明 (「気圧が 3.2hPa 低下」など)
- ✅ アドバイスを 3 個まで提示 (warning/info/positive)
- ✅ 連続記録バッジ (3/7/30/100 日)
- ✅ 医療免責注記を常時表示

---

## 📋 実装チェックリスト (順序厳守)

### Phase 1: 型定義 (30 分)

**ファイル**: `src/lib/types.ts` に 以下の型を **追記**

```typescript
// === 追記するもの ===

// 1️⃣ PredictionFactor (enum 的な union)
export type PredictionFactor =
  | "pressure_drop" | "pressure_rise"
  | "full_moon" | "new_moon"
  | "high_temperature" | "low_temperature"
  | "high_humidity" | "neutral";

// 2️⃣ PredictionResult (メイン返り値)
export type PredictionResult = {
  predictedQuality: number;      // 1.0-5.0
  confidence: "low" | "medium" | "high";
  factors: PredictionFactor[];   // 最大 2 個
  factorDescription: string;     // 80 字以内
  advice: { severity: "info" | "warning" | "positive"; text: string }[];
  isSample: boolean;             // 7日未満なら true
  dataPointCount: number;        // 使用した実データ件数
};

// 3️⃣ ContinuousRecordBadge (連続記録バッジ)
export type ContinuousRecordBadge = {
  longestStreak: number;
  level: "bronze" | "silver" | "gold" | "platinum" | null;
  displayText: string;           // 例: "7 日連続記録 🥈"
};
```

**確認**: `npm run tsc` でエラーなし

---

### Phase 2: 気象 API 拡張 (45 分)

**ファイル A**: `src/lib/weather.ts` に追記

```typescript
// 1️⃣ 新関数: fetchWeatherForecast(lat, lon)
// → /api/weather?lat=X&lon=Y&forecast=true を呼ぶ
// → WeatherData を返す

// 2️⃣ 新関数: mapOpenMeteoDailyToWeather(daily, dayIndex, baseDate)
// → Open-Meteo の daily レスポンスの[dayIndex]をWeatherData に変換
// → 気温: min/max 平均
// → 湿度: max
// → 気圧差: min - 前日max
// → 月齢: 計算日を baseDate + dayIndex
```

**ファイル B**: `src/app/api/weather/route.ts` を 変更

```typescript
// 変更内容:
// 1️⃣ parseLatLon() の後に parseForecast() 関数を追加
//    → searchParams.get("forecast") === "true" で判定

// 2️⃣ GET() 内で isForecast の分岐を追加
//    if (isForecast) {
//      → daily, forecast_days=2 を Open-Meteo に渡す
//      → mapOpenMeteoDailyToWeather(daily, 1, now) を呼ぶ
//      → Cache-Control: s-maxage=3600 (1時間キャッシュ)
//    } else {
//      → 既存の current ロジック (変更不要)
//    }
```

**確認**: `npm run dev` で `GET /api/weather?lat=35.6895&lon=139.6917&forecast=true` を手動テスト

---

### Phase 3: 予測ロジック (90 分)

**ファイル**: `src/lib/prediction.ts` (**新規作成**)

**実装順序**:

```typescript
// ✅ 1️⃣ predictTomorrow(records, forecastData, useLinearRegression?)
//    ├─ 記録 7件以上 → confidence 判定 (low/medium/high)
//    ├─ useLinearRegression=true かつ confidence!="low" → 線形回帰
//    └─ 記録 7件未満 OR 回帰失敗 → サンプル予測 (isSample=true)

// ✅ 2️⃣ predictByRegression(records, forecast, confidence)
//    ├─ 4つの単回帰モデルを構築
//    │  ├─ quality vs pressureDeltaHpa
//    │  ├─ quality vs temperatureC
//    │  ├─ quality vs humidity
//    │  └─ quality vs moonPhase
//    ├─ ピアソン相関 |r| >= 0.3 をフィルタ
//    └─ 信頼度加重平均で予測

// ✅ 3️⃣ generateSamplePrediction(forecastData)
//    基準: quality = 3.0
//    調整:
//    ├─ pressureDeltaHpa <= -3: -0.4
//    ├─ pressureDeltaHpa >= 3: +0.3
//    ├─ temperatureC >= 25: -0.2
//    ├─ temperatureC <= 10: -0.1
//    ├─ humidity >= 70: -0.15
//    ├─ moonPhase 0.45-0.55: -0.25
//    └─ moonPhase <0.1 or >0.9: -0.1

// ✅ 4️⃣ identifyFactors(records, forecast)
//    優先度: pressure_drop > full_moon > temperature > humidity
//    └─ 最大 2 個、要因がなければ neutral

// ✅ 5️⃣ generateFactorDescription(factors, forecast)
//    80 字以内の日本語。例:
//    "気圧が 3.2hPa 低下する予想、湿度が 72% に達する予想。"

// ✅ 6️⃣ generateAdvice(quality, factors, forecast, records)
//    複数のアドバイス生成、最大 3 個
//    ├─ quality <= 2.0: warning "早めの就寝を推奨"
//    ├─ quality >= 4.5: positive "いつも通りで良好"
//    ├─ pressure_drop: warning "就寝2時間前から軽い運動"
//    ├─ full_moon: info "30分早めの就寝を試して"
//    ├─ high_temperature: info "室温18-20℃に冷やす"
//    ├─ high_humidity: info "除湿機で環境整備"
//    └─ records < 7: info "7日分集めるとより正確"

// ✅ 7️⃣ calculateContinuousRecordBadge(longestStreak)
//    streak >= 100: platinum, >= 30: gold, >= 7: silver, >= 3: bronze
//    return { longestStreak, level, displayText }
```

**確認**: `npm run tsc` でエラーなし

---

### Phase 4: UI コンポーネント (60 分)

#### 4A. `PredictionCard.tsx` (**新規作成**)

**Props**:
```typescript
{
  prediction: PredictionResult;
  variant?: "compact" | "full";  // compact: トップページ, full: ダッシュボード
  className?: string;
}
```

**compact (トップページ用)**:
```
┌────────────────────────┐
│ 明日の眠気レベル      [信頼度]│
├────────────────────────┤
│      3.5               │
│   主要因の説明         │
├────────────────────────┤
│ アドバイス 1 行        │
│ [詳しく見る →]         │
└────────────────────────┘
```

**full (ダッシュボード用)**:
```
┌────────────────────────┐
│ 明日の眠気レベル      [信頼度]│
├────────────────────────┤
│      3.5               │
│   主要因の詳しい説明   │
├────────────────────────┤
│【アドバイス】          │
│ ⚠ アドバイス 1        │
│ ℹ アドバイス 2        │
├────────────────────────┤
│【このスコアについて】  │
│ - 記録データ: 12 日分  │
│ - 信頼度: high         │
├────────────────────────┤
│医療免責: ...           │
└────────────────────────┘
```

**スタイル**:
- 背景: `bg-gradient-to-br from-[#1d9bf0] to-[#7c4dff]`
- スコア色: quality で色分け (赤→オレンジ→黄→緑)
- アイコン: lucide-react `AlertCircle` / `Info` / `CheckCircle`

**確認**: `npm run build` でエラーなし

---

#### 4B. `ContinuousRecordBadge.tsx` (**新規作成**)

```typescript
{
  badge: ContinuousRecordBadge;
  className?: string;
}
```

**表示例**: `[🥈 7 日連続記録]` (銀バッジ)

**バッジ色**:
- bronze: `bg-[#cd7f32]`
- silver: `bg-[#c0c0c0]`
- gold: `bg-[#ffd700]`
- platinum: `bg-[#e5e4e2]`

---

### Phase 5: ページへの配置 (30 分)

**5A. `src/app/page.tsx`** (トップページ)

```typescript
"use client";

// useEffect で以下を実行:
// 1. getRecords() で記録を取得
// 2. calculateStats() で stats.longestStreak を得る
// 3. calculateContinuousRecordBadge(stats.longestStreak) でバッジ生成
// 4. 最新レコードの都道府県から fetchWeatherForecast() で明日の気象を取得
// 5. predictTomorrow(records, forecast) で予測計算
// 6. <PredictionCard prediction={prediction} variant="compact" /> で表示

// レイアウト:
// <main className="container mx-auto px-4 max-w-screen-md py-6">
//   {badge?.level && <ContinuousRecordBadge badge={badge} />}
//   <PredictionCard prediction={prediction} variant="compact" />
//   {既存のトップページコンテンツ}
// </main>
```

**5B. `src/app/dashboard/page.tsx`** (ダッシュボード)

```typescript
// 既存の fetchRecords, fetchPrediction, ... の中で:

// ダッシュボードの上部に:
// <PredictionCard prediction={prediction} variant="full" className="mb-8" />
// を追加
```

---

### Phase 6: テスト実装 (45 分)

**ファイル**: `src/lib/__tests__/prediction.test.ts` (**新規作成**)

**最低 8 テストケース**:

```typescript
describe("predictTomorrow", () => {
  test("returns sample prediction when records < 7");
  test("returns warning advice on pressure drop <= -3");
  test("clamps quality to 1.0-5.0 range");
  test("handles empty records gracefully");
});

describe("confidence levels", () => {
  test("confidence='low' for < 7 records");
  test("confidence='medium' for 7-14 records");
  test("confidence='high' for >= 15 records");
});

describe("factors", () => {
  test("identifies max 2 factors");
  test("factor description is <= 80 chars");
});

describe("continuous badge", () => {
  test("returns correct level for streak counts");
  test("returns null for < 3 day streak");
});
```

**実行**: `npm run test` で全テスト通過

---

### Phase 7: 動作確認 (30 分)

```bash
# 1. ビルド確認
npm run build
npm run lint

# 2. dev サーバ起動
npm run dev

# 3. localhost:3000 でトップページを開く
#    → 予測カード表示 ✓
#    → 連続記録バッジ表示 ✓

# 4. localhost:3000/dashboard でダッシュボードを開く
#    → 予測カード (full版) が上部に表示 ✓
#    → アドバイス 2 個が表示 ✓

# 5. DevTools で iPhone SE (375px) をシミュレート
#    → 横スクロールなし ✓
#    → 全要素が見える ✓

# 6. Node.js console で手動テスト (Optional)
const { predictTomorrow } = await import('/lib/prediction.ts');
const forecast = { temp: 20, ... };
const result = predictTomorrow(records, forecast);
console.log(result);
```

---

## 🚨 よくある落とし穴

| 落とし穴 | 対策 |
|--------|------|
| `fetchWeatherForecast()` が `forecast=true` パラメータを渡し忘れ | API ルートで `searchParams.get("forecast")` をチェック |
| 予測値が 1.0-5.0 にクランプされていない | `Math.max(1.0, Math.min(5.0, value))` で必ずクランプ |
| 月齢計算が「今日」で行われている | `new Date() + dayIndex` で明日を計算してから `getMoonData()` |
| アドバイスが 3 個を超える | `slice(0, 3)` で制限 |
| 医療免責が画面に表示されていない | PredictionCard の下部に必ず表示 |
| iOS/Android で横スクロールが発生 | `max-w-screen-md`, padding, gap を確認 |

---

## 📞 Generator へのお願い

実装中に以下のことをお願いします:

1. **各関数の冒頭にコメント** — JSDoc 形式で責務を明記
2. **console.log の完全削除** — デバッグ終了後に削除
3. **npm run build 2 回** — キャッシュ問題を確認
4. **テストが全て green** — テスト失敗は Evaluator で failing に
5. **PredictionCard の医療免責は必須** — 法務要件

---

## 📎 参考資料

- **F004-SPEC.md** — 詳細な仕様書 (実装時に随時参照)
- **src/lib/correlation.ts** — calculateStats() はここで実装済み
- **src/lib/types.ts** — 既存の WeatherData, SleepRecord を確認

---

**実装完了チェック**:

- [ ] Phase 1: 型定義 (npm run tsc OK)
- [ ] Phase 2: 気象 API (GET /api/weather?...&forecast=true OK)
- [ ] Phase 3: 予測ロジック (npm run tsc OK)
- [ ] Phase 4: UI コンポーネント (npm run build OK)
- [ ] Phase 5: ページ配置 (localhost:3000 表示確認)
- [ ] Phase 6: テスト (npm run test OK)
- [ ] Phase 7: 最終確認 (npm run build && npm run lint OK)

**ステータス**: Generator へ着手を指示可能 ✅

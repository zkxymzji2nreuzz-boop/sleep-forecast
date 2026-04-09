# SleepForecast 補助仕様メモ (Planner Notes)

Generator 向けの補助ノート。feature-list.json の steps を補足する目的で、
ここには「デザイントークン」「共通文言」など横断的な決め事と、
各ステップの補足情報のみを置く。
個別機能の詳細は必ず feature-list.json を正として扱うこと。

## デザイントークン (ダークテーマ固定)

| トークン | 値 | 用途 |
|---|---|---|
| `--background` | `#0f1117` | body / 画面全体の背景 |
| `--card` | `#1a1f2e` | Card コンポーネントの背景 |
| `--accent` | `#1d9bf0` | CTA ボタン / リンク / アクティブナビ |
| `--foreground` | `#e6e8ee` | 本文文字色 |
| `--muted` | `#8b92a5` | 補助文字・プレースホルダー |
| gradient (予測カード) | `from-[#1d9bf0] to-[#7c4dff]` | F004 の PredictionCard 背景 |

Tailwind からは `bg-[#0f1117]` のように任意値で直接参照して可。
shadcn/ui の CSS 変数 (`--background` 等) を上書きする形でもよい。

## 共通文言

### 医療免責 (フッター固定 / 全ページ表示)

```
本サービスは医療行為・診断を目的としたものではありません。
体調に不安がある場合は医療機関にご相談ください。
```

### トップページ H1 / サブコピー

- H1: `明日の眠気を予報する`
- Sub: `気圧・月齢・気温からあなたの睡眠を読み解く`

### メタデータ (layout.tsx)

- `title`: `SleepForecast | 眠れる明日予報`
- `description`: `気温・湿度・気圧・月齢から明日の眠気を予測する、ウェアラブル不要の睡眠予測アプリ`
- `themeColor`: `#0f1117`
- `<html lang="ja">` 固定

## ナビゲーション構成

| ラベル | パス | 実装 STEP |
|---|---|---|
| ホーム | `/` | F001 (本実装) |
| 記録 | `/record` | F001 (スケルトン) / F002 (本実装) |
| ダッシュボード | `/dashboard` | F001 (スケルトン) / F003 (本実装) |
| 設定 | `/settings` | F001 (スケルトン) / F002 (本実装) |
| About | `/about` | F001 (空ルート) / F006 (本実装) |
| Privacy | `/privacy` | F001 (空ルート) / F006 (本実装) |
| Terms | `/terms` | F001 (空ルート) / F006 (本実装) |
| Contact | `/contact` | F001 (空ルート) / F006 (本実装) |
| Articles | `/articles/[slug]` | F005 (本実装) |

F001 ではヘッダーナビに出すのは `ホーム / 記録 / ダッシュボード / 設定` の 4 つだけ。
`/about` 他はフッターリンクから辿れるようにし、ページ本体は F006 で実装する。

## モバイルファースト基準

- 基準幅: 375px (iPhone SE / 12 mini)
- 横スクロールが発生しないこと
- タップターゲットは最低 44x44px
- コンテンツ最大幅: `max-w-screen-md` (768px)
- ヘッダー高さ: 64px、フッター高さ: 64px を目安

## ディレクトリ初期化の注意 (F001)

create-next-app を既存ディレクトリ (harness/ と .claude/ がある) で実行するため、
以下のファイル/ディレクトリは絶対に上書き・削除しないこと:

- `harness/`
- `.claude/`
- `README.md` (既存なら保護。必要なら F007 で上書き)
- `.git/`

create-next-app の上書き確認プロンプトで誤って harness を消さないよう、
先に `ls -la` で現状を確認してから実行する。

---

## F002 補足: 気象 API 連携と記録フォーム

feature-list.json の F002 を補足する横断ノート。実装の正は feature-list.json 側に置き、
ここでは表組みやサンプル JSON など、JSON で持ちにくい情報のみを残す。

### Open-Meteo API パラメータ表

ベース URL: `https://api.open-meteo.com/v1/forecast` (認証不要 / 非商用無料)

| クエリ | 値 | 役割 |
|---|---|---|
| `latitude` | 例 `35.6895` | 都道府県の緯度 (PREFECTURES から取得) |
| `longitude` | 例 `139.6917` | 同経度 |
| `current` | `temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl` | 現在値 4 種を 1 リクエストで取得 |
| `hourly` | `pressure_msl` | 24h 前気圧の参照用 (前日比計算) |
| `past_days` | `1` | hourly に昨日 24h を含める |
| `forecast_days` | `1` | 当日のみ (F004 で 2 に拡張) |
| `timezone` | `Asia/Tokyo` | hourly.time をローカル時刻で返す |
| `windspeed_unit` | `ms` | 将来の拡張用 (任意) |

レスポンスの主要フィールド:

- `current.temperature_2m` (°C)
- `current.relative_humidity_2m` (%)
- `current.surface_pressure` (hPa, 観測点標高)
- `current.pressure_msl` (hPa, 海面更正) ← **記録に使う基準値**
- `hourly.time[]` / `hourly.pressure_msl[]` (24h 分以上)

### 前日比気圧の計算

```
const target = new Date(Date.now() - 24 * 60 * 60 * 1000);
const idx = hourly.time.findIndex((t) => new Date(t).getTime() >= target.getTime());
const past = hourly.pressure_msl[Math.max(0, idx)];
const delta = +(current.pressure_msl - past).toFixed(1); // 小数 1 桁
```

`delta < -3` を「気圧の急低下」しきい値とする (F004 の予測ロジックでも使用)。

### CORS 方針

- ブラウザから `api.open-meteo.com` を直接叩かない
- `src/app/api/weather/route.ts` をプロキシとして経由する
- 利点: (1) CORS 安定、(2) Vercel エッジでキャッシュ可、(3) 将来別 API へ差し替え容易、(4) クライアントから API 仕様を隠蔽
- `Cache-Control: public, s-maxage=600, stale-while-revalidate=1800` で 10 分キャッシュ

### 5 段階評価ラベル対応表

| value | 絵文字 | ラベル | aria-label | 備考 |
|---|---|---|---|---|
| 1 | 😴 | とても悪い | `睡眠品質 1 とても悪い` | 全く眠れなかった / 何度も中途覚醒 |
| 2 | 😐 | 悪い | `睡眠品質 2 悪い` | 寝付き悪い or 浅い |
| 3 | 🙂 | 普通 | `睡眠品質 3 普通` | 平均的 |
| 4 | 😀 | 良い | `睡眠品質 4 良い` | スッキリ目覚めた |
| 5 | 🌟 | とても良い | `睡眠品質 5 とても良い` | 過去最高クラス |

絵文字は装飾扱い (`aria-hidden="true"`)、ラベル文字は SR 用に `sr-only` ではなくボタン直下に表示する (タップで何が選ばれるか目視確認できるよう)。

### localStorage スキーマ (`sleep_records_v1`)

```json
{
  "version": 1,
  "records": [
    {
      "id": "rec_2026-04-10_8f3a",
      "date": "2026-04-10",
      "quality": 3,
      "bedtime": "23:30",
      "wakeTime": "06:45",
      "note": "夜中に一度トイレで目が覚めた",
      "prefectureCode": "13",
      "weather": {
        "temperatureC": 14.2,
        "humidity": 62,
        "pressureHpa": 1008.4,
        "pressureDeltaHpa": -3.7,
        "moonPhase": 0.18,
        "moonIllumination": 0.32,
        "fetchedAt": "2026-04-10T07:12:00+09:00",
        "source": "open-meteo"
      },
      "createdAt": "2026-04-10T07:12:05+09:00",
      "updatedAt": "2026-04-10T07:12:05+09:00"
    }
  ]
}
```

補足:

- `id` は `rec_${date}_${random4}` 形式 (`crypto.randomUUID()` の先頭でも可)
- 同じ `date` は配列内に 1 件まで。`saveRecord` 側で重複排除
- 配列は date 降順でソートして返す (`getRecords`)
- `version` は将来のスキーマ移行のためのフィールド。今は `1` 固定

### Geolocation の都道府県スナップ

- `navigator.geolocation.getCurrentPosition` で `(lat, lon)` 取得
- PREFECTURES 47 件に対してハバーサイン距離を計算し、最小の県をセット
- 精度は「都道府県まで」に丸めることでプライバシーを守る (緯度経度自体は保存しない)
- 拒否・タイムアウト (10s) は select を変更せずトーストで通知

### フォーム UX 順序 (1 画面で完結)

1. 5 段階評価ボタン (必須) ─ 一番上に大きく
2. 都道府県 select (デフォルトプリフィル済み)
3. 任意: 就寝時刻 / 起床時刻 (`<input type="time">` 2 つ並列)
4. 任意: 自由メモ (textarea, 280 字)
5. 送信ボタン (主 CTA, アクセント色, 全幅)
6. 医療免責の小さな注記

---

## F003 refined 仕様: ダッシュボード実装 (STEP 3)

feature-list.json の F003 steps / acceptance_criteria の補足。
実装の決定版は feature-list.json 側に反映済み。
ここでは関数シグネチャ、Chart.js 設定、デモデータ方針などを詳述する。

---

### 前提: 利用する既存 API

| 関数 | 場所 | 用途 |
|---|---|---|
| `getRecords(): SleepRecord[]` | `src/lib/storage.ts` | date 降順の全記録取得 |
| `SleepRecord`, `WeatherData` | `src/lib/types.ts` | 型定義 |

`WeatherData.pressureDeltaHpa` は 24h 気圧変化 (小数 1 桁)。散布図の X 軸に直接使う。

---

### correlation.ts の関数シグネチャ

ファイル: `src/lib/correlation.ts`

**1. calculatePearsonCorrelation**

```
function calculatePearsonCorrelation(xs: number[], ys: number[]): number
```

- xs と ys の長さが異なる、または長さ 2 未満の場合は `NaN` を返す
- 戻り値は -1.0 〜 1.0 の数値 (小数 4 桁程度)
- 入力: `pressureDeltaHpa` の配列と `quality` の配列

**2. calculateLinearRegression**

```
function calculateLinearRegression(
  xs: number[],
  ys: number[]
): { slope: number; intercept: number } | null
```

- 分母がゼロ (全 xs が同値) の場合は `null` を返す
- 戻り値の slope / intercept は浮動小数点のまま (丸めは呼び出し元)

**3. generateInsights**

```
function generateInsights(records: SleepRecord[]): InsightItem[]
```

戻り値の型:

```
type InsightItem = {
  key: string;           // "pressure_drop" | "moon_phase" | "temperature" | "humidity" | "general"
  message: string;       // 表示する日本語文
  severity: "info" | "warning" | "positive";
}
```

インサイト生成ルール (優先度順):

1. **気圧下降相関**: records のうち `pressureDeltaHpa <= -3` の日の平均 quality と、それ以外の平均 quality を比較し、差が 0.5 以上なら警告インサイトを生成する。文例: `「気圧が 3hPa 以上下がる日は、そうでない日と比べて睡眠品質が約 XX% 低下しています」`。XX は `Math.round((1 - lowQuality / normalQuality) * 100)` で計算。
2. **月齢満月前後相関**: `moonPhase` が 0.45〜0.55 (満月前後) の日の平均 quality が全体平均より 0.3 以上低ければ、info インサイトを生成。文例: `「満月の前後 2 日間は睡眠が浅い傾向があります」`
3. **気温相関**: `temperatureC` でソートした上位 25% と下位 25% の平均 quality 差が 0.5 以上なら info を生成。文例: `「気温が高い日ほど眠りが浅い傾向が見られます」`
4. **一般インサイト (records が 5〜9 件)**: `「データが 10 件を超えると、より精度の高い分析ができます」` を severity: info で常に返す。
5. **インサイトなし**: 上記どれも該当しない場合は空配列 `[]` を返す。

**4. calculateStats (新規追加関数)**

```
function calculateStats(records: SleepRecord[]): DashboardStats
```

```
type DashboardStats = {
  avg7Days: number | null;       // 直近 7 日の quality 平均 (小数 1 桁)
  recordCountThisMonth: number;  // 今月 (当月 1 日〜今日) の記録件数
  longestStreak: number;         // 最長連続記録日数
  worstDay: { date: string; quality: number } | null; // 最も quality が低い日
}
```

- `avg7Days`: `getRecords()` の先頭 7 件の quality 平均。7 件未満なら実在件数で割る。0 件なら `null`。
- `recordCountThisMonth`: `date` が当月 (YYYY-MM) に一致する件数。
- `longestStreak`: date 文字列を日付として、前日から連続して記録が続く最長長さ。連続判定は日付差 = 1 日。
- `worstDay`: records 全件中で quality が最小 (同点なら最新 date) のレコード。

---

### デモデータ生成方針

デモモードの判定: `getRecords()` の件数が 0〜9 件のとき、実データと**混在させず**、サンプルデータのみで表示する。10 件以上になった時点でリアルデータに完全切り替え。

デモデータは `src/lib/demoData.ts` (新規ファイル) に定数として定義する。

生成ルール:
- 件数: 30 件固定
- `date`: 今日から遡って 1 日ずつ、`2026-04-10`, `2026-04-09`, ... の形式
- `quality`: `[3, 2, 4, 3, 5, 2, 3, 4, 3, 2, 4, 5, 3, 3, 2, 4, 3, 5, 3, 2, 4, 3, 3, 2, 4, 5, 3, 3, 4, 3]` の固定配列 (先頭が最新)
- `pressureDeltaHpa`: `[0.0, -4.2, 1.1, -1.0, 0.5, -3.8, 0.2, 1.5, 0.0, -5.1, ...]` — 気圧下降日 (<=−3) が 8 件程度含まれる固定配列
- `pressureHpa`: 1005〜1015 の範囲の固定値
- `temperatureC`: 10〜22 の範囲の固定値
- `humidity`: 50〜75 の範囲の固定値
- `moonPhase`: 0.0 から 0.03 刻みで順増加 (0〜1 を循環)
- `moonIllumination`: `Math.sin(moonPhase * Math.PI)` で算出
- `prefectureCode`: `"13"` (東京) 固定
- `source`: `"open-meteo"` 固定

デモデータ表示時はグラフ上部に `「これはサンプルデータです。10 日以上記録するとあなたのデータが表示されます。」` のバナーを表示する。バナー色は `bg-[#1a1f2e] border border-[#1d9bf0]`、テキストは `text-[#8b92a5] text-sm`。

---

### Chart.js グローバル設定

`src/app/dashboard/page.tsx` の先頭 (または別ファイル `src/lib/chartDefaults.ts`) で以下を一度だけ実行:

```
Chart.defaults.color = "#8b92a5";
Chart.defaults.borderColor = "rgba(139, 146, 165, 0.15)";
Chart.defaults.font.family = "'Inter', sans-serif";
```

全チャート共通の `options` ベース:

| オプション | 値 |
|---|---|
| `responsive` | `true` |
| `maintainAspectRatio` | `false` (高さを親要素に追従させる) |
| `animation.duration` | `400` (ms) |
| `plugins.legend.display` | 折れ線: `false`、散布図: `true`、棒グラフ: `false` |
| `plugins.tooltip.backgroundColor` | `"#1a1f2e"` |
| `plugins.tooltip.borderColor` | `"#1d9bf0"` |
| `plugins.tooltip.borderWidth` | `1` |
| `plugins.tooltip.titleColor` | `"#e6e8ee"` |
| `plugins.tooltip.bodyColor` | `"#8b92a5"` |
| `scales.x.grid.color` | `"rgba(139, 146, 165, 0.10)"` |
| `scales.y.grid.color` | `"rgba(139, 146, 165, 0.10)"` |
| `scales.x.ticks.color` | `"#8b92a5"` |
| `scales.y.ticks.color` | `"#8b92a5"` |

---

### 折れ線グラフ (quality 推移)

- データ範囲: `getRecords()` の先頭 30 件 (date 降順) を取得後、**昇順に並び替えて**描画
- X 軸ラベル: `MM/DD` 形式 (例: `04/01`)
- Y 軸: 1〜5 固定、整数目盛り (`stepSize: 1`)、ラベル: `["", "とても悪い", "悪い", "普通", "良い", "とても良い"]` を `callback` で返す
- 線色: `#1d9bf0`、`borderWidth: 2`、点: `pointBackgroundColor: #1d9bf0`、`pointRadius: 4`、`pointHoverRadius: 6`
- `fill: true`、`backgroundColor: "rgba(29, 155, 240, 0.08)"`
- Tooltip: `「2026/04/01 — 品質: 良い (4)」` 形式

### 散布図 (気圧 vs 品質)

- X 軸: `pressureDeltaHpa` (単位: hPa)、ラベル: `「前日比気圧 (hPa)」`、範囲: 自動
- Y 軸: quality 1〜5、整数目盛り
- 点色: quality 値で色分け — 1: `#ef4444`、2: `#f97316`、3: `#facc15`、4: `#4ade80`、5: `#1d9bf0`。各点に `pointBackgroundColor` を配列で指定
- 点サイズ: `pointRadius: 6`、`pointHoverRadius: 8`
- 回帰直線: `calculateLinearRegression` の結果を使い、X 軸の最小値〜最大値の 2 点を結ぶ `type: 'line'` の dataset として重ねる。`borderColor: "rgba(255, 255, 255, 0.3)"`、`borderDash: [4, 4]`、`pointRadius: 0`
- 回帰直線の dataset には `order: 1` を付けて散布点の後ろに描く
- 散布点の dataset には `order: 2`
- Tooltip: `「気圧変化: -3.7 hPa — 品質: 悪い (2)」` 形式

### 気象別平均グラフ (棒グラフ)

2 つの棒グラフをタブ切り替え (shadcn/ui Tabs) で表示する:

**タブ 1: 気圧別**
- X 軸: `["急上昇 (+3以上)", "横ばい", "急低下 (-3以下)"]` の 3 カテゴリ
- Y 軸: 0〜5、`stepSize: 0.5`
- 各バーの色: `["#4ade80", "#8b92a5", "#ef4444"]`
- `pressureDeltaHpa >= 3` / `-2.9〜2.9` / `<= -3` でグループ分けして平均を算出
- バーが 0 件のカテゴリは高さ 0 で描画し Tooltip に「データなし」を出す

**タブ 2: 月齢別**
- X 軸: `["新月期 (0〜0.1)", "上弦期 (0.1〜0.5)", "満月期 (0.45〜0.55)", "下弦期 (0.5〜0.9)"]`
- 満月期は `moonPhase 0.45〜0.55` で判定。重複する場合は満月期を優先
- Y 軸: 0〜5、`stepSize: 0.5`
- バー色: `["#7c4dff", "#1d9bf0", "#facc15", "#4ade80"]`

---

### CorrelationChart コンポーネント

ファイル: `src/components/CorrelationChart.tsx`

Props:

```
type CorrelationChartProps = {
  records: SleepRecord[];  // 外部から注入 (デモ or リアル)
  height?: number;         // デフォルト 240 (px)
}
```

責務: 散布図と回帰直線のみ。折れ線・棒グラフは `dashboard/page.tsx` 内でインライン実装して可。
`'use client'` 指定必須。chart.js の register は `CorrelationChart.tsx` 内で行う:

```
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);
```

---

### ページレイアウト (dashboard/page.tsx)

`'use client'` コンポーネントとして実装する。

**セクション順序 (縦方向)**:

1. ページタイトル: `「睡眠ダッシュボード」` (H1, `text-2xl font-bold`)
2. デモバナー (デモモード時のみ)
3. KPI カード 4 枚 (grid)
4. 折れ線グラフ: 「過去 30 日の睡眠品質推移」
5. `CorrelationChart`: 「気圧と睡眠品質の関係」
6. 気象別平均グラフ (Tabs)
7. 自然言語インサイト
8. 医療免責注記

**KPI カード配置**:

- デスクトップ (`md` 以上): 4 列 `grid-cols-4`
- モバイル (375px): 2 列 `grid-cols-2`
- 各カードは `bg-[#1a1f2e] rounded-xl p-4`
- カード内: アイコン (lucide-react) + ラベル (muted) + 値 (大フォント `text-2xl font-bold tabular-nums`)

| # | ラベル | アイコン | 値のフォーマット |
|---|---|---|---|
| 1 | 7 日平均品質 | `TrendingUp` | `3.4` (小数 1 桁) or `--` (データなし) |
| 2 | 今月の記録日数 | `CalendarDays` | `12日` |
| 3 | 最長連続記録 | `Flame` | `7日` |
| 4 | 最も浅かった日 | `Moon` | `04/03 (品質1)` or `--` |

**グラフコンテナ**:
- 各グラフは `bg-[#1a1f2e] rounded-xl p-4 mb-6` のカードで包む
- 折れ線グラフコンテナの高さ: `h-[200px]` (モバイル) / `h-[280px]` (md 以上)
- 散布図コンテナの高さ: `h-[220px]` (モバイル) / `h-[280px]` (md 以上)
- 棒グラフコンテナの高さ: `h-[180px]` (モバイル) / `h-[240px]` (md 以上)

**インサイト表示**:
- `generateInsights` が返す `InsightItem[]` をリスト表示
- severity: `warning` → `border-l-4 border-[#ef4444] bg-[#1a1f2e] p-3 rounded-r-lg`
- severity: `info` → `border-l-4 border-[#1d9bf0] bg-[#1a1f2e] p-3 rounded-r-lg`
- severity: `positive` → `border-l-4 border-[#4ade80] bg-[#1a1f2e] p-3 rounded-r-lg`
- インサイトが 0 件の場合、このセクション全体を非表示にする

---

### モバイル 375px レイアウト詳細

- `container mx-auto px-4 max-w-screen-md` でラップ
- KPI カード: 2 列 (`grid-cols-2 gap-3`)。各カードは `p-3`、値のフォント `text-xl`
- グラフカード: 1 列、フル幅。折れ線グラフ高さ `h-[200px]`
- 散布図高さ: `h-[220px]`
- タブバー (`Tabs`): `overflow-x-auto` を付けてスクロール許容
- インサイト: 1 列縦積み
- 横スクロールが発生しないこと (グラフは `overflow-hidden` で切り取る)

---

### 医療免責の配置場所 (F003 内)

フッターの共通免責に加え、ダッシュボード内に 1 箇所追加で配置する。

場所: ページ最下部 (インサイトセクションの直後、フッターの直前)

スタイル: `text-xs text-[#8b92a5] text-center py-4 px-4`

文言:
```
本ダッシュボードの分析・インサイトは統計的な傾向の参考情報であり、医療行為・診断を目的としたものではありません。
体調に不安がある場合は医療機関にご相談ください。
```

---

### F003 refined steps (feature-list.json への反映用)

以下は feature-list.json の F003.steps を置き換える内容の草案。

1. `src/lib/demoData.ts` を新規作成し、30 件固定の `DEMO_RECORDS: SleepRecord[]` 定数をエクスポートする。件数・quality・pressureDeltaHpa の値は上記「デモデータ生成方針」に従う。
2. `src/lib/correlation.ts` を新規作成し、`calculatePearsonCorrelation`, `calculateLinearRegression`, `calculateStats`, `generateInsights` の 4 関数を上記シグネチャで実装してエクスポートする。`InsightItem`, `DashboardStats` 型も同ファイルで定義する。
3. `calculateStats` の単体テストを `src/lib/correlation.test.ts` に最低 4 ケース作成する: (a) 空配列 → null/0 返却、(b) 7 件データで avg7Days が正しい、(c) 連続 5 日データで streak = 5、(d) 非連続データで streak が正しく分割される。
4. `src/app/dashboard/page.tsx` を `'use client'` で実装する。マウント時に `getRecords()` を呼んで件数を判定し、9 件以下なら `DEMO_RECORDS` を、10 件以上なら実データを state にセットする。
5. `calculateStats(records)` を呼んで `DashboardStats` を取得し、KPI カード 4 枚を描画する。アイコンは lucide-react の `TrendingUp`, `CalendarDays`, `Flame`, `Moon`。値は `tabular-nums` フォントで表示。
6. KPI カードのグリッドは `grid grid-cols-2 md:grid-cols-4 gap-3 mb-6` で実装する。
7. Chart.js のグローバル設定 (`Chart.defaults.color` 等) を dashboard/page.tsx の先頭 `useEffect` または module スコープで 1 度だけ設定する。必要な Chart.js コンポーネントを `ChartJS.register(...)` で登録する。
8. 折れ線グラフを `<Line>` コンポーネントで実装する。データは records を date 昇順に並び替え、X 軸ラベルを `MM/DD`、Y 軸を 1〜5 の整数に固定する。コンテナは `h-[200px] md:h-[280px]` で高さ制御する。
9. `src/components/CorrelationChart.tsx` を新規作成する。Props は `{ records: SleepRecord[]; height?: number }`。内部で `calculateLinearRegression` を呼び、散布図の dataset と回帰直線 dataset を組み立てて `<Scatter>` に渡す。
10. 散布図の点に quality 値で色分けした `pointBackgroundColor` 配列を設定する (1: `#ef4444` 〜 5: `#1d9bf0`)。
11. 気象別平均グラフを shadcn/ui の `<Tabs>` で「気圧別」「月齢別」の 2 タブに分けて実装する。各タブ内は `<Bar>` コンポーネント、コンテナ高さ `h-[180px] md:h-[240px]`。
12. 気圧別グラフの集計: records を `pressureDeltaHpa` で 3 グループに分け、各グループの quality 平均を算出する。件数 0 のグループは平均 0 で描画し、Tooltip callback で「データなし」を返す。
13. 月齢別グラフの集計: `moonPhase` で 4 グループに分け (満月期優先)、各グループの quality 平均を算出する。
14. `generateInsights(records)` を呼んで `InsightItem[]` を取得し、severity に応じたスタイルでリスト表示する。0 件のときはセクション全体を非表示にする。
15. デモモード時はグラフ上部に「サンプルデータ表示中」バナーを表示し、「10 日以上記録するとあなたのデータが表示されます」の誘導文を入れる。バナーには `/record` への遷移リンク (shadcn/ui `Button` variant="outline") を付ける。
16. ページ最下部 (インサイトの後) に医療免責注記を `text-xs text-[#8b92a5]` で表示する。
17. `npm run build` と `npm run lint` がエラー・警告ゼロで完了することを確認する。
18. DevTools の iPhone SE (375px) でダッシュボードを開き、横スクロールなし、KPI カード 2 列崩れなし、グラフが表示される (`h-[200px]` で切り取られる) ことを確認する。

---

### F003 refined acceptance_criteria (feature-list.json への反映用)

1. `getRecords()` が 0〜9 件のとき、ダッシュボードがデモデータ (30 件サンプル) で表示され、「サンプルデータ表示中」バナーが出る。
2. localStorage に 10 件以上の `SleepRecord` が存在するとき、デモバナーが消え、KPI / グラフがリアルデータで描画される。
3. KPI カード 4 枚 (7 日平均 / 今月記録日数 / 最長連続 / 最も浅かった日) がすべて表示され、値が `tabular-nums` フォントで表示される。データなし時は `--` が出る。
4. `calculatePearsonCorrelation([1,2,3], [3,2,1])` が `-1.0` (±0.001) を返す。
5. `calculateLinearRegression` に全同値 xs (例: `[3,3,3]`) を渡すと `null` を返す。
6. `calculateStats` に空配列を渡すと `{ avg7Days: null, recordCountThisMonth: 0, longestStreak: 0, worstDay: null }` を返す。
7. 折れ線グラフが `<canvas>` として DOM に存在し、`aria-label` または `role="img"` が付与されている。
8. 散布図に回帰直線 dataset (破線) が描画される。records が 2 件未満のとき回帰直線は描画されない。
9. 気象別グラフの「気圧別」タブで、急低下グループのバーが `#ef4444` (赤) で表示される。
10. `generateInsights` が気圧急低下日 (<=−3) の平均 quality とそれ以外の差が 0.5 以上の records を受け取ると、severity `warning` のインサイトを返す。
11. インサイトが 0 件のとき、インサイトセクションが DOM から除外される (`display: none` または条件レンダリング)。
12. DevTools iPhone SE (375px) でダッシュボードを開いたとき、横スクロールが発生せず、KPI カードが 2 列で表示される。
13. ページ最下部に医療免責注記が `text-xs text-[#8b92a5]` で表示される。
14. `npm run build` と `npm run lint` がエラー・警告ゼロで完了する。
15. Chart.js の tooltip 背景色が `#1a1f2e` (ダーク) になっており、白背景 tooltip が表示されない。

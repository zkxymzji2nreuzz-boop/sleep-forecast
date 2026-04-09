# SleepForecast 補助仕様メモ (Planner Notes)

Generator 向けの補助ノート。feature-list.json の steps を補足する目的で、
ここには「デザイントークン」と「共通文言」など横断的な決め事だけを置く。
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

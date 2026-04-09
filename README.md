# SleepForecast (眠れる明日予報)

気温・湿度・気圧・月齢から明日の眠気を予測する、ウェアラブル不要の睡眠予測 Web アプリ。

> **注意**: 本サービスは医療行為・診断を目的としたものではありません。
> 体調に不安がある場合は医療機関にご相談ください。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router) + TypeScript (strict)
- **スタイリング**: Tailwind CSS + shadcn/ui
- **チャート**: Chart.js + react-chartjs-2
- **月齢計算**: suncalc
- **日付処理**: date-fns
- **アイコン**: lucide-react
- **データ保存**: localStorage (MVP)
- **気象 API**: Open-Meteo (認証不要)
- **ホスティング**: Vercel

## 必要環境

- Node.js 18.17 以上
- npm 9 以上

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数ファイルを作成 (実値は空で構いません)
cp .env.example .env.local

# 開発サーバーを起動
npm run dev
```

http://localhost:3000 にアクセスするとトップページが表示されます。

## 主要スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 (ポート 3000) |
| `npm run build` | 本番ビルドを実行 |
| `npm run start` | ビルド済みアプリを起動 |
| `npm run lint` | ESLint を実行 |

## 環境変数

`.env.example` をコピーして `.env.local` を作成してください。
実値は空のままでもローカル開発は動作します。

| キー | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 公開 URL (OGP / canonical / sitemap) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 の測定 ID |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Google AdSense のクライアント ID |

## ディレクトリ構成 (抜粋)

```
sleep-forecast/
├── src/
│   ├── app/                # App Router の各ルート
│   ├── components/         # 共通コンポーネント
│   │   └── ui/             # shadcn/ui
│   ├── lib/                # ロジック (types / storage / weather / ...)
│   └── content/articles/   # SEO 記事 (Markdown)
├── harness/                # ハーネスエンジニアリング用メタ
└── .claude/                # Claude Code プロジェクトメモリ
```

## 実装ロードマップ

このプロジェクトは STEP 1〜6 の 7 機能 (F001〜F007) に分割して段階的に実装されます。
詳細は [`harness/feature-list.json`](./harness/feature-list.json) を参照してください。

| STEP | 機能 | 状態 |
| --- | --- | --- |
| F001 | プロジェクト初期化 | 本 PR |
| F002 | 気象 API 連携と記録フォーム | TODO |
| F003 | ダッシュボード (相関分析) | TODO |
| F004 | 明日の予測機能 | TODO |
| F005 | SEO 記事システム + PWA | TODO |
| F006 | 必須ページ / 広告準備 | TODO |
| F007 | デプロイ前チェック | TODO |

## ライセンス

本リポジトリは個人開発プロジェクトです。ライセンスは別途定めます。

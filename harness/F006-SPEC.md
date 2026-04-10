# F006 SPEC — 必須ページと広告準備 (STEP 6-A)

作成日: 2026-04-10
担当: Planner Agent

---

## 1. 対象ファイル一覧

### 新規作成
- `src/app/about/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/contact/page.tsx`
- `src/components/AdBanner.tsx`
- `src/components/GoogleAnalytics.tsx`
- `public/ads.txt`

### 既存ファイル変更
- `src/app/layout.tsx` — GoogleAnalytics コンポーネントを追加
- `src/app/page.tsx` — WebApplication JSON-LD + BreadcrumbList を追加
- `src/app/dashboard/page.tsx` — AdBanner + BreadcrumbList を追加
- `src/app/record/page.tsx` — BreadcrumbList を追加
- `src/app/articles/page.tsx` — AdBanner + BreadcrumbList を追加 (既存ファイル)
- `src/app/articles/[slug]/page.tsx` — AdBanner + BreadcrumbList を追加 (既存ファイル)

---

## 2. 各ページ仕様

### 2-A. /about (運営者情報)

**ページタイトル (metadata)**: `運営者情報 | SleepForecast`

**セクション構成 (日本語):**

```
H1: SleepForecastについて

## このサービスについて
SleepForecastは、気温・湿度・気圧・月齢から「明日の眠気レベル」を予測する、
個人が開発したウェアラブル不要の睡眠サポートWebアプリです。
ウェアラブルデバイスを持たない方でも、毎朝30秒の入力で気象と睡眠の相関を
可視化できます。

## 開発の経緯
家族が低気圧頭痛や気象病に悩んでいたことがきっかけです。「明日は雨だから
眠れないかも」という感覚を、データで裏付けたいと思い作りました。

## 運営者
個人開発者 / SleepForecast
お問い合わせは Contact ページよりお願いします。

## 免責事項
本サービスは医療行為・診断を目的としたものではありません。
予測はあくまで参考情報であり、体調不良がある場合は必ず医療機関にご相談ください。
```

**BreadcrumbList**: ホーム > 運営者情報

---

### 2-B. /privacy (プライバシーポリシー)

**ページタイトル**: `プライバシーポリシー | SleepForecast`

**必須セクション (個人情報保護法対応):**

```
H1: プライバシーポリシー
最終更新日: 2026年4月10日

## 1. 収集する情報
本サービスはユーザーの個人を特定できる情報を収集・保存しません。
入力された睡眠記録（睡眠時間・眠気レベル・都道府県）は、
すべてお使いのデバイスのlocalStorageにのみ保存されます。
サーバーへのデータ送信は行いません。

## 2. 気象データの取得
選択された都道府県の緯度経度情報を用いて、Open-Meteo API
（https://open-meteo.com）から気象データを取得します。
個人を特定できる位置情報は送信しません。

## 3. Google Analytics 4 (アクセス解析)
本サービスはGoogle Analytics 4を使用してアクセス状況を分析します。
Google Analyticsはトラフィックデータの収集にCookieを使用することがあります。
収集されるデータは匿名化されており、個人を特定しません。
詳しくはGoogleのプライバシーポリシーをご確認ください。
環境変数 NEXT_PUBLIC_GA_ID が未設定の場合、トラッキングは無効です。

## 4. 広告について
本サービスはGoogle AdSense（予定）を使用した広告を表示する場合があります。
広告の配信にはCookieが使用されることがあります。
広告のパーソナライズはGoogleのプライバシーポリシーに従います。

## 5. Cookieについて
本サービスはGoogle Analytics・AdSense の目的でCookieを使用します。
ブラウザの設定によりCookieを無効にすることができますが、
一部機能が制限される場合があります。

## 6. 第三者提供
収集したデータを第三者へ提供することはありません。

## 7. お問い合わせ
プライバシーに関するお問い合わせはContactページよりご連絡ください。
```

**BreadcrumbList**: ホーム > プライバシーポリシー

---

### 2-C. /terms (利用規約)

**ページタイトル**: `利用規約 | SleepForecast`

**必須セクション (薬機法・景表法準拠):**

```
H1: 利用規約
最終更新日: 2026年4月10日

## 第1条 (サービスの目的)
SleepForecastは、気象データと睡眠記録の相関を可視化することを目的とした
情報提供サービスです。

## 第2条 (医療免責)
本サービスが提供する睡眠予測・眠気レベルはすべて参考情報です。
医療行為・医療診断・治療の代替ではありません。
体調に異常を感じた場合は、必ず医師または医療機関にご相談ください。
本サービスの情報を根拠とした医療判断・投薬については一切の責任を負いません。

## 第3条 (データの取り扱い)
睡眠記録はユーザーのデバイス内（localStorage）にのみ保存されます。
運営者はユーザーの記録データにアクセスしません。

## 第4条 (免責事項)
天気予報・気象データは外部API（Open-Meteo）から取得しており、
予測精度を保証するものではありません。
本サービスの利用により生じた損害について、運営者は責任を負いません。

## 第5条 (禁止事項)
・本サービスのコンテンツを無断で転載・複製すること
・サービスに対する不正アクセス・クローリング（常識的な範囲を超えるもの）
・法令または公序良俗に反する利用

## 第6条 (規約の変更)
本規約はサービス改善のため予告なく変更することがあります。
変更後も本サービスを利用した場合は、変更後の規約に同意したものとみなします。

## 第7条 (準拠法・管轄)
本規約は日本法を準拠法とし、紛争が生じた場合は東京地方裁判所を
第一審の専属合意管轄裁判所とします。
```

**BreadcrumbList**: ホーム > 利用規約

---

### 2-D. /contact (お問い合わせ)

**ページタイトル**: `お問い合わせ | SleepForecast`

**実装方針**: Googleフォームへの外部リンク（mailto フォールバック付き）

```
H1: お問い合わせ

本サービスに関するご意見・ご要望・不具合報告はこちらからお送りください。

[お問い合わせフォームを開く] ← 外部リンクボタン (target="_blank" rel="noopener noreferrer")
href="https://forms.gle/placeholder" (Generator がデプロイ前に差し替え可能な定数)

また、メールでのお問い合わせも受け付けています:
contact@sleep-forecast.example.com (プレースホルダー)

## よくある質問
Q: データはどこに保存されていますか？
A: すべてお使いのデバイスのブラウザ（localStorage）に保存されます。
   外部サーバーへの送信は行いません。

Q: 予測が外れました
A: 気象と睡眠の相関には個人差があります。記録を重ねるほど精度が高まります。
   本予測は医療情報ではなく、あくまで参考値です。
```

**実装メモ**: CONTACT_FORM_URL と CONTACT_EMAIL を同ファイル内の定数として宣言し、
Generator がデプロイ設定時に差し替えやすくする。

**BreadcrumbList**: ホーム > お問い合わせ

---

## 3. Google Analytics 4 実装

### 3-A. コンポーネント設計 (`src/components/GoogleAnalytics.tsx`)

- `"use client"` コンポーネント
- `NEXT_PUBLIC_GA_ID` が空文字または未定義の場合は何も描画しない（完全無効）
- next/script の `Script` コンポーネントを使用し `strategy="afterInteractive"` を指定
- `gtag('config', GA_ID)` を初期化
- ページ遷移トラッキング: `usePathname` で pathname を監視し、変化時に `gtag('event', 'page_view')` を送出
- `<Suspense>` でラップして useSearchParams 使用時の SSR 警告を防ぐ

### 3-B. layout.tsx への組み込み

`<body>` の末尾（`<Toaster />` の後）に `<GoogleAnalytics />` を追加。
`<head>` 内には何も追加しない（Script コンポーネントが自動管理）。

### 3-C. .env.example への追記確認

既存の `NEXT_PUBLIC_GA_ID=` が存在することを確認（F001 で追加済み）。
実際の計測 ID (G-XXXXXXXXXX) は `.env.local` にのみ設定。

---

## 4. AdBanner コンポーネント (`src/components/AdBanner.tsx`)

### 設計方針

- `"use client"` コンポーネント
- 2つの動作モード:
  - **無効時** (NEXT_PUBLIC_ADSENSE_CLIENT 未設定 OR `disabled` prop): 
    最小限のプレースホルダー `div` を返す（高さ0、visibility:hidden）
    DOM は存在するが視覚的に消え、レイアウトを崩さない
  - **有効時**: `<ins class="adsbygoogle">` を描画し useEffect で `(adsbygoogle = window.adsbygoogle || []).push({})` を呼び出す

### Props

```
interface AdBannerProps {
  slot: string          // AdSense の広告スロット ID
  format?: "auto" | "rectangle" | "horizontal"  // デフォルト "auto"
  className?: string
}
```

### 配置予定箇所

| 場所 | slot 定数名 | format |
|------|-------------|--------|
| トップページ ファーストビュー下 | AD_SLOT_TOP | horizontal |
| ダッシュボード グラフ下 | AD_SLOT_DASHBOARD | rectangle |
| 記事一覧ページ末 | AD_SLOT_ARTICLE_LIST | horizontal |
| 記事詳細 中央 | AD_SLOT_ARTICLE_MID | rectangle |
| 記事詳細 末尾 | AD_SLOT_ARTICLE_END | horizontal |

スロット ID はファイル冒頭の定数として宣言し、空文字をデフォルト値とする。
AdSense 審査通過後に実値を `.env.local` または定数に設定する。

---

## 5. public/ads.txt

```
google.com, pub-XXXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

`pub-XXXXXXXXXXXXXXXXX` は AdSense 審査通過後に実際の Publisher ID に差し替えるプレースホルダー。
ファイルは `/ads.txt` でアクセス可能（Next.js の `public/` ディレクトリに配置）。

---

## 6. JSON-LD 仕様

### 6-A. WebApplication (トップページ `src/app/page.tsx`)

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "SleepForecast",
  "alternateName": "眠れる明日予報",
  "url": "SITE_URL",
  "description": "気温・湿度・気圧・月齢から明日の眠気を予測する、ウェアラブル不要の睡眠予測アプリ",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "author": {
    "@type": "Organization",
    "name": "SleepForecast"
  },
  "inLanguage": "ja"
}
```

### 6-B. BreadcrumbList (全ページ共通パターン)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "ホーム",
      "item": "SITE_URL"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "ページ名",
      "item": "SITE_URL/path"
    }
  ]
}
```

**実装方法**: 各 page.tsx の `<head>` 内に `<script type="application/ld+json">` タグを
`dangerouslySetInnerHTML` で埋め込む。Server Component なので安全。

**BreadcrumbList 追加対象ページ一覧:**
- `/` — 単一 ListItem (ホームのみ)
- `/about` — ホーム > 運営者情報
- `/privacy` — ホーム > プライバシーポリシー
- `/terms` — ホーム > 利用規約
- `/contact` — ホーム > お問い合わせ
- `/dashboard` — ホーム > ダッシュボード
- `/record` — ホーム > 記録
- `/articles` — ホーム > 記事一覧
- `/articles/[slug]` — ホーム > 記事一覧 > 記事タイトル（動的）

---

## 7. デザインガイドライン (Design B 継続)

全ページ共通:
- 背景: `bg-[#0f1117]`、カード: `bg-[#1a1f2e]` または `bg-white/[0.04]`
- テキスト: `text-[#e6e8ee]` (本文)、`text-[#8b92a5]` (補助)
- アクセント: `text-indigo-300` または `text-[#1d9bf0]`
- コンテナ: `container mx-auto max-w-screen-md px-4`
- 法律文書ページ (privacy / terms) は可読性優先: `prose` 的な行間・フォントサイズ

---

## 8. 受け入れ基準 (Acceptance Criteria)

1. `/about` `/privacy` `/terms` `/contact` の4ページが 200 を返し、ComingSoon 表示でない
2. `/privacy` にlocalStorage・Google Analytics・広告Cookieの記載が含まれる
3. `/terms` に「医療行為・診断を目的としたものではありません」という文言が含まれる
4. `NEXT_PUBLIC_GA_ID` を設定した場合、HTML に gtag スクリプトが出力される
5. `NEXT_PUBLIC_GA_ID` が空の場合、gtag スクリプトが出力されない
6. `AdBanner` を `disabled` or ADSENSE_CLIENT 未設定で使用しても、ページレイアウトが崩れない
7. `/ads.txt` が 200 を返し、`google.com` で始まる行が含まれる
8. トップページの `<head>` に `@type: WebApplication` の JSON-LD が埋め込まれている
9. `/about` `/privacy` `/terms` `/contact` `/dashboard` `/record` `/articles` に BreadcrumbList JSON-LD が埋め込まれている
10. `npm run build` が TypeScript strict モードでエラーなく完了する

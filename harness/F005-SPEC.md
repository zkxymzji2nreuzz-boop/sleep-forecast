# F005 Refined Spec: SEO 記事システムと PWA 化 (STEP 5)

Planner Agent による実装前スペック。Generator はこのドキュメントと
`harness/feature-list.json` の F005 エントリを併用して実装すること。
コードはここには含まない。設計判断・優先順位・境界条件のみを記述する。

---

## 1. スコープ確定

### 1-A. SEO 記事システム: Markdown か MDX か

**判定: plain Markdown + gray-matter + remark/rehype パイプライン を採用する。**

理由:
- 記事内に React コンポーネントを埋め込む要件がない（SEO テキスト記事のみ）
- `@next/mdx` は `next.config.mjs` に手を入れる必要があり、next-pwa との二重 wrapper リスクがある
- gray-matter は frontmatter パース実績が豊富で型安全な運用が容易
- remark-gfm + rehype-stringify の組み合わせで GitHub Flavored Markdown（テーブル・strikethrough）に対応できる

**却下した選択肢:**
- `@next/mdx` 直接統合: frontmatter サポートが標準でなく、追加プラグインが必要なうえ next-pwa との二重 HOC wrap が問題になりやすい
- `next-mdx-remote`: Server Components で動作するが依存が増える。plain Markdown で十分なため不採用

**インストールが必要なパッケージ:**
```
npm install gray-matter remark remark-gfm rehype-stringify remark-rehype
npm install next-sitemap
npm install @ducanh2912/next-pwa
npm install -D @types/remark @types/mdast
```

gray-matter / remark 系は型定義が package 内包のため `@types/` 不要なものが多い。
build 時に型エラーが出た場合のみ追加で対応すること。

---

### 1-B. Markdown フロントマター構造

ファイル: `src/content/articles/{slug}.md`

```yaml
---
slug: "kiatsu-zutsu"
title: "低気圧頭痛のメカニズムと気圧変化の対策"
description: "気圧が下がると頭痛が起きるのはなぜ？血管拡張・自律神経の乱れを科学的に解説し、気象病予防策を紹介します。"
publishedAt: "2026-04-10"
updatedAt: "2026-04-10"
category: "気象病"
tags: ["低気圧", "頭痛", "気象病", "自律神経"]
relatedSlugs: ["jiritsu-shinkei", "kiko-byo-check"]
wordCount: 2000
---
```

型定義 (`src/lib/types.ts` に追記):

```typescript
interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;   // YYYY-MM-DD
  updatedAt: string;     // YYYY-MM-DD
  category: string;
  tags: string[];
  relatedSlugs: string[];
  wordCount?: number;
}

interface ArticleFull extends ArticleMeta {
  contentHtml: string;  // remark で変換済み HTML 文字列
}
```

---

### 1-C. 記事処理パイプライン

`src/lib/articles.ts` に以下の関数を実装する（Server-side only）:

- `getAllArticleSlugs(): string[]` — `src/content/articles/*.md` をファイル名から slug を返す
- `getAllArticlesMeta(): ArticleMeta[]` — フロントマターのみを全件読み込む（`publishedAt` 降順ソート）
- `getArticleBySlug(slug: string): ArticleFull` — frontmatter + remark 変換済み HTML を返す
- `getRelatedArticles(slugs: string[]): ArticleMeta[]` — 関連記事メタを返す

`fs` / `path` を使うため、この lib ファイルは Server Components または
`generateStaticParams` / `generateMetadata` からのみ呼ぶこと。
`'use client'` コンポーネントからは直接インポートしない。

---

### 1-D. PWA 導入方針

**採用パッケージ: `@ducanh2912/next-pwa@^10.x`**

理由:
- Next.js 14 App Router のサポートが明示されており、広く使われている
- `next-pwa`（serwist 移行前の旧パッケージ）より App Router 対応が安定
- 公式 Next.js PWA Guide（nextjs.org/docs/app/guides/progressive-web-apps）の
  「外部パッケージなし」アプローチも検討したが、Service Worker の手動管理は
  今回のスコープに対してオーバーエンジニアリングのため next-pwa を継続採用

**next.config.mjs の wrap 方針:**

```javascript
// 概念のみ。コードは Generator が書く
import withPWA from '@ducanh2912/next-pwa';
const withPWAConfig = withPWA({ dest: 'public', disable: process.env.NODE_ENV === 'development' });
export default withPWAConfig(nextConfig);
```

`disable: process.env.NODE_ENV === 'development'` は必須。
開発時に Service Worker が有効になると `npm run dev` のホットリロードが壊れる。

**manifest.json の配置:**
`public/manifest.json`（静的ファイルとして配置）

```json
// 概念のみ
{
  "name": "SleepForecast | 眠れる明日予報",
  "short_name": "SleepForecast",
  "description": "気圧・気温・月齢から明日の眠気を予測",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1d9bf0",
  "background_color": "#0f1117",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**アイコン生成方針:**
- MVP では 192x192 と 512x512 の PNG 2 種のみ用意する
- アイコン内容: 濃紺背景（#0f1117）に月アイコン（#1d9bf0）。SVG を手書きして sharp で PNG 変換するか、既製のシンプルな月アイコンを配置
- `purpose: "maskable"` は 512px に付与（Android アダプティブアイコン対応）
- `app/apple-icon.png`（180x180）を追加すると iOS Safari の「ホーム画面に追加」アイコンが設定される

**layout.tsx への追記:**

```html
<!-- 概念のみ -->
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="SleepForecast" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

### 1-E. オフライン戦略

**キャッシュ対象（Service Worker）:**
- `/` (トップページ) — キャッシュ優先
- `/record` — キャッシュ優先（localStorage は SW の外なので記録自体はオフライン可）
- `/dashboard` — キャッシュ優先
- 静的アセット（`/_next/static/**`, CSS, JS chunk）— キャッシュ優先

**キャッシュ非対象:**
- `/api/weather` — ネットワーク優先（気象データはリアルタイム性が必要）
- 記事ページ（`/articles/**`）— ネットワーク優先 + フォールバック

**オフライン時の挙動:**
- `/api/weather` が失敗した場合は既存の F002 フォールバック（手動入力）が発動する
- Service Worker レベルでの特別な処理は不要

`@ducanh2912/next-pwa` のデフォルト設定（`dest: 'public'`）で上記のほとんどが自動的に処理される。
`runtimeCaching` のカスタマイズは F005 スコープ外とする。

---

### 1-F. sitemap.xml / robots.txt 生成方針

**採用: `next-sitemap` パッケージ（ビルド後 postbuild スクリプト）**

Next.js App Router の組み込み `sitemap.ts` ファイル規約も使えるが、
`next-sitemap` を採用する理由:
- `robots.txt` の自動生成まで 1 パッケージで賄える
- `postbuild` フックで Vercel にも対応
- 動的記事スラッグの列挙が `additionalPaths` で簡潔に書ける

`package.json` の `scripts.postbuild` に `next-sitemap` を追加する。
`next-sitemap.config.js` の最小構成:

```javascript
// 概念のみ
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://sleep-forecast.vercel.app',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }],
  },
  // 記事スラッグを動的に追加するため additionalPaths を使う
};
```

`NEXT_PUBLIC_SITE_URL` は `.env.example` に追記済みのキーを使う（F001 で作成済み）。

---

### 1-G. JSON-LD 構造化データ（Article schema）

記事ページ（`src/app/articles/[slug]/page.tsx`）の `<head>` 内に `<script type="application/ld+json">` として埋め込む。

最小フィールド:
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "記事タイトル",
  "description": "記事説明文",
  "datePublished": "2026-04-10",
  "dateModified": "2026-04-10",
  "author": { "@type": "Organization", "name": "SleepForecast" },
  "publisher": { "@type": "Organization", "name": "SleepForecast", "url": "サイトURL" },
  "url": "記事の canonical URL",
  "mainEntityOfPage": { "@type": "WebPage", "@id": "記事の canonical URL" }
}
```

`generateMetadata` 関数で `other` フィールドを使って埋め込む、または
Server Component 内で `<script>` タグとして直接レンダリングする。

---

### 1-H. 初期記事 3 本のスコープ（MVP）

**元々の feature-list.json は「10 本」だが、F005 実装セッションでは 3 本に絞る。**

理由: 記事 10 本の執筆は SEO 戦略と品質担保のためのスコープ外作業であり、
Generator がコード実装と並行して行うと品質が落ちる。
残り 7 本は F006 の「必須ページ整備」フェーズか独立したコンテンツセッションで追加する。

**実装する 3 本（MVP スラッグと題名）:**

| slug | title | カテゴリ |
|---|---|---|
| `kiatsu-zutsu` | 低気圧頭痛のメカニズムと気圧変化の対策 | 気象病 |
| `suimin-shitsu-up` | 睡眠の質を上げる7つの習慣——気温・湿度の最適化から始めよう | 睡眠改善 |
| `tsuki-to-suimin` | 月齢と睡眠の関係——満月の夜に眠れない科学的な理由 | 月齢・睡眠 |

各記事の最低要件:
- 1500 字以上（2000 字が理想だが 1500 字以上で acceptable）
- H2 見出し 3 本以上
- `relatedSlugs` に他記事への参照を 1 件以上含める
- 医療免責の文言を記事末尾に含める（「本記事は医療行為・診断を目的としたものではありません。」）

---

## 2. Steps の refine（依存順）

以下の順番で実装する。番号は実装順序であり、後のステップは前のステップの成果物に依存する。

### Phase A: 基盤インストール（他に何も依存しない）

1. **パッケージインストール**
   `gray-matter`, `remark`, `remark-gfm`, `remark-rehype`, `rehype-stringify`,
   `next-sitemap`, `@ducanh2912/next-pwa` を npm install する。
   インストール後に `npm run build` がエラーなく完了することを確認してから次に進む。

2. **型定義追記**（`src/lib/types.ts`）
   `ArticleMeta` と `ArticleFull` インターフェースを追記する。
   既存の `SleepRecord` / `WeatherData` / `PrefectureMaster` には手を触れない。

### Phase B: Markdown パイプライン

3. **`src/lib/articles.ts` の実装**
   `getAllArticleSlugs`, `getAllArticlesMeta`, `getArticleBySlug`, `getRelatedArticles`
   の 4 関数を実装する。`fs.readFileSync` を使うため、このファイルは
   Server Components からのみ呼ばれることを JSDoc コメントで明記する。
   `remark().use(remarkGfm).use(remarkRehype).use(rehypeStringify)` のパイプラインで
   HTML 文字列を生成する。

4. **サンプル記事 3 本の作成**（`src/content/articles/*.md`）
   フロントマター + 本文を作成する。
   `articles.ts` の実装を先に行い、読み込みロジックが確定してから記事を書く。

### Phase C: 記事ページ実装

5. **`src/app/articles/[slug]/page.tsx` の実装**
   `generateStaticParams` で全スラッグを列挙し、`generateMetadata` で
   title / description / OGP / canonical / JSON-LD を設定する。
   Server Component として実装する（`'use client'` 不要）。

6. **記事一覧ページ `src/app/articles/page.tsx` の実装**
   `getAllArticlesMeta()` でカード一覧を表示する。
   ヘッダーナビには追加しない（フッターリンクに記事一覧を追加する）。

7. **`src/components/ArticleLayout.tsx` の実装**
   記事本文表示用レイアウト。目次（H2 抽出）、関連記事 CTA、
   アプリ利用促進 CTA（「今日の睡眠を記録する」ボタン → /record）を含める。
   `prose` クラス（Tailwind Typography）を使用する場合は
   `@tailwindcss/typography` の追加インストールが必要。

### Phase D: PWA 化

8. **`public/manifest.json` の作成**
   上記 1-D のフィールドで作成する。

9. **アイコンファイルの配置**
   `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
   を配置する。MVP では単純な月アイコンで可。

10. **`next.config.mjs` の更新**（`@ducanh2912/next-pwa` の wrap）
    `disable: process.env.NODE_ENV === 'development'` を必ず設定する。
    既存の `nextConfig` の内容（将来の設定追加に備えて空オブジェクトのまま）を保持する。

11. **`src/app/layout.tsx` の更新**
    `<link rel="manifest">`, `apple-mobile-web-app-*` の meta タグを追加する。
    Next.js の `metadata` API の `manifest` フィールドで設定する方法と
    `<head>` 直書きの両方が使えるが、`metadata.manifest` が推奨。

### Phase E: SEO インフラ

12. **`src/app/sitemap.ts` の実装**（App Router 組み込み方式）
    `next-sitemap` は postbuild フックで使うが、App Router の
    `app/sitemap.ts` を併用することで動的記事も含む sitemap を確実に生成できる。
    両方実装した場合は重複になるため、**どちらか一方を選ぶこと**。
    推奨: `next-sitemap` の `additionalPaths` コールバックで記事スラッグを追加する方式。
    App Router 組み込みは単純なケースでは便利だが robots.txt が別途必要になる。

13. **`next-sitemap.config.js` の作成**
    `siteUrl`, `generateRobotsTxt: true`, `exclude: ['/api/*']` の最小設定。
    `package.json` の `"postbuild": "next-sitemap"` スクリプトを追加。

14. **各ページの `generateMetadata` 整備**
    記事ページに加え、トップ・ダッシュボード・記録ページの metadata も
    OGP（`openGraph`）と Twitter Card（`twitter`）を設定する。
    `og:image` は MVP では共通のデフォルト画像（`/og-default.png`）で可。

### Phase F: ビルド検証

15. **`npm run build` の成功確認**
    TypeScript エラーゼロ、eslint 警告ゼロが必要条件。
    next-pwa の wrap によって build 出力に `sw.js` と `workbox-*.js` が
    `public/` に生成されることを確認する（`disable: false` な本番ビルドの場合）。

16. **sitemap.xml と robots.txt のアクセス確認**
    `npm run build && npm run start` 後に
    `http://localhost:3000/sitemap.xml` と `http://localhost:3000/robots.txt`
    が正常レスポンスを返すことを確認する。

---

## 3. Acceptance Criteria の refine

### AC-1: ビルド成功
- `npm run build` が TypeScript strict モードでエラーなく完了する
- `npm run lint` が警告ゼロで完了する
- `public/sw.js` と `public/workbox-*.js` がビルド後に存在する（本番ビルド時）

### AC-2: 記事ページ表示
- `/articles/kiatsu-zutsu`, `/articles/suimin-shitsu-up`, `/articles/tsuki-to-suimin`
  の 3 URL が 200 を返す
- 各ページに H1（記事タイトル）、H2 見出し 3 本以上、記事本文が表示される
- 各ページのフッターに医療免責文が表示される
- 記事末尾に「今日の睡眠を記録する」CTA ボタン（→ /record）が表示される
- `/articles` (一覧) が 200 を返し、3 記事分のカードが表示される

### AC-3: OGP / メタデータ
- 各記事ページの `<title>` が `{記事タイトル} | SleepForecast` 形式になっている
- `<meta name="description">` にフロントマターの `description` が入っている
- `<meta property="og:title">`, `<meta property="og:description">` が設定されている
- `<script type="application/ld+json">` に Article schema の JSON-LD が埋め込まれている

### AC-4: sitemap / robots
- `http://localhost:3000/sitemap.xml`（本番: `https://sleep-forecast.vercel.app/sitemap.xml`）
  が `application/xml` でレスポンスを返す
- sitemap.xml に 3 記事のスラッグ URL が含まれている
- `robots.txt` が `/robots.txt` でアクセスできる
- `robots.txt` に `Disallow: /api/` が含まれる（API ルートをクロール除外）

### AC-5: PWA インストール可能
- Chrome DevTools の Application タブで「Service Worker」が「Activated and running」になる
  （本番ビルド後の `npm run start` 環境で確認）
- Chrome DevTools の Application > Manifest に `name`, `icons`, `start_url` が表示される
- iPhone Safari で「ホーム画面に追加」を実行するとアプリアイコンが追加される
- ホーム画面から起動すると `standalone` モード（ブラウザ UI なし）で動作する

### AC-6: オフライン動作
- `npm run start` 後に Chrome DevTools の Network タブで「Offline」に設定して
  `/`, `/record`, `/dashboard` にアクセスすると Service Worker キャッシュから表示される
- `/api/weather` はオフライン時に失敗し、F002 の手動入力フォールバックが表示される

### AC-7: Lighthouse スコア（参考値）
- SEO: 90 以上（記事ページで達成必須）
- Accessibility: 85 以上
- Best Practices: 90 以上
- Performance: 75 以上（本番ビルドの `npm run start` で計測。開発サーバでは不可）

---

## 4. リスク / 注意点

### 4-A: next-pwa と Next.js 14 App Router の互換性

**リスク: next.config.mjs が ES Module 形式であること**

現在の `next.config.mjs` は `export default nextConfig` の ESM 形式。
`@ducanh2912/next-pwa` の wrap は以下のように行う:

```javascript
// ESM 形式（.mjs）— 概念のみ
import withPWA from '@ducanh2912/next-pwa';
```

CJS 形式（`require`）は `.mjs` ファイルでは使えない。
もし `@ducanh2912/next-pwa` が ESM インポートをサポートしていない場合は
`next.config.mjs` を `next.config.js` にリネームして `require` を使う。
どちらの形式が使えるかは `npm run build` を実行して確認すること。

**リスク: `public/` への書き込みと `.gitignore`**

`sw.js` と `workbox-*.js` は `next build` 時に自動生成され `public/` に配置される。
これらを git に含めるかどうかの方針:
- **含めない**（推奨）: `.gitignore` に `public/sw.js` と `public/workbox-*` を追加する
- Vercel でのビルド時に自動生成されるため、リポジトリに含める必要はない

### 4-B: 開発時と本番時の PWA 挙動差

`disable: process.env.NODE_ENV === 'development'` の設定により:
- `npm run dev` では Service Worker は登録されない（ホットリロードが正常に動作する）
- `npm run build && npm run start` でのみ Service Worker が有効になる

Acceptance Criteria の AC-5 と AC-6 は `npm run start`（本番モード）でのみ確認可能。
`npm run dev` 環境で「オフラインが動かない」と誤判断しないこと。

### 4-C: Markdown パーサ選定の注意点

**`remark` バージョン互換性**: remark v15 以降は純粋 ESM のみ。
`next.config.mjs`（ESM）を使っているプロジェクトでは問題ないが、
`require()` を使う箇所があると ` ERR_REQUIRE_ESM` が発生する。
`src/lib/articles.ts` は `import` 構文を使うこと。

**`remark-rehype` → `rehype-stringify` のパイプライン**:
remark だけでは HTML 文字列にならない。`remark-rehype` で hast に変換し、
`rehype-stringify` で HTML 文字列にする 2 ステップが必要。
`remark().use(remarkGfm).use(remarkRehype).use(rehypeStringify)` の順序を守ること。

### 4-D: Tailwind Typography プラグイン

記事本文の見出し・段落・リスト・引用のスタイリングに `@tailwindcss/typography` の
`prose` クラスを使うことを推奨する。未インストールの場合は追加が必要:

```
npm install -D @tailwindcss/typography
```

`tailwind.config.ts` の `plugins` 配列に `require('@tailwindcss/typography')` を追加。
ダークテーマとの調和: `prose-invert` クラスを合わせて適用することで
ダークバックグラウンド上でも可読性を保てる。

### 4-E: next-sitemap の postbuild タイミング

`next-sitemap` は `next build` の出力（`.next/` ディレクトリ）を参照して動作する。
Vercel の CI/CD では `npm run build` の後に `npm run postbuild` が自動的に実行される
（npm の `postbuild` フック）。
`package.json` に `"postbuild": "next-sitemap"` を追加することを確認すること。

`NEXT_PUBLIC_SITE_URL` が未設定の場合は `https://sleep-forecast.vercel.app`
をデフォルト値としてフォールバックさせること（ローカルで `npm run build` した際に
localhost の URL が sitemap に入らないようにするため）。

### 4-F: OGP 画像（og:image）の MVP 方針

OGP 画像の動的生成（`@vercel/og`）は F005 スコープ外。
MVP では `public/og-default.png`（1200x630px）を 1 枚配置し、全ページ共通で使う。
Next.js の `metadata.openGraph.images` に絶対 URL（`${SITE_URL}/og-default.png`）を設定。
画像は単純な文字ロゴ画像で十分。動的 OGP 生成は F007 以降の改善タスクとして記録する。

---

## 5. 非スコープ（F005 セッションではやらない）

以下は明示的に今セッションのスコープ外とする。Generator は手を付けないこと。

| 項目 | 理由 | 担当 STEP |
|---|---|---|
| 記事 10 本の完全執筆（残り 7 本） | 品質確保のため別セッションで対応 | F006 以降 |
| AdSense コード埋め込み（`AdBanner.tsx`） | F006 の専管 | F006 |
| `/about`, `/privacy`, `/terms`, `/contact` の本実装 | F006 の専管 | F006 |
| GA4 トラッキングコード導入 | F006 の専管 | F006 |
| 動的 OGP 画像生成（`@vercel/og`） | 工数過多 | F007 以降 |
| BreadcrumbList JSON-LD | F006 でまとめて対応 | F006 |
| WebApplication JSON-LD（トップページ） | F006 でまとめて対応 | F006 |
| Vitest / Playwright の自動テスト追加 | Test Engineer の担当 | /next-feature パイプライン |
| `runtimeCaching` のカスタマイズ | デフォルト設定で十分 | 必要になった時点で対応 |

---

## 6. 実装後の検証チェックリスト（Generator 向け）

Evaluator が採点する前に、Generator 自身が以下を確認すること:

- [ ] `npm run build` がエラーなく完了する
- [ ] `npm run lint` が警告ゼロで完了する
- [ ] `/articles/kiatsu-zutsu` にブラウザでアクセスして記事が表示される
- [ ] ページソースに `application/ld+json` の script タグが存在する
- [ ] `npm run build && npm run start` 後に `/sitemap.xml` が 200 を返す
- [ ] Chrome DevTools Application > Manifest でマニフェストが読み込まれている
- [ ] `public/sw.js` が `npm run build` 後に存在する
- [ ] `.gitignore` に `public/sw.js` と `public/workbox-*` が追加されている
- [ ] 記事内に医療免責文が含まれている
- [ ] `npm run dev` でホットリロードが正常に動作する（Service Worker が干渉しない）

---

*Last updated by Planner Agent — 2026-04-10*
*Generator は実装開始前に `harness/feature-list.json` F005 エントリも必ず参照すること*

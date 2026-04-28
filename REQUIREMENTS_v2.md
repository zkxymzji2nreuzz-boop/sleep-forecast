# SleepForecast Web — 改善要件定義書 v2.0

作成日: 2026-04-29  
v1→v2 変更理由: 3エージェントレビュー（平均スコア61/100）の全指摘を反映

---

## 0. 前提・背景・スタック確認

- URL: https://sleep-forecast.vercel.app  
- スタック: Next.js 14 App Router / TypeScript strict / Tailwind / Chart.js / localStorage  
- shadcn/ui: ✅ 導入済み（src/components/ui/以下に各種コンポーネント存在確認済み）
- robots.txt: ❌ 未存在（public/に未作成）
- sitemap.xml: ❌ 未存在（app/sitemap.tsも未作成）
- Service Worker: ❌ 未実装（manifest.jsonは完備）
- 現状スコア: Meta Agent 64.5/100

---

## 1. 修正項目一覧（v2更新版）

| ID | 優先度 | 分類 | タイトル | v1からの変更 |
|----|--------|------|---------|------------|
| F-01 | 🔴 CRITICAL | モバイル | WeatherWidget横スクロール崩壊修正 | 変更なし |
| F-02 | 🔴 CRITICAL | 機能 | 都道府県設定ページ実装 | 理由説明コピー追加 |
| F-03 | 🔴 CRITICAL | UX | 初回オンボーディングフロー | 記録完了までのフロー強化 |
| F-04 | 🔴 CRITICAL | SEO | 記事日付の分散（バックデートなし） | ⚠️ 方針変更（下記参照） |
| F-05 | 🔴 CRITICAL | SEO | robots.txt 作成 | sitemap行を実装確定後に追加 |
| F-05b | 🔴 CRITICAL | SEO | sitemap.xml 実装（app/sitemap.ts） | **新規追加（v1スコープ外→必須に格上げ）** |
| F-06 | 🟡 IMPORTANT | SEO | 全ページnoindex/canonicalインベントリ | noindex対象を全ルートで明示 |
| F-07 | 🟡 IMPORTANT | PWA | Service Worker 実装（serwist使用） | next-pwa→serwistに変更 |
| F-08 | 🟡 IMPORTANT | a11y | 全チャートaria-label確認・追加 | スコープ拡大（WeatherWidget+ダッシュボード） |
| F-09 | 🟡 IMPORTANT | UX | WeatherWidgetスコアの説明テキスト追加 | 変更なし |
| F-10 | 🟡 IMPORTANT | UX | データ分離の注意書き（Web↔iOS非連動） | 変更なし |
| F-11 | 🟢 NICE | UX | 記事末尾CTA視認性向上 | 変更なし |
| F-12 | 🟢 NICE | UX | ホームに「使い方3ステップ」セクション追加 | 変更なし |

---

## 2. 各項目の詳細仕様（v2）

### F-01: WeatherWidget横スクロール崩壊修正 🔴

**現状の問題**  
scrollWidth 1296px vs clientWidth 646px。WeatherWidget内のテーブルが固定幅レイアウト。

**実装ファイル**: `src/components/WeatherWidget.tsx`  
**重要**: このコンポーネントはすでに `'use client'` 宣言済み。変更時も保持すること。

**修正内容**
1. テーブルを含む全セクションに `overflow-x-auto` ラッパー追加
2. 5日間予報: `grid-cols-5` → `grid-cols-3 sm:grid-cols-5`（3列表示 on モバイル）
3. 気圧グラフcanvas: `min-h-[160px] w-full` で縦横比保持
4. 気象テーブル: `min-w-[320px]` を最小幅として設定し、親に `overflow-x-auto`
5. WeeklyForecastSection（5日間予報）: カード1枚の `min-w` を削除 or `flex-wrap` 対応

**受け入れ基準**  
```js
// Chromeデベロッパーツールで375px（iPhone SE）シミュレート時
document.documentElement.scrollWidth === document.documentElement.clientWidth
// → true であること
```

---

### F-02: 都道府県設定ページ実装 🔴

**現状の問題**  
settings/page.tsx が `<ComingSoon />` のみ表示。データ層（storage.ts）は実装済み。

**重要**: settings/page.tsx は Server Component（`'use client'` なし）。  
都道府県セレクタは `'use client'` コンポーネントに切り出す必要あり。

**実装構成**
```
src/app/settings/page.tsx         → Server Component（metadata + クライアント分離）
src/components/SettingsForm.tsx   → 'use client' コンポーネント（新規作成）
```

**SettingsForm コンポーネント仕様**
```tsx
'use client';
// useState + useEffect で localStorage からプリセット値取得
// getDefaultPrefectureCode() で初期値
// PREFECTURES（src/lib/prefectures.ts）からセレクト選択肢生成
// saveDefaultPrefectureCode() で保存
// 保存成功時: useToast() でトースト表示
```

**UI要素**
1. ページタイトル: 「設定」
2. セクション「地域の設定」
   - 説明文: 「気圧予報は入力した地域の気象データを使用します。正確な予報のため、最寄りの都道府県を選択してください。」
   - shadcn/ui `<Select>` で47都道府県
   - 「保存する」ボタン
3. セクション「データ管理」
   - 説明文: 「記録したデータはこのブラウザにのみ保存されています。」
   - 「全ての記録データを削除」ボタン（`variant="destructive"`）
   - クリック時: shadcn/ui `<Dialog>` で確認ダイアログ
   - 確認後: `clearAllRecords()`（storage.tsに関数追加が必要か確認）

**メタデータ**
```ts
export const metadata: Metadata = {
  title: "設定",
  description: "地域設定やデータ管理を行います。",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/settings` },
}
```

---

### F-03: 初回オンボーディングフロー 🔴

**設計原則（v2強化）**  
ユーザーを「訪問」→「設定完了」→「記録完了」→「ダッシュボード初見」まで届けることが目標。バナーを見せるだけでなく、各ステップの完了を検知して次のステップに誘導する。

**3-1. ホームページ: 初回訪問バナー**  
実装ファイル: `src/components/OnboardingBanner.tsx`（新規、`'use client'`）

```tsx
// 表示条件: localStorage.getItem('onboarding_dismissed') === null
// かつ localStorage.getItem('sleep_records_v1') が null or 空配列
```

バナー内容:
```
[SleepForecastへようこそ 🌙]
気象と睡眠の関係を、あなた専用のデータで見える化します。
まず最寄りの都道府県を設定してください。

[設定する] [スキップ（後で設定する）]
```

「スキップ」でも `onboarding_dismissed = "1"` をセット（二度と出ない）。

**3-2. 設定ページ: 保存後の誘導**  
`SettingsForm.tsx` 内で保存成功後:
- トーストに「次は昨夜の睡眠を記録してみましょう」テキスト + /recordへのリンク

**3-3. 記録ページ: 初回記録完了後の誘導**  
`RecordForm.tsx` の保存成功ハンドラに追加:
- 初めての記録（getRecords().length === 0 の状態で保存完了時）は /dashboard へ自動遷移 or ダイアログ「最初の記録が完了しました！ダッシュボードを見てみましょう」

**3-4. ダッシュボード: 空状態改善**  
`src/app/dashboard/page.tsx` の `records.length === 0` 分岐:
- 現在の実装を確認し、空状態UIがない場合は追加
- 表示内容: 「まだ記録がありません。」→「最初の記録をする」ボタン（/record）+ 「都道府県を設定する」ボタン（/settings）

---

### F-04: 記事日付の分散（⚠️ バックデートなし） 🔴

**v1からの方針変更理由**  
v1では「2ヶ月前に遡って日付設定」を提案したが、レビューで指摘された通り、Googleが初回クロールした日（2026-04-10以降）より前の日付をdatePublishedに入れることはスパム扱いリスクがある。

**v2方針: 未来日付への段階的公開スケジュール**  
現在のpublishedAtをそのまま維持しつつ、updatedAtを記事ごとに少しずつ異なる日付にすることで「定期的に更新されているサイト」を示す。さらに今後の記事追加時は日付を分散させる。

**今回の変更**:
- `publishedAt` は全記事「2026-04-10」のまま維持（過去クロール日との整合性保持）
- `updatedAt` を記事ごとに異なる日付に設定（2026-04-10〜2026-04-28の範囲で分散）

| スラッグ | publishedAt（変更なし） | updatedAt（変更） |
|---------|----------------------|-----------------|
| kiatsu-zutsu | 2026-04-10 | 2026-04-10 |
| kisho-byo-check | 2026-04-10 | 2026-04-11 |
| jiritsu-shinkei | 2026-04-10 | 2026-04-12 |
| suimin-shitsu-up | 2026-04-10 | 2026-04-14 |
| tsuki-to-suimin | 2026-04-10 | 2026-04-16 |
| suimin-fusai | 2026-04-10 | 2026-04-18 |
| kandansa-hirou | 2026-04-10 | 2026-04-20 |
| fuminshou-sign | 2026-04-10 | 2026-04-22 |
| blue-light | 2026-04-10 | 2026-04-24 |
| gaba-supplement | 2026-04-10 | 2026-04-28 |

**注意**: showUpdated条件（`article.updatedAt !== article.publishedAt`）がArticleLayoutに実装済みなので、updatedAt変更により記事ページに「更新: YYYY年M月D日」が自然に表示される。

---

### F-05: robots.txt 作成 🔴

**作成先**: `public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /record
Disallow: /settings
Disallow: /api/

Sitemap: https://sleep-forecast.vercel.app/sitemap.xml
```

**注意**: F-05bのsitemap実装が完了してから同時デプロイすること。

---

### F-05b: sitemap.xml 実装 🔴（v1から格上げ）

**実装ファイル**: `src/app/sitemap.ts`（新規作成、Server Component）

```ts
import type { MetadataRoute } from 'next';
import { getAllArticlesMeta } from '@/lib/articles';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sleep-forecast.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticlesMeta();
  
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
```

**noindexページ（/dashboard, /record, /settings）はsitemapに含めない**

---

### F-06: 全ページnoindex/canonicalインベントリ 🟡

**ページインベントリ**（全ルート）

| ページ | index | canonical | 状態 |
|-------|-------|-----------|------|
| / | ✅ index | ✅ 実装済み | 対応不要 |
| /articles | ✅ index | ✅ 実装済み | 対応不要 |
| /articles/[slug] | ✅ index | ✅ 実装済み | 対応不要 |
| /record | ❌ noindex | 追加必要 | **F-06対象** |
| /dashboard | ❌ noindex | 追加必要 | **F-06対象** |
| /settings | ❌ noindex | 追加必要 | F-02で対処 |
| /about | ✅ index | 未設定 | **軽微: canonical追加推奨** |
| /contact | ✅ index | 未設定 | **軽微: canonical追加推奨** |
| /privacy | ✅ index | 未設定 | 対応不要（法務ページ） |
| /terms | ✅ index | 未設定 | 対応不要（法務ページ） |

**修正対象ファイル**

`src/app/record/page.tsx`:
```ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sleep-forecast.vercel.app';
export const metadata: Metadata = {
  title: "記録",
  description: "毎朝 30 秒で昨晩の眠りを記録します。",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/record` },
};
```

`src/app/dashboard/layout.tsx`:
```ts
// 既存のlayout.tsxにmetadataを追加（現在あるか要確認）
export const metadata: Metadata = {
  title: "ダッシュボード",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/dashboard` },
};
```

---

### F-07: Service Worker 実装 🟡

**パッケージ変更（v1からの修正）**  
`next-pwa` v5 は Next.js 14 App Router で動作不安定 → `@serwist/next` を使用

**インストール**
```bash
npm install @serwist/next serwist
```

**設定: `next.config.js`**（既存設定との統合）
```js
const withSerwist = require('@serwist/next').default({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withSerwist({
  // 既存のnext.config.jsの設定を維持
});
```

**Service Worker本体: `src/app/sw.ts`（新規作成）**
```ts
import type { PrecacheEntry } from 'serwist';
import { Serwist } from 'serwist';
import { defaultCache } from '@serwist/next/worker';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    // 気象API: NetworkFirst（鮮度優先）
    {
      matcher: /^\/api\/weather/,
      handler: 'NetworkFirst',
      options: { cacheName: 'weather-api', networkTimeoutSeconds: 5 },
    },
    // 静的アセット: CacheFirst
    {
      matcher: /\.(?:png|jpg|svg|ico|woff2?)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'static-assets', expiration: { maxAgeSeconds: 7 * 24 * 60 * 60 } },
    },
    // ページ: NetworkFirst（オフラインはキャッシュ）
    {
      matcher: ({ url }) => url.pathname === '/' || url.pathname === '/record',
      handler: 'NetworkFirst',
      options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
    },
  ],
});

serwist.addEventListeners();
```

**オフラインフォールバックページ: `src/app/offline/page.tsx`（新規作成）**
- シンプルなメッセージ: 「オフラインのため表示できません。接続を確認してください。」

---

### F-08: 全チャートaria-label確認・追加 🟡

**スコープ拡大（v1: WeatherWidgetのみ → v2: 全チャート）**

**確認対象と修正内容**

| コンポーネント | チャート | 現在のaria-label | 対応 |
|-------------|---------|----------------|------|
| WeatherWidget.tsx:841 | `<Line>` 気圧グラフ | **なし** → 追加必要 | 追加 |
| dashboard/page.tsx:557 | `<Line>` 睡眠品質推移 | `aria-label="過去 30 日の睡眠品質推移 折れ線グラフ"` ✅ | 対応不要 |
| dashboard/page.tsx:596 | `<Bar>` 気圧別平均 | `aria-label="気圧別の平均睡眠品質"` ✅ | 対応不要 |
| dashboard/page.tsx:606 | `<Bar>` 月齢別平均 | `aria-label="月齢別の平均睡眠品質"` ✅ | 対応不要 |
| WeatherWidget.tsx:1005 | `<svg>` 相関グラフ | `aria-label="睡眠品質と気圧の相関グラフ"` ✅ | 対応不要 |

**修正内容（WeatherWidget.tsx:841のみ）**
```tsx
// 現状
<Line ... />

// 修正後: Chartラッパーに role="img" を追加
<div role="img" aria-label="今後13時間の気圧変化グラフ（hPa）">
  <Line ... />
</div>
```

---

### F-09: WeatherWidgetスコアの説明テキスト追加 🟡

**修正ファイル**: `src/components/WeatherWidget.tsx`

computeWSIScore100()の結果（0-100）に基づくラベルと説明を追加:

```tsx
function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '気象的に眠りやすい夜です', color: 'text-green-400' };
  if (score >= 60) return { label: '気象がやや影響する可能性あり', color: 'text-yellow-400' };
  return { label: '気圧変化に注意が必要な夜です', color: 'text-red-400' };
}
```

スコア数値の下に `<p className="mt-1 text-xs {color}">` でラベルを表示。

---

### F-10: データ分離の注意書き 🟡

**修正ファイル**: `src/app/dashboard/page.tsx`

ページ最下部（medical disclaimerの上）に追加:
```tsx
<p className="mt-4 text-center text-xs text-[#8b92a5]">
  ※ Webアプリの記録データはこのブラウザにのみ保存されます（iOSアプリとは連動しません）
</p>
```

---

### F-11: 記事末尾CTA視認性向上 🟢

**現状確認**: `ArticleLayout.tsx` に既存CTAあり（「今夜の眠りを、明日の予報に」セクション）

**修正内容（軽微）**
1. CTAセクション前に `<hr className="mt-14 border-white/10" />` 追加
2. ボタンラベルを「今日の睡眠を記録する →」に変更
3. モバイルでボタン `w-full sm:w-auto` 追加

---

### F-12: ホームに「使い方3ステップ」セクション追加 🟢

**修正ファイル**: `src/app/page.tsx`

FEATURESセクションの前（or 後）に追加。シンプルな3カラム:

```tsx
const STEPS = [
  { step: '01', icon: Settings, title: '都道府県を設定', desc: '気圧データを地域別に取得します', href: '/settings' },
  { step: '02', icon: Moon, title: '毎朝30秒で記録', desc: '昨夜の眠りを3択でタップするだけ', href: '/record' },
  { step: '03', icon: BarChart3, title: '気象との関係を確認', desc: '記録が溜まると傾向が見えてきます', href: '/dashboard' },
];
```

---

## 3. 実装作業順序（v2確定版）

```
Phase 1（基盤SEO・ファイル準備）— 推定60分
  F-05b app/sitemap.ts 作成
  F-05  public/robots.txt 作成
  F-04  全10記事のupdatedAt修正

Phase 2（noindex・canonical整備）— 推定20分
  F-06  /record, /dashboard, /about, /contact のmetadata修正

Phase 3（コア機能・モバイル）— 推定90分
  F-01  WeatherWidget モバイルレスポンシブ修正
  F-02  設定ページ実装（SettingsForm.tsx新規作成）

Phase 4（UX改善）— 推定60分
  F-03  OnboardingBanner実装（新規コンポーネント + page.tsx/RecordForm.tsx/dashboard修正）
  F-09  WeatherWidgetスコア説明追加
  F-08  WeatherWidget aria-label追加
  F-10  ダッシュボードデータ分離注意書き
  F-12  ホーム3ステップセクション追加
  F-11  記事末尾CTA強化

Phase 5（PWA）— 推定45分
  F-07  @serwist/next インストール・設定・sw.ts作成・offlineページ

最終確認（推定15分）
  npx tsc --noEmit（型エラーゼロ確認）
  git commit & push
  Vercel デプロイURL確認
```

---

## 4. ファイル変更一覧（v2確定版）

| ファイル | 変更種別 | 対応ID |
|---------|---------|--------|
| `public/robots.txt` | 新規作成 | F-05 |
| `src/app/sitemap.ts` | 新規作成 | F-05b |
| `src/content/articles/*.md`（10件） | updatedAt修正 | F-04 |
| `src/app/record/page.tsx` | metadata追加（noindex, canonical） | F-06 |
| `src/app/dashboard/layout.tsx` | metadata追加（noindex, canonical） | F-06 |
| `src/app/about/page.tsx` | canonical追加 | F-06 |
| `src/app/contact/page.tsx` | canonical追加 | F-06 |
| `src/app/settings/page.tsx` | ComingSoon→SettingsForm利用に変更 | F-02 |
| `src/components/SettingsForm.tsx` | 新規作成（'use client'） | F-02 |
| `src/components/WeatherWidget.tsx` | レスポンシブ修正・aria・スコア説明 | F-01, F-08, F-09 |
| `src/components/OnboardingBanner.tsx` | 新規作成（'use client'） | F-03 |
| `src/app/page.tsx` | OnboardingBanner + 3ステップ追加 | F-03, F-12 |
| `src/components/RecordForm.tsx` | 初回記録完了後の遷移/ダイアログ追加 | F-03 |
| `src/app/dashboard/page.tsx` | 空状態改善 + データ分離注意書き | F-03, F-10 |
| `src/components/ArticleLayout.tsx` | CTA強化（区切り線・ボタン全幅） | F-11 |
| `src/app/sw.ts` | 新規作成（serwist SW） | F-07 |
| `src/app/offline/page.tsx` | 新規作成 | F-07 |
| `next.config.js` | @serwist/next 設定追加 | F-07 |
| `package.json` | @serwist/next serwist 追加 | F-07 |
| `src/lib/storage.ts` | clearAllRecords() 関数追加 | F-02 |

---

## 5. localStorage キー一覧（実装者参照用）

| キー | 用途 | 操作関数 |
|------|------|---------|
| `sleep_records_v1` | 睡眠記録 | getRecords / saveRecord / deleteRecord |
| `sleep_default_prefecture` | デフォルト都道府県 | getDefaultPrefectureCode / saveDefaultPrefectureCode |
| `onboarding_dismissed` | オンボーディングバナー表示制御 | 直接操作（localStorage.setItem） |

**F-02で追加が必要な関数** (`storage.ts`):
```ts
export function clearAllRecords(): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
```

---

## 6. スコープ外（今回対応しない）

- Web↔iOSデータ同期（Supabase等のバックエンド実装が必要）
- プッシュ通知バックエンド
- ユーザー認証・アカウント管理
- データエクスポート機能
- E-E-A-T著者プロフィールページ
- 記事ごとのOG画像動的生成
- BreadcrumbList JSON-LD（既存Breadcrumbコンポーネントは視覚的に実装済み）
- Google Search Console 設定（人手作業）

---

## 7. 品質チェックリスト（実装完了後）

```
SEO・ファイル
[ ] https://sleep-forecast.vercel.app/robots.txt が200を返す
[ ] https://sleep-forecast.vercel.app/sitemap.xml が200を返し全記事URLを含む
[ ] /dashboard の <head> に <meta name="robots" content="noindex"> が存在する
[ ] /record の <head> に <meta name="robots" content="noindex"> が存在する
[ ] 10記事のupdatedAtが全て異なる（一覧ページで確認）

モバイル
[ ] Chrome DevTools 375px幅でscrollWidth === clientWidth（横スクロールなし）
[ ] WeatherWidget 5日間予報が3列で折り返し表示される

機能・UX
[ ] /settings で都道府県を選択・保存・再ロード時に反映される
[ ] 初回訪問時（localStorageクリア後）にOnboardingBannerが表示される
[ ] ✕ボタンで閉じると再表示しない
[ ] 初回記録完了後に /dashboard への誘導が表示される

PWA
[ ] Chrome で「ホーム画面に追加」が表示される
[ ] DevTools Application > Service Workers でアクティブ状態
[ ] オフライン時に /offline ページが表示される

TypeScript
[ ] npx tsc --noEmit でエラーゼロ
```

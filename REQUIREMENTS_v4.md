# SleepForecast Web — 改善要件定義書 v4.0（実装確定版）

作成日: 2026-04-29  
v3→v4: 3回目レビュー（平均80.5点）の必須指摘を最終反映

---

## 0. 環境確認済み情報（変更なし）

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 14.2.35 App Router |
| モジュール形式 | next.config.js: ESM（`export default`） |
| TypeScript | strict mode, lib: ["dom", "dom.iterable", "esnext"] |
| shadcn/ui | ✅ Select, Dialog, Button, Toast 等 導入済み |
| PWAパッケージ | ✅ `@ducanh2912/next-pwa` 導入済み |
| robots.txt | ❌ 未作成 |
| sitemap.xml | ❌ 未作成 |
| Article JSON-LD | ✅ datePublished/dateModified 実装済み |
| ContinuousRecordBadge | ✅ ストリーク コンポーネント実装済み |

---

## 1. 修正項目一覧（v4最終確定）

| ID | 優先度 | 分類 | タイトル |
|----|--------|------|---------|
| F-01 | 🔴 CRITICAL | モバイル | WeatherWidget横スクロール崩壊修正 |
| F-02 | 🔴 CRITICAL | 機能 | 都道府県設定ページ実装 |
| F-03 | 🔴 CRITICAL | UX | 初回オンボーディングフロー |
| F-04 | 🔴 CRITICAL | SEO | 記事updatedAtを本日日付（2026-04-29）に更新 |
| F-05 | 🔴 CRITICAL | SEO | robots.txt 作成 |
| F-05b | 🔴 CRITICAL | SEO | sitemap.xml 実装（app/sitemap.ts） |
| F-06 | 🟡 IMPORTANT | SEO | 全ページnoindex/canonical対応 |
| F-06b | 🟡 IMPORTANT | SEO | BreadcrumbList JSON-LD（記事ページのみ） |
| F-07 | 🟡 IMPORTANT | PWA | runtimeCaching追加 + offlineページ |
| F-08 | 🟡 IMPORTANT | a11y | WeatherWidget気圧グラフ aria-label |
| F-09 | 🟡 IMPORTANT | UX | WeatherWidgetスコア説明テキスト |
| F-10 | 🟡 IMPORTANT | UX | データ分離注意書き（Web↔iOS非連動） |
| F-11 | 🟢 NICE | UX | 記事末尾CTA強化 |
| F-12 | 🟢 NICE | UX | ホーム「使い方3ステップ」 |

---

## 2. 詳細仕様（v4変更箇所のみ記載）

### F-01: WeatherWidget モバイル修正 🔴

**変更なし（v3と同じ）**
- overflow-x-auto ラッパー追加
- 5日間予報 `grid-cols-3 sm:grid-cols-5`
- 気圧グラフ `w-full min-h-[160px]`

**追加（v4新規）: 都道府県未設定バナー**

WeatherWidgetのヘッダー直下（スコア表示エリア上）に追加:

```tsx
// WeatherWidget.tsx 内に追加
'use client'; // 既存
import { getDefaultPrefectureCode } from '@/lib/storage'; // 追加import

// WeatherWidgetコンポーネント内
const [showPrefBanner, setShowPrefBanner] = useState(false);

useEffect(() => {
  const code = getDefaultPrefectureCode();
  const dismissed = localStorage.getItem('onboarding_dismissed');
  // スキップしたユーザーかつ都道府県未設定（デフォルト東京使用中）の場合に表示
  if (dismissed === '1' && !code) setShowPrefBanner(true);
}, []);

// JSXに追加（スコア表示の下）:
{showPrefBanner && (
  <div className="mt-2 flex items-center justify-between rounded-lg border border-yellow-400/20 bg-yellow-500/5 px-3 py-2 text-xs">
    <span className="text-[#8b92a5]">📍 東京の気象データを表示中</span>
    <Link href="/settings" className="text-yellow-400 underline hover:text-yellow-300" onClick={() => setShowPrefBanner(false)}>
      地域を設定する
    </Link>
  </div>
)}
```

---

### F-02: 都道府県設定ページ 🔴

**v3から変更: SettingsFormのSSR/CLS対応**

`if (!mounted) return null` ではなくスケルトン表示を使用:

```tsx
'use client';
import { useState, useEffect } from 'react';

export function SettingsForm() {
  const [selectedCode, setSelectedCode] = useState<string>('13');
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    const code = getDefaultPrefectureCode();
    if (code) setSelectedCode(code);
  }, []);

  // CLSを防ぐ: nullではなくスケルトンを返す
  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 rounded-md bg-white/[0.05]" />
        <div className="h-10 w-32 rounded-md bg-white/[0.05]" />
      </div>
    );
  }

  // 以下は v3と同じ（Select, Button, AlertDialog）
  const handleSave = () => {
    saveDefaultPrefectureCode(selectedCode);
    toast({
      title: '設定を保存しました ✓',
      description: '次は昨夜の睡眠を記録してみましょう。',
    });
    // トーストのaction プロパティに /record リンクを設置（shadcn ToastAction）
  };

  // ... rest of component
}
```

**その他の仕様はv3と同じ**（理由説明コピー、AlertDialog確認、clearAllRecords実装）

---

### F-03: 初回オンボーディング 🔴

**v3から変更: 初回記録完了後の遷移方式**

自動遷移（`router.push`）からトーストによるユーザー主導遷移に変更:

```tsx
// RecordForm.tsx の保存成功ハンドラ（修正後）
const existingCount = getRecords().length; // 保存前のカウント（同期localStorage確認）
saveRecord(newRecord); // 同期処理

if (existingCount === 0) {
  // 初回記録: 即時自動遷移ではなく、トーストでダッシュボードへ誘導
  toast({
    title: '🎉 最初の記録が完了しました！',
    description: 'ダッシュボードで今日の気象との関係を確認できます。',
    action: (
      <ToastAction altText="ダッシュボードを見る" asChild>
        <Link href="/dashboard">確認する</Link>
      </ToastAction>
    ),
    duration: 6000, // 6秒間表示
  });
} else {
  // 2回目以降: 通常の保存完了トースト
  toast({ title: '記録しました ✓' });
}
```

**注意事項（実装者向け）**:
- `saveRecord` はlocalStorage.setItemを使う**同期処理**。非同期化した場合はこのパターンを見直す必要あり
- 複数タブ同時開放時は古いカウントを参照する可能性があるが、現フェーズでは許容範囲内

**3-4. ダッシュボード空状態UI（v3から変更: ボタン優先度修正）**

```tsx
// ボタンの順序と優先度を明確化
<div className="flex flex-col gap-2 sm:flex-row">
  {/* Primary: 記録するが最優先 */}
  <Button asChild className="bg-[#a78bfa] text-white hover:bg-[#9061f9]">
    <Link href="/record">最初の記録をする</Link>
  </Button>
  {/* Secondary: 設定は補助的 */}
  <Button asChild variant="outline" className="border-white/20 text-[#8b92a5]">
    <Link href="/settings">都道府県を設定する</Link>
  </Button>
</div>
```

**OnboardingBanner（v3と同じ）**:
- 表示条件: `onboarding_dismissed` なし かつ 記録0件
- ✕ or スキップで `onboarding_dismissed = '1'` セット
- スキップ後はWeatherWidgetのバナー（F-01追加分）が都道府県設定を促す

---

### F-04: 記事updatedAt更新 🔴

**全10記事の frontmatter を修正**:
- `updatedAt: "2026-04-29"`（今回の改善実施日）
- `publishedAt`: 変更なし（2026-04-10維持）
- dateModifiedはArticle JSON-LDに自動反映される（既実装確認済み）

**将来の運用ルール（要件書に明記）**:
> 今後は記事本文を実際に更新した日のみ `updatedAt` を変更すること。コンテンツ実態を伴わない日付更新はGoogleシグナルの信頼性を下げるため行わない。

---

### F-05: robots.txt 🔴

**作成先**: `public/robots.txt`

```
# SleepForecast robots.txt
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /record
Disallow: /settings
Disallow: /api/
# 注: /api/ を全体Disallowとしているが、将来公開APIが必要な場合は
# Disallow: /api/private/ に変更することを検討すること

Sitemap: https://sleep-forecast.vercel.app/sitemap.xml
```

---

### F-05b: app/sitemap.ts 🔴

**v3から変更: /privacy, /terms を priority 0.3 に統一（細分化廃止）**

```ts
import type { MetadataRoute } from 'next';
import { getAllArticlesMeta } from '@/lib/articles';
// 注: getAllArticlesMeta は Node.js fs を使用するServer専用関数。
// このsitemap.tsはServerルートなので問題なし。
// Client Componentから import しないこと（ビルドエラーになる）。

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://sleep-forecast.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticlesMeta();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/articles`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: new Date('2026-04-10'), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: new Date('2026-04-10'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date('2026-04-10'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date('2026-04-10'), changeFrequency: 'yearly', priority: 0.3 },
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

---

### F-06: 全ページnoindex/canonical（v3と同じ）

**インデックス可（canonical追加）**: /, /articles, /articles/[slug], /about, /contact, /privacy, /terms  
**noindex（robots + canonical追加）**: /record, /dashboard, /settings  
**対応不要**: layout.tsx で `/` はすでに canonical 設定済み、/articles は設定済み

---

### F-06b: BreadcrumbList JSON-LD（v3と同じ）

**追加先**: `src/app/articles/[slug]/page.tsx`（記事ページのみ、ホーム・記事一覧は追加不要）

---

### F-07: PWA runtimeCaching + offlineページ 🟡

**v4追加: ビルド確認ステップ**

```bash
# 実装後の動作確認手順（next devでは動作しない - PWAはdisable）
npm run build && npm run start
# Chrome DevTools > Application > Service Workers でActive確認
# public/sw.js の内容に 'NetworkFirst' が含まれることを確認
```

**runtimeCaching（v3と同じ）**:
- `/api/weather` → NetworkFirst, networkTimeoutSeconds: 5
- 静的アセット → CacheFirst, 7日間

**offlineページ（v3と同じ）**: `src/app/offline/page.tsx`

---

### F-08〜F-12（v3と同じ）

**F-08**: WeatherWidget気圧グラフ aria-label追加  
**F-09**: スコア説明テキスト（80以上/60〜79/60未満の3段階）  
**F-10**: ダッシュボード最下部にデータ分離注意書き  
**F-11**: 記事末尾CTA前に区切り線 + ボタン全幅・ラベル変更  
**F-12**: ホームに「使い方3ステップ」セクション（Settings/Moon/BarChart3 アイコン）

---

## 3. ファイル変更一覧（v4最終確定・22ファイル）

| ファイル | 変更種別 | 対応ID |
|---------|---------|--------|
| `public/robots.txt` | 新規作成 | F-05 |
| `src/app/sitemap.ts` | 新規作成 | F-05b |
| `src/content/articles/*.md`（10件） | updatedAt → 2026-04-29 | F-04 |
| `src/app/articles/[slug]/page.tsx` | BreadcrumbList JSON-LD追加 | F-06b |
| `src/app/record/page.tsx` | noindex + canonical追加 | F-06 |
| `src/app/dashboard/layout.tsx` | noindex + canonical追加 | F-06 |
| `src/app/about/page.tsx` | canonical追加 | F-06 |
| `src/app/contact/page.tsx` | canonical追加 | F-06 |
| `src/app/privacy/page.tsx` | canonical追加 | F-06 |
| `src/app/terms/page.tsx` | canonical追加 | F-06 |
| `src/app/settings/page.tsx` | ComingSoon削除、SettingsForm使用 | F-02 |
| `src/components/SettingsForm.tsx` | 新規作成（skeleton付き'use client'） | F-02 |
| `src/lib/storage.ts` | clearAllRecords() 追加 | F-02 |
| `src/components/WeatherWidget.tsx` | レスポンシブ + 都道府県バナー + aria + スコア説明 | F-01, F-08, F-09 |
| `src/components/OnboardingBanner.tsx` | 新規作成（'use client'） | F-03 |
| `src/app/page.tsx` | OnboardingBanner + 3ステップ追加 | F-03, F-12 |
| `src/components/RecordForm.tsx` | 初回記録完了後トースト + ダッシュボードリンク | F-03 |
| `src/app/dashboard/page.tsx` | 空状態UI + ボタン優先度 + データ分離注意書き | F-03, F-10 |
| `src/components/ArticleLayout.tsx` | CTA前区切り線 + ボタン全幅 | F-11 |
| `src/app/offline/page.tsx` | 新規作成 | F-07 |
| `next.config.js` | runtimeCaching追加 | F-07 |

---

## 4. 実装作業順序（v4最終）

```
Phase 1: SEO基盤（推定60分）
  F-05  public/robots.txt 作成
  F-05b src/app/sitemap.ts 作成
  F-04  全10記事の frontmatter updatedAt を 2026-04-29 に更新
  F-06  全ページ canonical / noindex 設定
  F-06b articles/[slug]/page.tsx に BreadcrumbList JSON-LD 追加

Phase 2: コア機能（推定90分）
  F-01  WeatherWidget モバイル修正 + 都道府県バナー追加
  F-02  storage.ts clearAllRecords 追加
       SettingsForm.tsx 新規作成（skeleton対応）
       settings/page.tsx 実装
  F-07  next.config.js runtimeCaching 追加
       offline/page.tsx 新規作成

Phase 3: UX改善（推定60分）
  F-03  OnboardingBanner.tsx 新規作成
       page.tsx 修正（バナー + 3ステップ）
       RecordForm.tsx 修正（初回トースト + ダッシュボードリンク）
       dashboard/page.tsx 修正（空状態UI + ボタン優先度）
  F-08  WeatherWidget aria-label
  F-09  WeatherWidget スコア説明
  F-10  dashboard データ分離注意書き
  F-11  ArticleLayout CTA強化
  F-12  page.tsx 3ステップ（Phase 3で纏めて）

最終（推定15分）
  npx tsc --noEmit → エラーゼロ
  次のコマンドでPWA動作確認:
    npm run build && npm run start
    Chrome DevTools > Application > SW: Active確認
  git commit & push
  Vercel デプロイ確認
```

---

## 5. localStorage キー一覧

| キー | 用途 | 操作関数 |
|------|------|---------|
| `sleep_records_v1` | 睡眠記録 | getRecords / saveRecord / deleteRecord / clearAllRecords（追加） |
| `sleep_default_prefecture` | 都道府県 | getDefaultPrefectureCode / saveDefaultPrefectureCode |
| `onboarding_dismissed` | バナー制御 | localStorage.setItem 直接 |

**saveRecord はlocalStorage同期処理**。非同期化した場合はRecordForm.tsxの初回判定ロジックを要再検討。

---

## 6. スコープ外

- Web↔iOSデータ同期（バックエンド未実装）
- プッシュ通知バックエンド
- ユーザー認証
- 記事ごとのOG画像動的生成
- E-E-A-T著者プロフィール
- Google Search Console設定（人手作業）

---

## 7. 品質チェックリスト

```
SEO
[ ] /robots.txt 200 OK
[ ] /sitemap.xml 200 OK（全記事スラッグ含む）
[ ] /dashboard: <meta name="robots" content="noindex,nofollow">
[ ] /record: <meta name="robots" content="noindex,nofollow">
[ ] 10記事の updatedAt が 2026-04-29
[ ] 記事ページに BreadcrumbList JSON-LD 存在

モバイル
[ ] 375px幅で横スクロールなし

機能・UX
[ ] /settings で都道府県保存・反映
[ ] onboarding_dismissed なし + 記録0件 → バナー表示
[ ] 閉じると再表示しない
[ ] 都道府県未設定 + スキップ済み → WeatherWidgetに「東京表示中」バナー
[ ] 初回記録完了 → トースト「最初の記録が完了しました！」+ ダッシュボードリンク
[ ] ダッシュボード0件 → 空状態UI（「最初の記録をする」がPrimary）

PWA
[ ] npm run build && npm run start 後にSW Active
[ ] /offline ページ存在

TypeScript
[ ] npx tsc --noEmit でエラーゼロ
```

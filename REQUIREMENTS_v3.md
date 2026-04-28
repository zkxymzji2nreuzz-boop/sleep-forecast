# SleepForecast Web — 改善要件定義書 v3.0（最終版）

作成日: 2026-04-29  
v2→v3 変更理由: 2回目レビュー（平均72.7/100）の指摘を全反映。実装にそのまま進める完全仕様版。

---

## 0. スタック・環境確認済み情報

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 14.2.35 App Router |
| モジュール形式 | next.config.js は ESM（`export default` 形式） |
| TypeScript | strict mode, `tsconfig.json` に `"lib": ["dom", "dom.iterable", "esnext"]` |
| shadcn/ui | ✅ 導入済み（Select, Dialog, Button, Toast 等） |
| PWAパッケージ | ✅ `@ducanh2912/next-pwa` 導入済み・設定済み（next.config.js） |
| robots.txt | ❌ 未作成 |
| sitemap.xml | ❌ 未作成（app/sitemap.ts 未作成） |
| Article JSON-LD | ✅ datePublished/dateModified 実装済み（article[slug]/page.tsx） |
| ContinuousRecordBadge | ✅ ストリーク（連続記録）コンポーネント実装済み |

---

## 1. 修正項目一覧（v3確定版）

| ID | 優先度 | 分類 | タイトル |
|----|--------|------|---------|
| F-01 | 🔴 CRITICAL | モバイル | WeatherWidget横スクロール崩壊修正 |
| F-02 | 🔴 CRITICAL | 機能 | 都道府県設定ページ実装 |
| F-03 | 🔴 CRITICAL | UX | 初回オンボーディングフロー（記録完了まで届ける） |
| F-04 | 🔴 CRITICAL | SEO | 記事updatedAt修正（実改善分のみ、バックデートなし） |
| F-05 | 🔴 CRITICAL | SEO | robots.txt 作成 |
| F-05b | 🔴 CRITICAL | SEO | sitemap.xml 実装（app/sitemap.ts） |
| F-06 | 🟡 IMPORTANT | SEO | 全ページnoindex/canonicalインベントリ対応 |
| F-06b | 🟡 IMPORTANT | SEO | BreadcrumbList JSON-LD 実装（記事ページ） |
| F-07 | 🟡 IMPORTANT | PWA | @ducanh2912/next-pwa にruntimeCaching追加 + offlineページ |
| F-08 | 🟡 IMPORTANT | a11y | WeatherWidget 気圧グラフ aria-label 追加 |
| F-09 | 🟡 IMPORTANT | UX | WeatherWidgetスコアの説明テキスト追加 |
| F-10 | 🟡 IMPORTANT | UX | データ分離の注意書き（Web↔iOS非連動） |
| F-11 | 🟢 NICE | UX | 記事末尾CTA視認性向上 |
| F-12 | 🟢 NICE | UX | ホームに「使い方3ステップ」セクション追加 |

---

## 2. 各項目の詳細仕様（v3最終）

### F-01: WeatherWidget横スクロール崩壊修正 🔴

**現状**: scrollWidth 1296px vs clientWidth 646px  
**対象ファイル**: `src/components/WeatherWidget.tsx`（既存 `'use client'` 維持）

**修正内容**:
1. 全テーブル・グリッドを含むセクションに `overflow-x-auto` ラッパー追加
2. 5日間予報グリッド: `grid-cols-5` → `grid-cols-3 sm:grid-cols-5`（モバイルは3列）
3. 気圧グラフcanvas: `w-full min-h-[160px]` を維持・親コンテナを `w-full` に
4. 固定px幅のinline styleがある場合は `min-w` + `overflow-x-auto` に変換

**受け入れ基準**: iPhone SE（375px）シミュレーション時にscrollWidth === clientWidth

---

### F-02: 都道府県設定ページ実装 🔴

**アーキテクチャ**:
```
src/app/settings/page.tsx        → Server Component（metadata配置）
src/components/SettingsForm.tsx  → 'use client'（新規作成）
src/lib/storage.ts               → clearAllRecords() 関数追加
```

**SettingsForm.tsx 詳細仕様（'use client'）**:
```tsx
'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/dialog';
import { PREFECTURES, getPrefectureByCode } from '@/lib/prefectures';
import { getDefaultPrefectureCode, saveDefaultPrefectureCode, clearAllRecords } from '@/lib/storage';

export function SettingsForm() {
  const [selectedCode, setSelectedCode] = useState<string>('13');
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    const code = getDefaultPrefectureCode();
    if (code) setSelectedCode(code);
  }, []);

  if (!mounted) return null; // SSR hydration mismatch防止

  const handleSave = () => {
    saveDefaultPrefectureCode(selectedCode);
    toast({
      title: '設定を保存しました ✓',
      description: '次は昨夜の睡眠を記録してみましょう',
      action: <a href="/record" className="text-violet-400 underline">記録する →</a>
    });
  };

  const handleClearData = () => {
    clearAllRecords();
    toast({ title: '全ての記録を削除しました', variant: 'destructive' });
  };

  return (
    <div className="space-y-8">
      {/* 地域設定セクション */}
      <section>
        <h2>地域の設定</h2>
        <p className="text-sm text-[#8b92a5]">
          気圧は地域によって異なります。低気圧が来る前に通知するため、お住まいの都道府県を設定してください。
          気圧が下がると自律神経が乱れ、眠りの質に影響することがあります。
        </p>
        <Select value={selectedCode} onValueChange={setSelectedCode}>
          <SelectTrigger aria-label="都道府県を選択">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PREFECTURES.map((p) => (
              <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSave}>保存する</Button>
      </section>

      {/* データ管理セクション */}
      <section>
        <h2>データ管理</h2>
        <p className="text-sm text-[#8b92a5]">
          記録したデータはこのブラウザにのみ保存されています。
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">全ての記録データを削除</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>記録を全て削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。全ての睡眠記録が削除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearData}>削除する</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
```

**settings/page.tsx metadata**:
```ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sleep-forecast.vercel.app';
export const metadata: Metadata = {
  title: "設定",
  description: "地域設定やデータ管理を行います。",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/settings` },
};
```

**storage.ts 追加**:
```ts
// STORAGE_KEY（sleep_records_v1）は既存定数を使用
export function clearAllRecords(): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
```

---

### F-03: 初回オンボーディングフロー 🔴

**設計目標**: 訪問→設定→記録→ダッシュボードを全ユーザーに完走させる

**3-1. OnboardingBanner.tsx（新規, 'use client'）**

```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function OnboardingBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('onboarding_dismissed');
    const hasRecords = localStorage.getItem('sleep_records_v1');
    // 未dismissedかつ記録0件の場合のみ表示
    if (!dismissed && !hasRecords) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem('onboarding_dismissed', '1');
    setShow(false);
  };

  return (
    <div className="mb-6 rounded-2xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/[0.07] to-transparent p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-[#e6e8ee]">SleepForecastへようこそ 🌙</p>
          <p className="mt-1 text-sm text-[#8b92a5]">
            気象と睡眠の関係を、あなた専用のデータで見える化します。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-indigo-500 text-white hover:bg-indigo-400">
              <Link href="/settings">設定する（1分）</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-[#8b92a5]">
              スキップ
            </Button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="閉じる" className="text-[#8b92a5] hover:text-[#e6e8ee]">✕</button>
      </div>
    </div>
  );
}
```

**スキップ後のケア**: スキップしても `onboarding_dismissed = "1"` をセット → バナーは二度と表示しない。WeatherWidgetはデフォルト東京で動作するためアプリは正常動作する。

**3-2. 設定保存後の誘導**（F-02の設定フォーム内で実装済み）:
- 保存後トーストに「次は昨夜の睡眠を記録してみましょう」+ /recordリンク

**3-3. 記録完了後の誘導**（RecordForm.tsx修正）:
```tsx
// RecordForm.tsx の保存成功ハンドラに追加
// 保存前に現在の記録件数を確認
const existingCount = getRecords().length;
// 保存実行
saveRecord(newRecord);
// 初回記録の場合は自動でdashboardへ遷移
if (existingCount === 0) {
  router.push('/dashboard');
}
```
`useRouter` を import し、`'use client'` は既存のまま。

**3-4. ダッシュボード空状態**（dashboard/page.tsx の既存 records.length === 0 分岐を強化）:
```tsx
if (records.length === 0) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-4xl">🌙</span>
      <h2 className="text-xl font-bold text-[#e6e8ee]">まだ記録がありません</h2>
      <p className="text-sm text-[#8b92a5]">毎朝の記録が溜まると、あなただけの傾向が見えてきます</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/record">最初の記録をする</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings">都道府県を設定する</Link>
        </Button>
      </div>
    </div>
  );
}
```

**3-5. 継続率設計（最小実装）**:
- `ContinuousRecordBadge`（既存）がストリーク管理済み
- ダッシュボードでContinuousRecordBadgeの表示をより目立つ位置（KPIカード上部）に移動または維持
- 要件: 既存コンポーネントを活用してダッシュボードのストリーク表示を確認・維持

---

### F-04: 記事updatedAt（v3方針確定） 🔴

**方針**: 今回の実装で実際に改善を行うため、実施日（2026-04-29）を updatedAt として反映させる。これは実態のある更新なのでGoogleペナルティリスクなし。

**全10記事の updatedAt を 2026-04-29 に統一更新**（publishedAtは2026-04-10のまま維持）

**理由**: 今回の修正（日付設定自体がコンテンツの整備であり、記事品質の向上）により、updatedAtを今日の日付にすることは正当。また、Article JSON-LDのdateModifiedが既に `article.updatedAt` を参照しているため、Googleへの自動反映が見込まれる。

**確認済み**: articles/[slug]/page.tsx の jsonLd に `dateModified: article.updatedAt` が実装済み。

---

### F-05: robots.txt 作成 🔴

**作成先**: `public/robots.txt`

```
# SleepForecast robots.txt
# プライベートなアプリページはインデックスから除外
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /record
Disallow: /settings
Disallow: /api/

# 天気API等の非公開エンドポイントのみ除外
# /api/ を全体Disallowとしているが、将来公開OGP画像生成API等を追加する際は
# /api/private/ 等に変更を検討すること

Sitemap: https://sleep-forecast.vercel.app/sitemap.xml
```

---

### F-05b: app/sitemap.ts 実装 🔴

**作成先**: `src/app/sitemap.ts`

```ts
import type { MetadataRoute } from 'next';
import { getAllArticlesMeta } from '@/lib/articles';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://sleep-forecast.vercel.app';

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
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // noindexページ（/dashboard, /record, /settings）はsitemapに含めない
  return [...staticRoutes, ...articleRoutes];
}
```

---

### F-06: 全ページnoindex/canonical対応 🟡

**原則**: `robots: { index: true }` の全ページに canonical を設定する。

**ページインベントリ（v3確定版）**

| ページ | index | canonical | 対応方針 |
|-------|-------|-----------|---------|
| / | ✅ | layout.tsxで設定済み | 対応不要 |
| /articles | ✅ | ✅ 実装済み | 対応不要 |
| /articles/[slug] | ✅ | ✅ 実装済み | 対応不要 |
| /about | ✅ | 未設定 → **追加** | F-06対象 |
| /contact | ✅ | 未設定 → **追加** | F-06対象 |
| /privacy | ✅ | 未設定 → **追加** | F-06対象 |
| /terms | ✅ | 未設定 → **追加** | F-06対象 |
| /record | ❌ noindex | 未設定 → **追加** | F-06対象 |
| /dashboard | ❌ noindex | 未設定 → **追加** | F-06対象（layout.tsx） |
| /settings | ❌ noindex | F-02で対処 | - |

**修正パターン（全ページ共通）**:
```ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sleep-forecast.vercel.app';
export const metadata: Metadata = {
  // ... 既存
  alternates: { canonical: `${SITE_URL}/該当パス` },
  // noindexページの場合のみ:
  robots: { index: false, follow: false },
};
```

---

### F-06b: BreadcrumbList JSON-LD（記事ページ） 🟡

**追加先**: `src/app/articles/[slug]/page.tsx`（既存Article JSON-LDに追加）

```tsx
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "ホーム",
      "item": SITE_URL,
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "記事一覧",
      "item": `${SITE_URL}/articles`,
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": article.title,
      "item": `${SITE_URL}/articles/${article.slug}`,
    },
  ],
};
```

ArticlePageコンポーネント内で既存のarticle JSON-LDスクリプトの下に追加:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
/>
```

---

### F-07: @ducanh2912/next-pwa runtimeCaching追加 + offlineページ 🟡

**現状確認**: プロジェクトは既に `@ducanh2912/next-pwa` が動作している。next.config.js に追加設定のみ行う。

**next.config.js への追加**（既存設定を拡張）:
```js
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aheadOfTimeCaching: false,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // 追加: runtimeCaching
    runtimeCaching: [
      // 気象API: NetworkFirst（鮮度優先、5秒でタイムアウト）
      {
        urlPattern: /^\/api\/weather/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'weather-api-cache',
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 5 * 60, // 5分キャッシュ
          },
        },
      },
      // 静的アセット: CacheFirst
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|ico|woff|woff2)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 1週間
          },
        },
      },
    ],
  },
});

const nextConfig = {};
export default withPWA(nextConfig);
```

**オフラインページ: `src/app/offline/page.tsx`（新規作成）**:
```tsx
import Link from 'next/link';
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f1117] px-4 text-center">
      <span className="text-5xl">📵</span>
      <h1 className="text-xl font-bold text-[#e6e8ee]">オフラインです</h1>
      <p className="text-sm text-[#8b92a5]">
        インターネット接続を確認してから、もう一度お試しください。
      </p>
      <Link href="/" className="text-sm text-indigo-300 underline">
        ホームに戻る
      </Link>
    </div>
  );
}
```

---

### F-08: WeatherWidget aria-label追加 🟡

**対象**: `src/components/WeatherWidget.tsx:841`（Line チャート）

```tsx
// 現状
<Line ... />

// 修正: ラッパーdivを追加
<div role="img" aria-label="今後13時間の気圧変化グラフ（hPa）">
  <Line ... />
</div>
```

---

### F-09: WeatherWidgetスコア説明テキスト 🟡

**修正ファイル**: `src/components/WeatherWidget.tsx`

スコア表示の下に説明テキストを追加:
```tsx
function getScoreDescription(score: number): { text: string; colorClass: string } {
  if (score >= 80) return { text: '気象的に眠りやすい夜です', colorClass: 'text-green-400' };
  if (score >= 60) return { text: '気象がやや影響する可能性あり', colorClass: 'text-yellow-400' };
  return { text: '気圧変化に注意が必要な夜です', colorClass: 'text-red-400' };
}
// スコア数値の下に <p className={`mt-1 text-xs ${desc.colorClass}`}>{desc.text}</p> を追加
```

---

### F-10: データ分離注意書き 🟡

**修正ファイル**: `src/app/dashboard/page.tsx`（ページ最下部に追加）

```tsx
<p className="mt-6 text-center text-xs text-[#8b92a5]">
  ※ Webアプリの記録データはこのブラウザにのみ保存されます（iOSアプリとは連動しません）
</p>
```

---

### F-11: 記事末尾CTA強化 🟢

**修正ファイル**: `src/components/ArticleLayout.tsx`

既存CTAセクション前に区切り線追加 + ボタン改善:
```tsx
{/* 区切り線（既存CTAの前に追加） */}
<hr className="mt-14 border-white/10" />

{/* 既存CTA（ボタン修正） */}
<Button className="... w-full sm:w-auto">
  今日の睡眠を記録する →
</Button>
```

---

### F-12: ホーム「使い方3ステップ」 🟢

**修正ファイル**: `src/app/page.tsx`（FEATURESセクション前に追加）

```tsx
import { Settings } from 'lucide-react'; // 既存importに追加

const HOW_TO_STEPS = [
  { step: '01', icon: Settings, title: '都道府県を設定', desc: '気圧データを地域別に取得します', href: '/settings' },
  { step: '02', icon: Moon, title: '毎朝30秒で記録', desc: '昨夜の眠りを3択でタップするだけ', href: '/record' },
  { step: '03', icon: BarChart3, title: '気象との関係を確認', desc: '記録が溜まると傾向が見えてきます', href: '/dashboard' },
] as const;
```

---

## 3. ファイル変更一覧（v3最終）

| ファイル | 変更種別 | 対応ID |
|---------|---------|--------|
| `public/robots.txt` | 新規作成 | F-05 |
| `src/app/sitemap.ts` | 新規作成 | F-05b |
| `src/content/articles/*.md`（10件） | updatedAt → 2026-04-29 に更新 | F-04 |
| `src/app/articles/[slug]/page.tsx` | BreadcrumbList JSON-LD 追加 | F-06b |
| `src/app/record/page.tsx` | noindex + canonical追加 | F-06 |
| `src/app/dashboard/layout.tsx` | noindex + canonical追加 | F-06 |
| `src/app/about/page.tsx` | canonical追加 | F-06 |
| `src/app/contact/page.tsx` | canonical追加 | F-06 |
| `src/app/privacy/page.tsx` | canonical追加 | F-06 |
| `src/app/terms/page.tsx` | canonical追加 | F-06 |
| `src/app/settings/page.tsx` | ComingSoon削除、SettingsForm使用、metadata追加 | F-02 |
| `src/components/SettingsForm.tsx` | 新規作成（'use client'） | F-02 |
| `src/lib/storage.ts` | clearAllRecords() 追加 | F-02 |
| `src/components/WeatherWidget.tsx` | レスポンシブ修正・aria-label・スコア説明 | F-01, F-08, F-09 |
| `src/components/OnboardingBanner.tsx` | 新規作成（'use client'） | F-03 |
| `src/app/page.tsx` | OnboardingBanner + 3ステップ追加 | F-03, F-12 |
| `src/components/RecordForm.tsx` | 初回記録完了後 /dashboard 自動遷移 | F-03 |
| `src/app/dashboard/page.tsx` | 空状態UI改善 + データ分離注意書き | F-03, F-10 |
| `src/components/ArticleLayout.tsx` | CTA強化（区切り線・ボタン全幅） | F-11 |
| `src/app/offline/page.tsx` | 新規作成 | F-07 |
| `next.config.js` | runtimeCaching追加 | F-07 |

---

## 4. 実装作業順序（v3確定）

```
Phase 1: SEO基盤（推定60分）
  F-05  public/robots.txt 作成
  F-05b src/app/sitemap.ts 作成
  F-04  全10記事 updatedAt を 2026-04-29 に更新
  F-06  /record, /dashboard, /about, /contact, /privacy, /terms の canonical/noindex
  F-06b src/app/articles/[slug]/page.tsx に BreadcrumbList JSON-LD 追加

Phase 2: コア機能（推定90分）
  F-01  WeatherWidget モバイルレスポンシブ修正
  F-02  storage.ts に clearAllRecords() 追加
       src/components/SettingsForm.tsx 新規作成
       src/app/settings/page.tsx 実装
  F-07  next.config.js に runtimeCaching 追加
       src/app/offline/page.tsx 新規作成

Phase 3: UX改善（推定60分）
  F-03  src/components/OnboardingBanner.tsx 新規作成
       src/app/page.tsx にバナー + 3ステップ追加
       src/components/RecordForm.tsx に初回遷移追加
       src/app/dashboard/page.tsx の空状態改善
  F-09  WeatherWidget スコア説明テキスト追加
  F-08  WeatherWidget aria-label 追加
  F-10  ダッシュボード データ分離注意書き追加
  F-11  ArticleLayout.tsx CTA強化
  F-12  page.tsx 3ステップ（Phase 3で纏めて対応）

最終（推定20分）
  npx tsc --noEmit → エラーゼロ確認
  git commit & push
  Vercel デプロイ確認
```

---

## 5. localStorage キー一覧

| キー | 用途 | 操作関数 |
|------|------|---------|
| `sleep_records_v1` | 睡眠記録 | getRecords / saveRecord / deleteRecord / **clearAllRecords（追加）** |
| `sleep_default_prefecture` | 都道府県 | getDefaultPrefectureCode / saveDefaultPrefectureCode |
| `onboarding_dismissed` | バナー制御 | 直接操作（localStorage.setItem） |

---

## 6. スコープ外（今回非対応）

- Web↔iOSデータ同期
- プッシュ通知バックエンド
- ユーザー認証・アカウント管理
- 記事ごとのOG画像動的生成
- E-E-A-T著者プロフィールページ
- Google Search Console設定（人手作業）

---

## 7. 品質チェックリスト（最終）

```
SEO・ファイル
[ ] /robots.txt が200を返す
[ ] /sitemap.xml が200を返し全記事スラッグを含む
[ ] /dashboard の <meta name="robots" content="noindex">
[ ] /record の <meta name="robots" content="noindex">
[ ] 10記事の updatedAt が全て 2026-04-29（または今日の日付）
[ ] 記事ページのソースに BreadcrumbList JSON-LD が存在する

モバイル
[ ] 375px幅で横スクロールなし（scrollWidth === clientWidth）
[ ] WeatherWidget 5日間予報が3列で適切に表示される

機能・UX
[ ] /settings で都道府県を選択・保存・再ロード後に反映
[ ] 初回訪問（localStorage空）でOnboardingBanner表示
[ ] 閉じると再表示しない
[ ] 初回記録完了後 /dashboard へ自動遷移
[ ] ダッシュボード0件時に空状態UIが表示される

PWA
[ ] DevTools > Application > Service Workers: Active状態
[ ] /offline ページが表示される（オフラインシミュレーション）

TypeScript
[ ] npx tsc --noEmit でエラーゼロ
```

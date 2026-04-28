# SleepForecast Web — 要件定義書 v5.0

> 作成日: 2026-04-29  
> 前バージョン: v4.0  
> v5 の目的: Chrome実機確認 + 5エージェント並列レビューの知見を統合し、全残存課題を潰す

---

## 変更サマリー

| カテゴリ | 課題数 | 対応方針 |
|---------|--------|---------|
| 🔴 CRITICAL (SEO・UX破損) | 4件 | 即時修正 |
| 🟡 IMPORTANT (バグ・アクセシビリティ) | 7件 | 即時修正 |
| 🟢 NICE-TO-HAVE (コード品質・将来対応) | 4件 | 今サイクルで対応 |

---

## Chrome実機確認結果（2026-04-29）

| ページ | 状態 | 観察事項 |
|-------|------|---------|
| `/` ホーム | ✅ | WeatherWidget表示正常・東京都デフォルト |
| `/articles` | ✅ | **日付表示なし**（コード修正済みを確認） |
| `/articles/[slug]` | ✅ | **日付表示なし**・目次・CTA正常 |
| `/record` | ✅ | フォーム正常・emoji選択・タイム入力 |
| `/settings` | ✅ | 都道府県セレクタ・データ管理・開発セクション非表示 |
| `/dashboard` | ✅ | KPIカード・折れ線グラフY軸ラベル正常 |

---

## 🔴 CRITICAL 課題

### C-01: Article JSON-LD に `image` フィールドが欠落（SEO重大バグ）

**ファイル**: `src/app/articles/[slug]/page.tsx`  
**問題**: Google の Article リッチリザルト表示には `image` フィールドが**必須**。現状では欠落しているため、Google Search Console でリッチリザルトのエラーが発生し、記事がリッチスニペットとして表示されない。  
**修正内容**:
```typescript
// jsonLd に追加
image: {
  "@type": "ImageObject",
  url: `${SITE_URL}/og-default.png`,
  width: 1200,
  height: 630,
},
// publisher に logo 追加
publisher: {
  "@type": "Organization",
  name: "SleepForecast",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/og-default.png`,
    width: 1200,
    height: 630,
  },
},
```

---

### C-02: WeatherWidget が設定変更後に再フェッチしない（UX重大バグ）

**ファイル**: `src/components/WeatherWidget.tsx` L.1153  
**問題**: `useEffect(() => { ... }, [])` の空配列依存で初回レンダー時しかデータを取得しない。ユーザーが `/settings` で都道府県を変更してホームに戻っても東京のままで表示が更新されない。  
**修正内容**: `window` の `storage` イベントをリッスンして再フェッチ。または設定保存時にカスタムイベントを発火する。

```typescript
React.useEffect(() => {
  load(); // 初回

  function handleStorageChange(e: StorageEvent) {
    if (e.key === DEFAULT_PREFECTURE_KEY) load();
  }
  window.addEventListener("storage", handleStorageChange);
  return () => {
    isMounted = false;
    window.removeEventListener("storage", handleStorageChange);
  };
}, []); // eslint-disable-line
```

⚠️ `storage` イベントは**同一タブ内では発火しない**。同一タブ内での変更も検知するには `CustomEvent` を使う。

**推奨修正**: Settings 保存時に `window.dispatchEvent(new CustomEvent("sf:prefecture-changed"))` を発火し、WeatherWidget でそれをリッスンする。

---

### C-03: 新規ユーザーに OnboardingBanner と WeatherWidget 地域バナーが同時表示（UX重大バグ）

**ファイル**: `src/components/WeatherWidget.tsx` L.1192-1203, `src/components/OnboardingBanner.tsx`  
**問題**: 記録0件の新規ユーザーには `OnboardingBanner`（記録促進）と WeatherWidget の `!prefectureSet` バナー（地域設定促進）が同時表示される。情報の優先度が混乱し、UXが散漫になる。  
**修正内容**: WeatherWidget の地域バナーは、記録が0件かつ OnboardingBanner が表示中（`sf_onboarding_dismissed` が未設定）の場合に非表示にする。

```typescript
const [showPrefBanner, setShowPrefBanner] = React.useState(false);

// useEffect 内で判定
const onboardingDismissed = localStorage.getItem("sf_onboarding_dismissed");
const hasRecords = getRecords().length > 0;
const shouldShowPrefBanner = !prefectureSet && (hasRecords || onboardingDismissed !== null);
setShowPrefBanner(shouldShowPrefBanner);

// JSX
{showPrefBanner && ( /* 地域バナー */ )}
```

---

### C-04: ホームページ JSON-LD が CSR のみ（SEO リスク）

**ファイル**: `src/app/page.tsx`  
**問題**: `"use client"` ディレクティブのため、WebApplication スキーマの JSON-LD が SSR されない。Google のクローラーが初回クロール時に構造化データを取得できない可能性がある。  
**修正内容**: JSON-LD 部分を Server Component から `<script>` タグとして埋め込む。ページを Server/Client の分離構成に変更する。

```typescript
// app/page.tsx (Server Component) に変更し、Client 部分を子コンポーネントに分離
// JSON-LD は Server Component で dangerouslySetInnerHTML で出力
```

---

## 🟡 IMPORTANT 課題

### I-01: WeatherWidget `isToday()` がローカルタイムゾーン依存

**ファイル**: `src/components/WeatherWidget.tsx` L.63-67  
**問題**: `isToday()` が `new Date()` のローカル時刻を使っており、JST（Asia/Tokyo）と異なるタイムゾーンのユーザーで「今日」判定がずれる。  
**修正**: `formatDateJst` を `storage.ts` からインポートして使用する。

```typescript
import { DEFAULT_PREFECTURE_KEY, getRecords, formatDateJst } from "@/lib/storage";

function isToday(dateStr: string): boolean {
  return dateStr === formatDateJst(new Date());
}
```

---

### I-02: 重複関数 `getTodayJST` を削除

**ファイル**: `src/components/WeatherWidget.tsx`  
**問題**: WeatherWidget に `getTodayJST()` という関数が存在するが、`storage.ts` の `formatDateJst()` と同一ロジック。DRY 違反。  
**修正**: `getTodayJST` を削除し、`formatDateJst` に統一。

---

### I-03: `localStorage` キー管理の統一

**ファイル**: `src/components/OnboardingBanner.tsx`、`src/lib/storage.ts`  
**問題**: キーが各ファイルに散在。管理が困難で将来的にキー名の食い違いが起きやすい。  
**現状のキー**:
- `sleep_records_v1` — storage.ts で定義済み ✅
- `sf_default_prefecture` — storage.ts の `DEFAULT_PREFECTURE_KEY` で定義済み ✅
- `sf_onboarding_dismissed` — OnboardingBanner.tsx にハードコード ❌

**修正**: `storage.ts` に `ONBOARDING_DISMISSED_KEY = "sf_onboarding_dismissed"` を追加エクスポート。`OnboardingBanner.tsx` と WeatherWidget からインポートして使用。

---

### I-04: `SleepScoreHero` がキーボード非対応

**ファイル**: `src/components/WeatherWidget.tsx`  
**問題**: スコアカード展開ボタンが `<div onClick>` で実装されており、キーボードユーザーが操作不可。WCAG 2.1 SC 2.1.1 違反。  
**修正**:
```tsx
<div
  role="button"
  tabIndex={0}
  aria-expanded={expanded}
  aria-controls="score-detail"
  onClick={() => setExpanded(!expanded)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setExpanded(!expanded);
    }
  }}
>
```

---

### I-05: `PressureAlertBanner` 閉じるボタンのタップターゲット不足

**ファイル**: `src/components/WeatherWidget.tsx`（PressureAlertBanner 内）  
**問題**: 閉じるボタンのパディングが不足で約18px のタップターゲット。WCAG 2.5.5 では 44×44px 以上が推奨（AA 達成基準）。モバイルで誤タップが多発する。  
**修正**:
```tsx
<button
  className="flex-shrink-0 rounded-full p-3 ..."  // p-1 → p-3 に変更
  aria-label="アラートを閉じる"
>
```

---

### I-06: セカンダリテキスト `#8b92a5` のコントラスト比不足

**ファイル**: 全コンポーネント（共通 CSS 変数）  
**問題**: `#8b92a5`（背景 `#0f1117` に対して）のコントラスト比が約 3.8:1。WCAG AA 基準の 4.5:1 を下回る。説明文・メタ情報など多数の箇所で使用。  
**修正案**:
- **Option A**: `#8b92a5` → `#9ba3b5` に変更（コントラスト比 ≈ 5.0:1 でAAパス）
- **Option B**: 現行デザインを維持（小さくない本文テキストには 3:1 が要件、サイズ・ウェイト次第）

⚠️ **ユーザー判断が必要**: デザイントーンへの影響があるため、変更前に確認を取る。

---

### I-07: sitemap の `lastModified` が毎デプロイで変わる

**ファイル**: `src/app/sitemap.ts`  
**問題**: `lastModified: new Date()` はビルド時刻であり、コンテンツが変わっていないのに毎デプロイでGoogle に「更新あり」と伝えてしまう。クロール効率が悪化。  
**修正**: 静的な日付を指定するか、記事の場合は `updatedAt` フロントマターを使用する。

```typescript
// 静的ページ
{ url: `${siteUrl}/`, lastModified: new Date("2026-04-29"), changeFrequency: "daily" },

// 記事ページ
{ url: articleUrl, lastModified: new Date(article.updatedAt), ... }
```

---

## 🟢 NICE-TO-HAVE 課題

### N-01: `isSample` dead code の削除

**ファイル**: `src/components/WeatherWidget.tsx`  
`isSample` state が定義されているが `setIsSample(true)` が呼ばれない。将来使う予定がなければ削除。

---

### N-02: `isToday()` の DRY 化（I-01 と同時対応で解決）

---

### N-03: 記事投稿後の CTA ナビゲーション改善

**ファイル**: `src/components/RecordForm.tsx`（推定）  
**問題**: 記録完了後のナビゲーションが弱い。ダッシュボードへの誘導や「次の気圧変化まで〇時間」を表示するとリテンションが向上する。

---

### N-04: OGP 専用画像の生成（将来対応）

現状 `/og-default.png` が全記事共通。将来的には各記事のタイトルを含んだ OGP 画像を動的生成すると SNS での CTR が向上する（Next.js `ImageResponse` 活用）。

---

## 実装済み確認事項（v4 からの継続）

| 項目 | 状態 |
|------|------|
| 記事ページの日付表示 | ✅ 削除済み（Chrome確認済） |
| 記事一覧の日付表示 | ✅ 削除済み（Chrome確認済） |
| ダッシュボードY軸テキストラベル | ✅ 正常表示（Chrome確認済） |
| 設定画面 開発セクション非表示 | ✅ 確認済 |
| OnboardingBanner 実装 | ✅ 動作確認済 |
| PressureAlertBanner 実装 | ✅ 動作確認済 |
| WeatherWidget テーブルレイアウト | ✅ 確認済 |

---

## 修正実施計画

### Phase A（即時・今サイクル）

1. ✅ C-01: Article JSON-LD `image`/`logo` 追加
2. ✅ C-02: WeatherWidget 設定変更後の再フェッチ
3. ✅ C-03: 新規ユーザーの二重バナー問題
4. ✅ I-01: isToday() JST化
5. ✅ I-02: getTodayJST 重複削除
6. ✅ I-03: localStorage キー統一 (storage.ts に定数化)
7. ✅ I-04: SleepScoreHero キーボードアクセシビリティ
8. ✅ I-05: PressureAlertBanner タップターゲット
9. ✅ I-07: sitemap lastModified 静的日付化

### Phase B（ユーザー確認後）

- I-06: コントラスト比修正（デザイン判断が必要）
- C-04: ホームページ JSON-LD SSR化（リファクタ規模が大きい）

---

## 品質チェックリスト

- [ ] TypeScript エラーなし (`npx tsc --noEmit`)
- [ ] Vercel ビルド成功
- [ ] Chrome 実機：全ページ確認
- [ ] Google Rich Results Test で Article 構造化データ検証
- [ ] 設定変更 → WeatherWidget 更新を実機確認
- [ ] 新規ユーザー状態（localStorage クリア）で二重バナーなしを確認

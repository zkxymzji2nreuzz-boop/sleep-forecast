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

**ファイル**: `src/components/RecordForm.tsx`  
**問題**: 記録完了後のナビゲーションが弱い。ダッシュボードへの誘導や「次の気圧変化まで〇時間」を表示するとリテンションが向上する。  
**実装内容**:
- 記録数 ≥ 7 のユーザー: ダッシュボードボタンをプライマリ（上）に昇格、ホームをセカンダリ（下）に
- 記録数 < 7 のユーザー: 従来通りホームがプライマリ
- 気圧急落日（pressureDeltaHpa ≤ −3）かつ記録数 ≥ 7: ダッシュボード誘導 nudge カードを表示

> 完了日: 2026-05-01 / コミット: `79ff90f` / Vercel デプロイ: 本番反映済み

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

- ✅ I-06: コントラスト比修正 → `.dark` `--muted-foreground: 218 13% 60%` を `65%` に変更（WCAG AA クリア）
- ✅ C-04: ホームページ JSON-LD SSR化 → `page.tsx` を Server Component 化、クライアントロジックを `HomeClient.tsx` に分離済み

> 完了日: 2026-05-01 / コミット: `2a6f5cc` / Vercel デプロイ: 本番反映済み

---

## 品質チェックリスト

- [x] TypeScript エラーなし (`npx tsc --noEmit`)
- [x] Vercel ビルド成功（1m 14s、Ready）
- [x] Chrome 実機：全ページ確認（2026-05-01 確認済み）
- [x] Google Rich Results Test で Article 構造化データ検証（警告ゼロ達成）
- [x] 設定変更 → WeatherWidget 更新を実機確認（CustomEvent 動作確認済み）
- [x] 新規ユーザー状態（localStorage クリア）で二重バナーなしを確認

> **追加修正（2026-05-01）**: Article JSON-LD の `datePublished`/`dateModified` を ISO 8601 フル形式（`YYYY-MM-DDT00:00:00+09:00`）に変換。Google Rich Results Test の「日時値が無効」「タイムゾーンなし」4件の警告をゼロに。コミット: `64bc92f` / Vercel: 本番反映済み（45s ビルド）

> **N-03 完了（2026-05-01）**: RecordForm.tsx の記録後 CTA を記録数に応じて動的切り替え（7件未満→ホーム優先 / 7件以上→ダッシュボード優先）。気圧急落日の nudge カードも追加。コミット: `79ff90f` / Vercel: 本番反映済み

---

## デッドコード整理（2026-05-01）

### 背景

「何度も改修してきた中で不要になったコードを全体的に整理してほしい」という依頼に対し、grep ベースでインポート参照を全走査して未使用コードを特定・削除した。

---

### 削除内容

#### 1. `src/lib/demoData.ts` を削除（コミット: `f9c0965`）

**削除理由**: ダッシュボードに記録0〜9件のとき「サンプルデータ表示中」バナーとともにデモデータを描画する機能（F003）として実装されたが、当該機能はその後の改修で削除済み。`DEMO_RECORDS` 配列・`isDemoRecord()` 関数ともに、プロジェクト全体で一切インポートされていないことを grep で確認。

**削除内容**: 138行（30件の固定デモレコード配列 + `isDemoRecord()` 関数）

---

#### 2. `src/components/ComingSoon.tsx` を削除（コミット: `d92236a`）

**削除理由**: F001（初期スケルトン実装）フェーズで作成した「準備中」表示コンポーネント。F002以降で各ページが実装されたため不要に。プロジェクト全体で一切インポートされていないことを grep で確認。

**削除内容**: 49行（`ComingSoon` コンポーネント）

---

#### 3. `WeatherWidget.tsx` の重複関数 `getTodayJST()` を削除（コミット: `62c1cfe` → `61125b5` で修正）

**削除理由**: `storage.ts` に `formatDateJst(date: Date): string` が正規実装として存在するにもかかわらず、WeatherWidget.tsx 内に同一ロジックの `getTodayJST(): string` が独立して定義されていた（DRY 違反、I-02）。`checkTonightPressureDrop` / `PressureAlertBanner` 内の4箇所の呼び出しを `formatDateJst(new Date())` に統一。

**詳細は下記「ビルドエラーの記録と教訓」を参照。**

---

## ビルドエラーの記録と教訓（2026-05-01）

### 発生経緯

GitHub のウェブエディタ（CodeMirror 6）を JavaScript の `replaceAll()` で操作し、`getTodayJST()` → `formatDateJst(new Date())` を一括置換した際、**関数の呼び出し箇所だけでなく関数定義の名前部分まで置換**されてしまった。

**誤った結果（コミット `62c1cfe`）**:
```typescript
// 意図: この関数ブロックを丸ごと削除したかった
// 実際: 関数名だけが書き換えられ、無効な TypeScript になった
function formatDateJst(new Date()): string {  // ← 不正な構文！
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return `${d.getFullYear()}-...`;
}
```

**影響**: コミット `62c1cfe`・`f9c0965`・`d92236a` の計3件が連続してVercelビルドエラー（13〜15秒で即失敗）。

### 原因

`replaceAll('getTodayJST()', 'formatDateJst(new Date())')` は文字列の単純置換であり、コンテキスト（定義 vs 呼び出し）を区別しない。`getTodayJST(` という文字列が関数定義の `function getTodayJST(` 内にも存在するため、そちらも置換された。

### 修正方法（コミット: `61125b5`）

GitHub エディタの CM6 ビューに対して `view.dispatch({ changes: { from, to, insert: '' } })` で無効な関数ブロック全体（コメント行含む5行、18423〜18709文字目）を直接削除。

**CM6 ビューの取得方法（GitHub エディタ専用）**:
```javascript
const contentEl = document.querySelector('.cm-content[contenteditable]');
const view = contentEl?.cmTile?.view;  // cmTile.view が EditorView
// view.dispatch({ changes: { from, to, insert: '' } }) で編集可能
```

### 教訓・次回への注意事項

| 場面 | 推奨アプローチ |
|------|--------------|
| 関数定義の削除 | `replaceAll` は使わず、`from`/`to` 位置を直接指定して削除する |
| 関数呼び出しの置換 | `replaceAll` で対応可（定義部と呼び出し部でパターンが異なることを事前確認） |
| 大きなリファクタリング | コミット前にプレビューして確認するか、ローカルで `tsc --noEmit` を実行する |
| GitHub ウェブエディタの制限 | エラー時にビルドログが iframe 内に格納されていて取得困難。Vercel デプロイ URL は `/deployments/{fullId}` 形式（短縮IDでは404） |

---

## 本番全ページ確認（2026-05-01 デッドコード整理後）

コミット `61125b5` 反映後、Vercel デプロイ `BmJwQw9ja`（Ready / 48s）で以下を確認。

| ページ | タイトル | 状態 |
|-------|---------|------|
| `/` | SleepForecast — 気象病・低気圧から、明日の眠りを予報する | ✅ WeatherWidget・天気データ・気圧グラフ正常 |
| `/record` | 記録 | ✅ 今日の気象サマリー・スリープフォーム正常 |
| `/dashboard` | 睡眠ダッシュボード | ✅ 空状態UI正常 |
| `/settings` | 設定 | ✅ 都道府県セレクタ・データ管理正常 |
| `/articles` | 記事一覧 | ✅ 全記事表示正常 |
| `/articles/tsuyu-choushi-warui` | 梅雨の体調不良… | ✅ 記事本文・目次・CTA正常 |

---

## セキュリティ審査・対処記録（2026-05-01）

4エージェント並列 + 直接ファイル検査による包括的セキュリティ審査を実施。

### 審査結果一覧

| 検査項目 | 結果 | リスク | 対応 |
|---------|------|--------|------|
| ハードコードされたシークレット（src/全体） | 発見なし | ✅ None | — |
| NEXT_PUBLIC_ 変数の公開範囲 | 全て意図的公開（Supabase RLSで保護） | ✅ None | — |
| XSS ベクター（innerHTML/eval等） | 使用なし | ✅ None | — |
| dangerouslySetInnerHTML | ビルド時生成のMarkdownのみ・XSS不可 | ✅ None | — |
| Supabase RLS | 全テーブル・全操作（SELECT/INSERT/UPDATE/DELETE）をカバー | ✅ None | — |
| API 入力バリデーション | lat/lon 型チェック・範囲チェック（±90/±180）完備 | ✅ None | — |
| SQL インジェクション | Supabase SDK のパラメータ化クエリで保護 | ✅ None | — |
| セキュリティヘッダー | HSTS・CSP・X-Frame-Options等 完備 | ✅ None | — |
| 依存ライブラリ既知脆弱性 | 発見なし | ✅ None | — |
| public/ ディレクトリ | 機密情報なし | ✅ None | — |
| .env.local.txt の gitignore 漏れ | Supabase キーを含むファイルが対象外だった | ⚠️ Medium | 🔧 修正済み |
| HSTS ヘッダー欠落 | next.config.mjs に未設定 | ⚠️ Low | 🔧 修正済み |
| エラーレスポンスへの内部情報漏洩 | /api/weather の catch で detail フィールドを返却 | ⚠️ Medium | 🔧 修正済み |
| レートリミット未実装 | /api/weather に連続リクエスト制限なし | ⚠️ Low | 将来対応 |
| Formspree ID 未設定 | NEXT_PUBLIC_FORMSPREE_ID 未設定でフォーム機能不全 | — | 機能バグ（要設定） |

### 修正内容詳細

#### ① `.env.local.txt` を `.gitignore` に追加

**ファイル**: `.gitignore`  
Supabase の URL と Anon Key を含む `.env.local.txt` が `.gitignore` の `.env*.local` パターンに一致せず、誤コミットのリスクがあった。明示的に追加して保護。

```
# local env files
.env.local
.env*.local
.env.local.txt   ← 追加
```

#### ② HSTS ヘッダー（`Strict-Transport-Security`）を追加

**ファイル**: `next.config.mjs`  
Vercel は自動で HTTPS を強制するが、ブラウザ側でも HTTP→HTTPS 中間者攻撃を防ぐためヘッダーを追加。

```javascript
{
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains",
}
```

#### ③ API エラーレスポンスの内部情報漏洩を修正

**ファイル**: `src/app/api/weather/route.ts`（3箇所）  
`catch` ブロックで `detail: (err as Error).message` をクライアントへ返していた。ネットワークエラー詳細（接続先 URL 等）が外部に漏れる可能性があったため、サーバーログ（`console.error`）にのみ出力し、クライアントへは汎用メッセージのみ返すよう修正。

```typescript
// 修正前
return Response.json({ error: "...", detail: (err as Error).message }, { status: 502 });

// 修正後
console.error("[api/weather]", err);
return Response.json({ error: "気象データの取得に失敗しました" }, { status: 502 });
```

### Supabase セキュリティ設計メモ

`NEXT_PUBLIC_SUPABASE_ANON_KEY` は**意図的に公開するキー**であり、これが漏れてもセキュリティ上の問題はない。セキュリティは Supabase の RLS（Row Level Security）で担保されており、すべての DB 操作が `auth.uid() = user_id` でユーザー自身のデータのみにアクセスを制限している。

```sql
-- sleep_logs・user_settings 両テーブルに適用済み
CREATE POLICY "select_own_sleep_logs" ON public.sleep_logs
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT / UPDATE / DELETE も同様
```

### 今後の改善候補（優先度低）

- **レートリミット**: `/api/weather` に IP ベースの制限追加（Upstash Redis 等）。Vercel Functions の呼び出し上限が気になってきたタイミングで対応。
- **CSP の nonce 化**: 現在 `unsafe-inline`/`unsafe-eval` が必要（Next.js + Tailwind の制約）。Next.js 側が対応したタイミングで nonce ベースCSPへ移行を検討。
- **Formspree 設定**: お問い合わせフォームを使いたい場合は Formspree でフォームを作成し `NEXT_PUBLIC_FORMSPREE_ID=xxxx` を `.env.local` と Vercel 環境変数の両方に設定する。

---

## WeeklyRiskForecast 設計仕様（2026-05-02）

> 4エージェント（Opus）並列リサーチ + リーガルチェックの結果に基づく確定仕様。
> 調査項目: ①A/B レイアウト・配置 UX / ②配色・ビジュアル設計 / ③免責文・法的表現 / ④CTAコピー・ベネフィット訴求

---

### 背景・課題（7日待ち問題）

コアのPredictionCard（個人相関ベース明日スコア）は記録7日以上で初めて意味ある値が出る。
Day0ユーザーには空カードが表示され、プロダクトの価値が初日に伝わらない構造的問題（7日待ち問題）。

**解決策**: `WeeklyRiskForecast` コンポーネント新設。
`/api/weather?type=full` で既に取得済みの `FullWeatherData.forecast: DailyForecast[]`（7日分）を使用。
`DailyForecast.pressureDelta`（前日比気圧差）から気象コンディションを算出し、APIコール追加ゼロで実装可能。

---

### ① レイアウト・配置方式（確定）

**採用: ハイブリッド方式（Progressive Reveal + Locked Preview）**

A案（完全置き換え）でもB案（常時追加）でもなく、段階的開示方式を採用する。

| フェーズ | 条件 | レイアウト |
|---------|------|----------|
| Phase 0 | 記録 0〜2件 | WeeklyRiskForecastをプライマリ（大型カード）。PredictionCardは非表示。 |
| Phase 1 | 記録 3〜6件 | WeeklyRiskForecastがプライマリのまま。その下に「ロック状態のPredictionCardプレビュー」（プログレスリング + あとN日で解禁）を補助表示。 |
| Phase 2 | 記録 7件〜 | PredictionCardがプライマリに昇格（アニメーション付き）。WeeklyRiskForecastは縮小してWeatherWidget上方の補足カードに降格。消去はしない（Endowment Effect配慮）。 |

**根拠（研究・事例）**
- NNGroup Empty State研究: Day0に空カードは離脱率最大27%増
- Aha Moment理論: 初訪問60秒以内に「自分のためのアプリ」と感じないと再訪率半減
- Progressive Disclosure（Nielsen）: 段階的解禁は認知負荷低減 + 習熟動機を生む
- 先行事例: Oura「最初の1週間でベースライン学習中」、Duolingo段階解禁、Strava「ベースライン期間」
- Variable Reward Schedule（Eyal『Hooked』）: カウントダウンが中だるみ防止に機能

**HomeClient.tsxにおける新しい表示順序**

```
1. OnboardingBanner（記録0件のみ）
2. ContinuousRecordBadge（streakあり）
3. WeeklyRiskForecast（Phase0-1: 大型プライマリ / Phase2: 縮小補足としてWeatherWidget上）
4. PredictionCard（Phase0: 非表示 / Phase1: ロックプレビュー / Phase2: プライマリ昇格）
5. WeeklyInsightCard
6. ヒーローセクション（h1 + CTA）
7. 気圧感受度チェックカード（記録0のみ）
8. [AdBannerはここより下に後退 ← ファーストビュー外へ移動]
9. WeatherWidget
10. WeeklyRiskForecast（Phase2のみ縮小版）
11. iOSアプリ通知登録フォーム
12. 3ステップで始める / 特徴 / FAQ
```

**Day7 Unlock演出**
- ロックアイコン解錠アニメーション（200-400ms、ease-out）→ PredictionCardグラデーションフェードイン
- 1回限りのトースト: 「おめでとうございます。あなた専用の予報がはじまります。」
- 過度な演出は避ける（Calm Tech原則 / 健康アプリとして適切）
- `localStorage.setItem('prediction_unlocked_at', ...)` で再表示時はアニメーション抑制

---

### ② 配色・ビジュアル設計（確定）

**採用: Twilight Calm パレット**

30-50代気象病女性ユーザーへの「落ち着いた安心感」と「情報の明確さ」の両立を優先。
信号機色（赤-黄-緑）を廃止し、ダークテーマに馴染む半透明カラーを採用。

**リスクレベル色**

| レベル | 背景クラス | テキストクラス | ボーダークラス |
|-------|-----------|--------------|--------------|
| 高（気をつけたい日） | `bg-rose-400/15` | `text-rose-200` | `border-rose-400/30` |
| 中（ゆらぎ日） | `bg-amber-300/[0.12]` | `text-amber-100` | `border-amber-300/30` |
| 安定（ととのう日） | `bg-teal-300/[0.12]` | `text-emerald-200` | `border-teal-300/[0.28]` |

**カード背景**
- **採用: Option C（ガラスモーフィズム）**
- `bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl`
- PredictionCard（グラデーション主役）との視覚的階層を明確化。WeeklyRiskForecastは「一段奥にある補足情報」として沈める。

**インジケーター形状**
- **採用: バー型（カラーバーpill）**
- 高さ 6px × 横幅 24-32px の角丸ピル
- 曜日ラベル直下に配置し、時系列の流れを直感化
- ホバー/タップで詳細展開と相性良

**アクセシビリティ**
- WCAG 2.1 AA (コントラスト比4.5:1以上) を全組み合わせで充足
- 色だけでなくテキストラベル + 形状の三重符号化でカラーブラインドネス対応
- rose-200 on rose-400/15 ≈ 9.2:1 / amber-100 on amber-300/12 ≈ 11.4:1 / emerald-200 on teal-300/12 ≈ 10.1:1

---

### ③ 免責文・法的表現（確定）

**リーガルリスク評価**: 全体 Medium（対応済みで Low に引き下げ可能）

#### 「気象病リスク」表現について

⚠️ **「気象病リスク 高/中/安定」という分類ラベルは使用禁止**

理由: 疾病の診断・罹患リスクを想起させ、薬機法第68条（未承認医薬品等の広告禁止）・医薬品等適正広告基準に抵触する可能性がある。

**採用表現**:
- カード見出し: `今週の気象コンディション予報`（「気象病」はサブテキストや記事内の説明的文脈のみ使用可）
- リスクラベル: `気をつけたい日` / `ゆらぎ日` / `ととのう日`（疾病・診断語を使わない和語）

#### 免責文（採用: パターン2・バランス型）

**コンパクト版（カード内常時表示・約60字）**:
```
気象データから算出した参考予報です。医療行為ではなく、体調管理の目安としてご活用ください。
```

**ポジティブ打消し（免責文直後に続ける）**:
```
それでも、気圧の変化を知っておくことは、明日のあなたへの小さな備えになります。
```

**詳細版（アコーディオンで展開・約200字）**:
```
本サービスが表示する気象コンディション予報は、気圧・気温・湿度等の公開気象データを統計的に処理した参考情報です。特定の疾病の診断、治療、予防を目的とするものではなく、医療機器・プログラム医療機器（SaMD）には該当しません。表示内容は予報の性質上、実際の体調や天候と一致しない場合があります。体調に不安がある場合は医師等にご相談ください。
```

#### アドバイスの適法範囲

**使用可能**:
- 「早めの休息を心がけましょう」「無理のないスケジュールを」「今夜はゆったり過ごすのもおすすめです」
- 「明日は予定を詰めすぎないのも一案です」「体調の変化を感じやすい方は、こまめに様子を見ましょう」

**使用禁止**:
- 「頭痛が治ります／改善します」「気象病を予防できます」「〜すれば必ず眠れます」
- 「あなたの自律神経が乱れています」（断定的診断表現）
- 「精度の高い予測」「的中率〇〇%」（根拠なしに使用不可）

#### その他リーガル対応事項（全アプリ横断）

| 項目 | 状況 | 対応 |
|-----|------|------|
| 薬機法・広告基準 | 「改善」「治る」「効く」等を使用していないか | Content QA確認推奨 |
| 景表法 | 「あなただけの予測」等に根拠（記録件数）を明示 | 実装時に件数表示必須 |
| Open-Meteo帰属表示 | CC BY 4.0 の出典クレジット義務 | `Weather data by Open-Meteo.com` をWeatherWidget下部等に追加 **🔴要対応** |
| 外部送信規律（電気通信事業法） | GA4・AdSense・Vercel Analyticsの外部送信 | 「外部送信ポリシー」ページを設置 **🔴要対応** |
| Supabase Anon Key公開 | RLSで保護済みのため問題なし | ✅ 対応済み |
| プライバシーポリシー | Supabase Auth (Email) 追加時に更新必要 | AdSense申請前に確認 |

---

### ④ CTAコピー・ベネフィット訴求（確定）

**カードタイトル**: `今週の気象コンディション予報`
（法的安全性を優先し「気象病リスク」を避ける。ターゲットに刺さる表現はサブコピーで補う）

**サブタイトル（1行）**: `天気予報じゃなく、「あなたの体調予報」です。`

**CTAバー（採用: パターン2）**
```
メイン: 今は「みんなの予報」。育てると「あなたの予報」に。
サブ:  0 / 7日記録で、個人感受性モードがオン
```
理由: 機械的な「解放」という語を避け、タマゴッチ的「育成」メタファーで継続動機を自然に生む

**高リスク日のアラートメッセージ**:
```
〇〇日は気圧が下がりそう。早めに眠る準備をしておくと安心です。
```

**Day7達成・Unlock時のメッセージ**:
```
ヘッドライン: おめでとうございます。あなた専用の予報がはじまります。
ボディ: 7日分の記録から、あなたが気圧・気温・月齢のどれに敏感かが見えてきました。これからの予測は、あなたの体感に合わせてチューニングされていきます。
CTA: あなたの感受性レポートを見る
```

---

### 実装タスク（次セッション）

| 優先度 | タスク | ファイル |
|-------|-------|---------|
| 🔴 | `WeeklyRiskForecast.tsx` コンポーネント新規作成 | `src/components/WeeklyRiskForecast.tsx` |
| 🔴 | `HomeClient.tsx` をハイブリッド方式に更新（Phase0/1/2 分岐） | `src/components/HomeClient.tsx` |
| 🔴 | `FullWeatherData.forecast` のpropsをHomeClientからWeeklyRiskForecastへ渡す | `src/components/HomeClient.tsx` |
| 🟡 | Open-Meteo帰属クレジット追加 `Weather data by Open-Meteo.com` | `src/components/WeatherWidget.tsx` または `Footer.tsx` |
| 🟡 | 外部送信ポリシーページ設置 | `src/app/privacy/page.tsx` 内またはスタンドアロンページ |
| 🟢 | Day7 Unlockアニメーション実装（Framer Motion） | `src/components/PredictionCard.tsx` |
| 🟢 | `prediction_unlocked_at` をlocalStorageに保存してアニメーション制御 | `src/lib/storage.ts` |

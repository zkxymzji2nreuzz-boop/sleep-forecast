# SleepForecast Web — 改善要件定義書 v1.0

作成日: 2026-04-29  
ベース: 6エージェント並列レビュー（UX/プロダクト/モバイル/技術/マーケ/Meta）結果

---

## 0. 前提・背景

- URL: https://sleep-forecast.vercel.app  
- スタック: Next.js 14 App Router / TypeScript / Tailwind / Chart.js / localStorage  
- 現状スコア: Meta Agent 64.5/100（最低: モバイル/マーケ 44〜46点）  
- 目標: ユーザー少数の現フェーズで「使って良かった」を最大化し口コミ起点を作る

---

## 1. 修正項目一覧と優先度

| ID | 優先度 | 分類 | タイトル | 影響範囲 |
|----|--------|------|---------|----------|
| F-01 | 🔴 CRITICAL | モバイル | WeatherWidget横スクロール崩壊修正 | ホーム全体 |
| F-02 | 🔴 CRITICAL | 機能 | 都道府県設定ページ実装 | /settings |
| F-03 | 🔴 CRITICAL | UX | 初回オンボーディングフロー | ホーム・記録 |
| F-04 | 🔴 CRITICAL | SEO | 記事日付の重複解消（全10記事） | /articles/\* |
| F-05 | 🔴 CRITICAL | SEO | robots.txt 作成 | サイト全体 |
| F-06 | 🟡 IMPORTANT | SEO | /record・/dashboard canonical+noindex 設定 | 記録・ダッシュボード |
| F-07 | 🟡 IMPORTANT | PWA | Service Worker 実装（オフラインキャッシュ） | サイト全体 |
| F-08 | 🟡 IMPORTANT | a11y | WeatherWidget 気圧グラフ aria-label 追加 | ホーム |
| F-09 | 🟡 IMPORTANT | UX | WeatherWidget スコアの説明テキスト追加 | ホーム |
| F-10 | 🟡 IMPORTANT | UX | データ分離の注意書き（Web↔iOSデータ非連動） | ダッシュボード・記録 |
| F-11 | 🟢 NICE | UX | 記事末尾CTA 視認性向上（既存CTAの強化） | /articles/\* |
| F-12 | 🟢 NICE | UX | ホームに「使い方3ステップ」セクション追加 | ホーム |

---

## 2. 各項目の詳細仕様

### F-01: WeatherWidget横スクロール崩壊修正 🔴

**現状の問題**  
- スクリーンショット実測: scrollWidth 1296px vs clientWidth 646px  
- WeatherWidget内の気圧テーブル・5日間予報テーブルが固定幅レイアウト

**原因ファイル**  
`src/components/WeatherWidget.tsx`

**修正方針**
1. テーブルラッパーに `overflow-x-auto` を追加
2. 固定px幅指定を `min-w-` に変更し、モバイルでは縮む設計へ
3. 5日間予報テーブル: `grid-cols-5` → `grid-cols-3 sm:grid-cols-5`（モバイルは3列表示）
4. 気圧グラフcanvas: `min-h-[160px]` + `w-full` で縦横比を保持
5. 375px・390px・414px の各幅でスクロールが出ないことを確認

**受け入れ基準**  
- document.documentElement.scrollWidth === document.documentElement.clientWidth（スマホ実測）
- 5日間予報がモバイルで適切に折り返し表示される

---

### F-02: 都道府県設定ページ実装 🔴

**現状の問題**  
`src/app/settings/page.tsx` が `<ComingSoon />` を表示するのみ。都道府県データ・保存ロジックは `storage.ts` に実装済み。

**実装仕様**

```
/settings
├── 都道府県セレクタ（全47都道府県 + 現在値プリセット）
├── 保存ボタン（saveDefaultPrefectureCode() 呼び出し）
├── 保存成功トースト通知
└── 「データはこのブラウザにのみ保存されます」説明テキスト
```

**UIコンポーネント**
- `Select` (shadcn/ui) を使用
- 現在保存されている都道府県を初期値として表示（`getDefaultPrefectureCode()` 参照）
- `/prefectures.ts` の `PREFECTURES` リストから選択肢生成
- 保存後は「設定を保存しました ✓」トースト

**追加設定項目（MVP）**
- データ削除ボタン（全記録を削除）: 確認ダイアログ付き

**メタデータ**
```ts
export const metadata = {
  title: "設定",
  robots: { index: false, follow: false },  // プライベートページ
  alternates: { canonical: `${SITE_URL}/settings` }
}
```

---

### F-03: 初回オンボーディングフロー 🔴

**現状の問題**  
初回訪問者がどこで何をすべきか分からない。ファネル：ホーム→記録→ダッシュボードの導線が薄い。

**実装仕様**

#### 3-1. 初回訪問バナー（ホームページ）
- localStorage に `onboarding_dismissed` フラグがない場合に表示
- バナー内容:
  - 「SleepForecastへようこそ」タイトル
  - 3ステップアイコン（都道府県設定 → 睡眠記録 → 予報確認）
  - 「さっそく始める」ボタン → `/settings` へ
  - 「✕」で非表示（localStorage に `onboarding_dismissed=1` セット）

#### 3-2. 記録ページ初回ガイド
- `localStorage.getItem('sleep_records_v1')` のレコードが0件の場合
- 記録フォーム上部に「まず都道府県を設定してください」リンクバナーを表示（prefecture未設定時のみ）

#### 3-3. ダッシュボードの空状態改善
- 記録0件時に「まだ記録がありません」と表示 → 「最初の記録をする」ボタンへ誘導
- 現状確認必要（既に実装されているか？）

**実装ファイル**
- `src/components/OnboardingBanner.tsx`（新規作成）
- `src/app/page.tsx`（バナー組み込み）
- `src/app/record/page.tsx`（初回ガイド組み込み）

---

### F-04: 記事日付の重複解消 🔴

**現状の問題**  
全10記事の `publishedAt` と `updatedAt` が `2026-04-10` で統一されており、Google クローラーが「コンテンツが更新されていない静的サイト」と判断する可能性。

**修正仕様**

各記事に異なる公開日を付与。直近2ヶ月に自然な形で分散させる。

| スラッグ | 新publishedAt | 新updatedAt |
|---------|--------------|------------|
| kiatsu-zutsu | 2026-02-05 | 2026-04-01 |
| kisho-byo-check | 2026-02-14 | 2026-04-01 |
| jiritsu-shinkei | 2026-02-25 | 2026-04-01 |
| suimin-shitsu-up | 2026-03-05 | 2026-04-10 |
| tsuki-to-suimin | 2026-03-12 | 2026-04-10 |
| suimin-fusai | 2026-03-20 | 2026-04-10 |
| kandansa-hirou | 2026-03-28 | 2026-04-15 |
| fuminshou-sign | 2026-04-03 | 2026-04-15 |
| blue-light | 2026-04-10 | 2026-04-22 |
| gaba-supplement | 2026-04-18 | 2026-04-25 |

**変更ファイル**  
`src/content/articles/*.md` の frontmatter（10ファイル）

---

### F-05: robots.txt 作成 🔴

**現状の問題**  
`public/robots.txt` が存在しない。クローラーが全ページをインデックスしようとする。

**作成内容**
```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /record
Disallow: /api/

Sitemap: https://sleep-forecast.vercel.app/sitemap.xml
```

**補足**: /dashboard・/record はユーザー固有データを扱うため noindex が望ましい  
**補足**: sitemapが存在しない場合は next-sitemap or `app/sitemap.ts` で追加実装を検討

---

### F-06: /record・/dashboard canonical + noindex 設定 🟡

**現状の問題**  
- `/record/page.tsx`: metadata に `canonical` なし、`robots` なし
- `/dashboard/page.tsx`: "use client" のためサーバーサイドmetadata設定が存在しない
- `/settings/page.tsx`: F-02 で対処

**修正仕様**

`/record/page.tsx`:
```ts
export const metadata: Metadata = {
  title: "記録",
  description: "...",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/record` },
}
```

`/dashboard/layout.tsx`（または新規`/dashboard/page.tsx`のmetadata）:
```ts
export const metadata: Metadata = {
  title: "ダッシュボード",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/dashboard` },
}
```

※ `/dashboard/layout.tsx` が存在するか確認し、そこに metadata を追加するのが最適

---

### F-07: Service Worker 実装（オフラインキャッシュ） 🟡

**現状の問題**  
manifest.json が完備されているがSWが未実装。PWAとして「ホーム画面に追加」しても実質動作しない。

**実装方針**  
`next-pwa` パッケージを使用（推奨）またはカスタム `public/sw.js`

**next-pwa 方式の場合**
```bash
npm install next-pwa
```

`next.config.js` に設定追加:
```js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
module.exports = withPWA({ ...existingConfig });
```

**キャッシュ対象（優先）**
- `/`（ホーム）
- `/record`
- アイコン・フォント等の静的アセット

**オフライン時の挙動**
- キャッシュ済みページは表示
- 未キャッシュページは `/offline` へリダイレクト（簡易ページを作成）
- 気象APIは失敗してもUIが壊れない（既存エラーハンドリング確認）

---

### F-08: WeatherWidget 気圧グラフ aria-label 追加 🟡

**現状の問題**  
`WeatherWidget.tsx` 841行目の `<Line>` コンポーネントに `aria-label` なし（WCAG 2.1 AA違反）

**修正**
```tsx
<Line
  aria-label="今後13時間の気圧変化グラフ（hPa）"
  // ... existing props
/>
```

※ Chart.js の `<Line>` に aria-label は `aria-label` props として渡すか、ラッパー div に `role="img" aria-label="..."` を追加する

---

### F-09: WeatherWidget スコアの説明テキスト追加 🟡

**現状の問題**  
「睡眠スコア: 82」などの数値が表示されるが、何を意味するか説明なし。ユーザーが意味を理解できない。

**修正仕様**
- スコア数値の下に説明ラベルを追加:
  - 80以上: 「気象的に眠りやすい夜です」
  - 60〜79: 「気象はやや影響あり」
  - 60未満: 「気圧変化に注意が必要な夜です」
- ツールチップ（ホバー/タップで説明表示）or インラインテキストどちらでも可
- `computeWSIScore100()` の戻り値の範囲（0-100）に基づく

---

### F-10: データ分離の注意書き（Web↔iOS非連動） 🟡

**現状の問題**  
WebアプリとiOSアプリのデータが localStorage ↔ iOS独自ストレージで分断されており、両方使うユーザーが混乱する可能性。

**修正仕様**
- ダッシュボードページの下部（フッター直前）に小さい注意書きを追加:
  > 「WebアプリとiOSアプリの記録データは現在連動していません。」
- 医療免責文のスタイルに合わせて `text-xs text-[#8b92a5]` で目立たず表示

---

### F-11: 記事末尾CTA 視認性向上 🟢

**現状の問題**  
`ArticleLayout.tsx` に CTA は実装済みだが、スクロール位置・デザインが控えめすぎてスルーされやすい。

**修正仕様**（既存CTAのブラッシュアップ）
- CTA の前に `---`（水平線）デバイダーを追加
- ボタンのラベルを「今日の睡眠を記録する →」に変更
- スマホでボタンが `w-full` になる追記

---

### F-12: ホームに「使い方3ステップ」セクション追加 🟢

**現状の問題**  
初回訪問者が「このアプリで何をすれば良いか」を理解するのに時間がかかる。

**実装仕様**

FEATURESセクションの下（または代替として）「3ステップで始める」セクションを追加:

```
Step 1: 都道府県を設定  → /settings
Step 2: 毎朝30秒で記録 → /record  
Step 3: 気象と眠りの関係を確認 → /dashboard
```

- アイコン（Settings / Moon / BarChart3）付き
- 各ステップに対応ページへのリンク
- `max-w-md mx-auto` でシンプルな縦リスト or 横並び3カラム

---

## 3. 実装作業順序

```
Phase 1（最高優先度 — SEO/モバイル/コア機能）
  F-05  robots.txt 作成（5分）
  F-04  記事日付修正（10分）
  F-06  /record・/dashboard noindex設定（10分）
  F-01  WeatherWidget モバイル修正（45分）
  F-02  都道府県設定ページ実装（60分）

Phase 2（UX/機能改善）
  F-03  オンボーディングバナー実装（40分）
  F-09  WeatherWidget スコア説明追加（15分）
  F-08  aria-label 追加（10分）
  F-10  データ分離注意書き追加（10分）
  F-12  使い方3ステップ追加（20分）
  F-11  記事末尾CTA強化（10分）

Phase 3（PWA）
  F-07  Service Worker 実装（45分）

最終
  TypeScript 型チェック（npx tsc --noEmit）
  git commit & push
  Vercel デプロイ確認
```

---

## 4. ファイル変更一覧

| ファイル | 変更種別 | 対応ID |
|---------|---------|--------|
| `public/robots.txt` | 新規作成 | F-05 |
| `src/content/articles/*.md`（10件） | frontmatter修正 | F-04 |
| `src/app/record/page.tsx` | metadata追加 | F-06 |
| `src/app/dashboard/layout.tsx` | metadata追加 | F-06 |
| `src/app/settings/page.tsx` | 全面実装 | F-02 |
| `src/components/WeatherWidget.tsx` | レスポンシブ修正・aria・スコア説明 | F-01, F-08, F-09 |
| `src/components/OnboardingBanner.tsx` | 新規作成 | F-03 |
| `src/app/page.tsx` | OnboardingBanner組み込み・3ステップ追加 | F-03, F-12 |
| `src/app/record/page.tsx` | 初回ガイドバナー追加 | F-03 |
| `src/app/dashboard/page.tsx` | データ分離注意書き追加 | F-10 |
| `src/components/ArticleLayout.tsx` | CTA強化 | F-11 |
| `next.config.js` / `public/sw.js` | PWA実装 | F-07 |

---

## 5. 非対応項目（今回スコープ外）

以下は今回の実装から除外し、次フェーズ（STEP 2）とする:

- Web↔iOSデータ同期機能（Supabase等のバックエンド実装が必要）
- 通知設定（プッシュ通知バックエンド未実装）
- データエクスポート機能
- ユーザー認証・アカウント管理

---

## 6. 品質チェックリスト

実装完了後に以下を確認:
- [ ] `npx tsc --noEmit` でエラーゼロ
- [ ] モバイル375px（iPhone SE）でScrollWidthとClientWidthが一致
- [ ] /settings で都道府県の保存・反映が動作する
- [ ] オンボーディングバナーが初回のみ表示され、閉じると再表示しない
- [ ] 10記事の日付が全て異なる
- [ ] robots.txt が https://sleep-forecast.vercel.app/robots.txt でアクセス可能
- [ ] /dashboard・/record に `<meta name="robots" content="noindex">` が含まれる
- [ ] Vercel デプロイ成功

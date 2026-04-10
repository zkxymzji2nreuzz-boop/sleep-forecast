# F006 Design Judge — Winner: 案B + 案A hybrid

## Scores

| Axis | A | B | C |
|---|---|---|---|
| 読みやすさ | 9 | 8 | 6 |
| 情報の見つけやすさ | 7 | 9 | 8 |
| ブランド一貫性 | 6 | 10 | 5 |
| アクセシビリティ | 9 | 9 | 7 |
| 実装リスク | 8 | 9 | 7 |
| コンテンツ適合性 | 8 | 9 | 5 |
| **合計** | **47/60** | **54/60** | **38/60** |

## 採用: 案B (+ 案A hybrid elements)

案Cは不採用。

## Generator への実装指示

### カラーパレット (変更なし — F003-F005 継続)
- bg: `#0f1117`
- card: `#1a1f2e`
- accent: indigo/purple グラデーション
- text: `#e6e8ee`
- muted: `#8b92a5`
- medical amber: `border-amber-500/25 bg-gradient-to-br from-amber-900/15 via-amber-800/10 to-transparent`

### 変更ファイル
- `src/app/about/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/contact/page.tsx`
- `src/components/Breadcrumb.tsx` (新規 or 既存)
- `src/components/AdBanner.tsx`

### 実装指示

#### 全ページ共通 SharedPageHero
各ページ上部に以下を追加:
```tsx
<div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
  {/* ページ専用 lucide アイコン: about=Moon, privacy=Shield, terms=FileText, contact=Mail */}
  <div className="mb-3 flex justify-center">
    <PageIcon className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
  </div>
  <h1 className="text-center text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
    ページタイトル
  </h1>
  <div className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
</div>
```

#### body テキスト (案Aの line-height を採用)
```
text-sm leading-[1.85] text-[#e6e8ee]/85
```

#### section 間隔 (案Aの spacing を採用)
```
space-y-14
```

#### セクション見出し (案B)
```
mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug
```

#### セクションカード (案B — about/privacy/terms の各条文)
```
rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6
```

#### 医療免責カード (terms 第2条 + about/contact の免責文)
Terms 第2条:
```
rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-900/15 via-amber-800/10 to-transparent p-5 sm:p-6
```
border-l は `border-amber-400/70` に変更。`strong` は `font-bold text-amber-200`。

About/Contact の小免責:
```
rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4
```
左に `<Info className="h-3.5 w-3.5 text-[#8b92a5]" aria-hidden="true" />`

#### About — 開発ストーリーカード
```
rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent p-6 sm:p-8
```
h2 左に `<Moon className="h-5 w-5 text-indigo-300/70" aria-hidden="true" />`

#### Contact — メールカード
```
rounded-3xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/[0.06] to-transparent p-6 sm:p-8
```
アイコン背景: `rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 h-12 w-12`
メールボタン: `rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white px-5 py-2.5 shadow-lg shadow-indigo-500/20`

#### Breadcrumb (案B の微調整)
```
mb-6 flex flex-wrap items-center gap-1.5 text-xs text-[#8b92a5]
```
ChevronRight を `h-3 w-3 text-indigo-400/30` に変更。
`aria-current="page"` と `aria-label="パンくずリスト"` を維持。

#### 更新日表示 (privacy / terms)
```tsx
<div className="mb-10 flex items-center gap-1.5 text-sm text-[#8b92a5]">
  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
  最終更新日: 2026年4月10日
</div>
```

#### AdBanner (開発プレースホルダー追加)
`NODE_ENV === 'development'` かつ `ADSENSE_CLIENT` 未設定の場合:
```
rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] py-6 flex items-center justify-center text-xs text-[#8b92a5]/50
```
テキスト `広告スペース`。aria-hidden="true"。
本番 + 未設定時は現行通り `h-0 overflow-hidden`。
ADSENSE_CLIENT 設定時は外側に `rounded-2xl overflow-hidden` を追加。

#### リンク色
全ページの `text-indigo-300` リンクはそのまま維持。`underline-offset-4 decoration-indigo-400/40 hover:decoration-indigo-300` を追加。

### アクセシビリティチェックリスト (Generator 必須確認)
- [ ] 全 lucide アイコンに `aria-hidden="true"`
- [ ] Breadcrumb に `aria-label="パンくずリスト"` + `aria-current="page"`
- [ ] メールリンクは `href="mailto:..."` + `rel="noopener noreferrer"`
- [ ] 全インタラクティブ要素に `focus-visible:ring-2 ring-indigo-300 ring-offset-2 ring-offset-[#0f1117]`
- [ ] 医療免責 `text-xs` を絶対に縮小しない
- [ ] h1 → h2 の見出し階層を全ページで守る

## 採用理由

F003・F004・F005 はすべて案Bのウェルネス言語を採用している。法定ページで案Cの monospace/英語ラベルに切り替えると、同一アプリとは感じられないほどトーンが乖離する。30-50 代女性・気象病ユーザーは「信頼できる温かさ」を期待しており、案Bのグラデーションヒーローとソフトカードはその期待に応える。案Aの `leading-[1.85]` と `space-y-14` は法的文書の長文可読性で案Bを上回るため、この2点のみハイブリッドとして採用する。

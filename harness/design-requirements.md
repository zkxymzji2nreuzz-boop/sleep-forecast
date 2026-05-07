# SleepForecast デザインリデザイン 要件定義書

**決定日**: 2026-05-07  
**対象パターン**: ③ トワイライトラベンダー（Twilight Lavender）  
**担当**: フルリデザイン（全ページ・全コンポーネント）

---

## 1. 背景・目的

現行ダークテーマ固定では以下の課題がある：
- コントラスト比不足（rose-300 on gradient = 3.2:1 → WCAG AA 不適合）
- `white/5` ボーダーがほぼ不可視
- 30-50代女性ターゲットへの色心理的ミスマッチ
- プロらしさの欠如（個人開発感）

フルリデザインにより可読性・ユーザビリティ・デザイン品質を抜本的に改善する。

---

## 2. デザインコンセプト

**トワイライトラベンダー（Twilight Lavender）**

- **キーワード**: 穏やかな夜・眠りへの誘い・清潔感・信頼感
- **ターゲット適合**: 30-50代女性（ラベンダーの落ち着き＋清潔感）
- **差別化**: 競合アプリとの色調差別化（青系が多い中でのラベンダー）

---

## 3. カラーパレット仕様

### 3-1. ライトモード（:root / .light）

| トークン | HSL | HEX | 用途 |
|---------|-----|-----|------|
| `--background` | 280 33% 98% | #FBF9FC | ページ背景 |
| `--foreground` | 256 26% 12% | #1A1625 | 本文テキスト |
| `--card` | 261 42% 96% | #F3F0F9 | カード背景 |
| `--card-foreground` | 256 26% 12% | #1A1625 | カード内テキスト |
| `--primary` | 253 31% 51% | #6B5BA8 | プライマリ（ボタン・アクセント） |
| `--primary-foreground` | 0 0% 100% | #FFFFFF | プライマリ上テキスト |
| `--secondary` | 261 30% 90% | #E2DCF0 | セカンダリ背景 |
| `--secondary-foreground` | 256 26% 12% | #1A1625 | セカンダリテキスト |
| `--muted` | 261 30% 90% | #E2DCF0 | ミュート背景 |
| `--muted-foreground` | 253 25% 38% | #574F7A | 補助テキスト（WCAG AA: 8.4:1） |
| `--accent` | 253 31% 51% | #6B5BA8 | アクセント |
| `--accent-foreground` | 0 0% 100% | #FFFFFF | アクセント上テキスト |
| `--destructive` | 0 72% 51% | #E53E3E | 危険・エラー |
| `--destructive-foreground` | 0 0% 100% | #FFFFFF | |
| `--border` | 261 30% 90% | #E2DCF0 | ボーダー |
| `--input` | 261 42% 96% | #F3F0F9 | 入力フィールド背景 |
| `--ring` | 253 31% 51% | #6B5BA8 | フォーカスリング |
| `--popover` | 261 42% 96% | #F3F0F9 | ポップオーバー背景 |
| `--popover-foreground` | 256 26% 12% | #1A1625 | ポップオーバーテキスト |

### 3-2. ダークモード（.dark）

| トークン | HSL | HEX | 用途 |
|---------|-----|-----|------|
| `--background` | 253 26% 10% | #15121F | ページ背景 |
| `--foreground` | 256 43% 93% | #EAE6F5 | 本文テキスト |
| `--card` | 252 28% 14% | #1E1A2E | カード背景 |
| `--card-foreground` | 256 43% 93% | #EAE6F5 | カード内テキスト |
| `--primary` | 252 43% 72% | #A599D6 | プライマリ（ラベンダー発光） |
| `--primary-foreground` | 253 26% 10% | #15121F | プライマリ上テキスト |
| `--secondary` | 250 27% 21% | #2D2845 | セカンダリ背景 |
| `--secondary-foreground` | 256 43% 93% | #EAE6F5 | セカンダリテキスト |
| `--muted` | 250 27% 21% | #2D2845 | ミュート背景 |
| `--muted-foreground` | 252 23% 65% | #9B93BB | 補助テキスト（WCAG AA: 6.7:1） |
| `--accent` | 252 43% 72% | #A599D6 | アクセント |
| `--accent-foreground` | 253 26% 10% | #15121F | アクセント上テキスト |
| `--destructive` | 0 72% 51% | #E53E3E | 危険・エラー |
| `--destructive-foreground` | 0 0% 100% | #FFFFFF | |
| `--border` | 250 27% 21% | #2D2845 | ボーダー |
| `--input` | 250 27% 21% | #2D2845 | 入力フィールド背景 |
| `--ring` | 252 43% 72% | #A599D6 | フォーカスリング |
| `--popover` | 252 28% 14% | #1E1A2E | ポップオーバー背景 |
| `--popover-foreground` | 256 43% 93% | #EAE6F5 | ポップオーバーテキスト |

### 3-3. スコア別ダイナミックカラー（ライト/ダーク共通）

睡眠スコア1〜5点に応じてカードの配色が変化する（Oura Ring方式）。

| スコア | 色名 | HEX | 意味 |
|-------|------|-----|------|
| 5.0 | Emerald | #10b981 | 快眠 |
| 4.0-4.9 | Emerald-400 | #34d399 | 良好 |
| 3.0-3.9 | Amber | #f59e0b | ふつう |
| 2.0-2.9 | Orange | #f97316 | やや悪い |
| 1.0-1.9 | Rose | #ef4444 | 悪い |

PredictionCard のグラデーション背景もスコアに連動して変化する：
- 快眠: `from-emerald-600 via-teal-500 to-emerald-400`
- 良好: `from-teal-500 via-emerald-400 to-cyan-400`
- ふつう: `from-violet-600 via-purple-500 to-indigo-400`（デフォルト）
- やや悪い: `from-orange-500 via-amber-400 to-yellow-400`
- 悪い: `from-rose-600 via-rose-500 to-orange-400`

---

## 4. テーマ切り替え仕様

### 4-1. 動作フロー

```
初回アクセス
  └→ localStorage に "theme" キーなし
       └→ prefers-color-scheme: dark → .dark クラス付与
       └→ prefers-color-scheme: light → .dark クラスなし（ライト）

手動切り替え（ヘッダートグル）
  └→ .dark クラスを <html> に付与/除去
  └→ localStorage に "theme": "dark" | "light" を保存
  └→ 次回アクセス時は localStorage の値を優先

FOUC対策（Flash of Unstyled Content）
  └→ layout.tsx に inline script を埋め込み
  └→ React hydration 前に <html> クラスを設定
```

### 4-2. ThemeToggle コンポーネント

- **場所**: ヘッダー右端（デスクトップ・モバイル共通）
- **アイコン**: ライト時は Moon（🌙）、ダーク時は Sun（☀️）
- **サイズ**: 40×40px タップターゲット（WCAG最低44px推奨 → h-10 w-10 で対応）
- **アニメーション**: 0.2s ease フェード切り替え

---

## 5. コンポーネント別変更方針

### globals.css
- `:root`（ライトモード）と `.dark`（ダークモード）を明確分離
- `html, body` のハードコード色を `bg-background text-foreground` に変更
- `html.dark` の anti-FOUC スタイル追加

### layout.tsx
- `<html>` の `className="dark"` を削除（ThemeProvider が動的制御）
- `<body>` の `bg-[#0f1117] text-[#e6e8ee]` → `bg-background text-foreground`
- FOUC対策の inline script 追加（nonce適用）
- `viewport.themeColor` を配列形式（ライト/ダーク両対応）に変更

### 新規ファイル
- `src/components/ThemeProvider.tsx` — テーマコンテキスト + プロバイダー
- `src/components/ThemeToggle.tsx` — Moon/Sunアイコントグルボタン

### Header.tsx
- ハードコード色 → Tailwind CSS変数クラスに変更
- ThemeToggle を右端に追加

### BottomNav.tsx / Footer.tsx / PredictionCard.tsx 他
- ハードコード色（`#0f1117`, `#e6e8ee`, `#a8b0c2`, `indigo-*`）を全廃
- CSS変数クラス（`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary` 等）に統一

---

## 6. アクセシビリティ要件

- WCAG 2.1 AA 準拠（コントラスト比 4.5:1 以上）
- ライトモード muted-foreground (#574F7A on #FBF9FC): 8.4:1 ✓
- ダークモード muted-foreground (#9B93BB on #15121F): 6.7:1 ✓
- フォーカスリング: `ring-2 ring-ring ring-offset-2` で視認性確保

---

## 7. 実装ルール

1. **CSS変数優先**: ハードコード HEX・Tailwind 固定色クラスは禁止
2. **セマンティクス**: `bg-primary` / `text-foreground` 等のセマンティッククラスを使用
3. **既存機能維持**: 色以外のレイアウト・ロジックは変更しない
4. **ダブルチェック**: 各Phaseでビルドエラーゼロを確認してから次フェーズへ
5. **最大3ループ**: エラーが3回解消できない場合は作業中断してユーザーに報告

---

## 8. 実装フェーズ

| Phase | 内容 | ダブルチェック方法 |
|-------|------|-----------------|
| 1 | globals.css カラートークン定義 | tsc --noEmit + ライト/ダーク目視 |
| 2 | ThemeProvider + ThemeToggle + layout.tsx更新 | FOUC無し確認 + トグル動作確認 |
| 3 | 全コンポーネントへカラートークン適用 | npm run build + デモ画面全ページ目視 |
| 4 | スコア別ダイナミックカラー（PredictionCard） | スコア別グラデーション目視確認 |
| 5 | 最終ビルド + デプロイ + 全画面スクリーンショット | Vercel デプロイ確認 + ブラウザ実機確認 |

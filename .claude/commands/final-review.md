# /final-review — プロダクト最終横断レビュー

デプロイ前に実施する全体品質監査。F007（/deploy-check）の前に必ず実行する。
6つの専門エージェントが横断的にチェックし、全て PASS になるまでデプロイ不可。

---

## 実行順序

```
Phase 1: Content QA Agent       記事10本の品質横断監査
Phase 2: UX Flow Agent          ユーザー導線・UI一貫性レビュー
Phase 3: SEO Audit Agent        全ページSEO要素の整合性チェック
Phase 4: Monetization Agent     収益化準備・AdSense審査要件チェック
Phase 5: A11y Agent             アクセシビリティ簡易監査
Phase 6: Performance Agent      パフォーマンス・バンドルサイズ監査
```

差し戻しは各フェーズ最大2回まで。2回失敗したフェーズは WARNING 扱いで続行し、
`harness/final-review-report.md` に記録してデプロイ判断を人間に委ねる。

---

## Phase 1: Content QA Agent（Sonnet）

### 目的
全10記事の品質を一括チェックし、F005bのacceptance_criteriaを満たしているか検証する。

### チェック項目

```bash
# 禁止ワードチェック
grep -rn "いかがでしたでしょうか\|〜ことが証明\|〜することが推奨\|〜とされています" \
  src/content/articles/

# 医療免責チェック（全記事に存在するか）
for f in src/content/articles/*.md; do
  grep -l "医療行為\|診断ではありません\|医師にご相談" "$f" || echo "MISSING: $f"
done

# 著者クレジットチェック
grep -rL "SleepForecast編集部" src/content/articles/

# ペルソナ使用チェック（全7名が最低1記事で使用されているか）
for name in "Tさん" "Hさん" "Kさん" "Sさん" "Aさん" "Yさん" "Nさん"; do
  count=$(grep -rl "$name" src/content/articles/ | wc -l)
  echo "$name: $count 記事"
done

# 記事文字数チェック（各2000字以上）
for f in src/content/articles/*.md; do
  chars=$(wc -m < "$f")
  echo "$f: $chars 文字"
done
```

### 合格基準（全項目必須）
- [ ] 禁止ワード 0件
- [ ] 医療免責文が全10記事に存在
- [ ] 著者クレジット（SleepForecast編集部）が全10記事末尾にある
- [ ] ペルソナ7名全員が最低1記事で使用されている
- [ ] 各記事が2000文字以上
- [ ] 共感型書き出し（あるある・問いかけ・状況描写）が全10記事にある
- [ ] 同一記事での同一ペルソナ重複使用がない

---

## Phase 2: UX Flow Agent（Sonnet）

### 目的
実際のユーザー導線をソースコードレベルで追い、UI一貫性とナビゲーションの破綻がないか確認する。

### チェック項目

**導線確認**
1. トップページ（/）→ 記録ページ（/record）への導線が明確か
2. 記録ページ → ダッシュボード（/dashboard）への自然な流れがあるか
3. ダッシュボード → 予測カード（PredictionCard）が正しく表示されるか
4. 記事ページ（/articles/[slug]）→ アプリへの誘導CTAがあるか
5. フッターに必須ページ（privacy/terms/about/contact）へのリンクがあるか

**UI一貫性**
- インディゴ→パープルのグラジェントがF003/F004/F005/F006を通して統一されているか
- shadcn/uiコンポーネントのスタイルが混在していないか
- モバイル表示でナビゲーションが機能するか（ソースコード確認）

**合格基準**
- [ ] 全5導線に明確なリンク・CTAが存在する
- [ ] デザインテーマが全ページで統一されている
- [ ] フッターに法的ページ4本が全て揃っている
- [ ] 記事ページにアプリへの誘導CTAがある

---

## Phase 3: SEO Audit Agent（Sonnet）

### 目的
全ページのSEO要素を横断的に検証し、検索流入の障壁を除去する。

### チェック項目

```bash
# title タグ重複チェック
grep -rh "<title>" src/app/ | sort | uniq -d

# meta description 欠落チェック
grep -rL "description.*metadata\|openGraph.*description" src/app/

# sitemap URLs確認
cat public/sitemap.xml | grep -c "<url>"

# JSON-LD 存在確認（構造化データ）
grep -rl "application/ld+json" src/app/ src/components/

# 内部リンク確認（記事間クロスリンク）
grep -rh "href.*articles" src/content/articles/ | sort | uniq
```

**合格基準**
- [ ] 全ページにユニークなtitleとmeta descriptionがある
- [ ] sitemapに全記事URL（10本）＋主要ページが含まれる
- [ ] WebApplication JSON-LD（トップ）+ Article JSON-LD（記事）が存在
- [ ] 記事間のクロスリンクが最低5本ある
- [ ] OGP（og:title, og:description, og:image）が全記事にある

---

## Phase 4: Monetization Agent（Sonnet）

### 目的
Google AdSense審査通過に必要な要件と、アフィリエイト掲載の法的要件を確認する。

### チェック項目

**AdSense審査要件**
- [ ] `public/ads.txt` にパブリッシャーID欄が準備されている
- [ ] プライバシーポリシーにAdSense・Cookieの記載がある
- [ ] 記事コンテンツが10本以上・各2000文字以上（独自コンテンツ）
- [ ] /about に運営者情報がある
- [ ] 医療系コンテンツに免責事項がある（薬機法対応）
- [ ] `AdBanner.tsx` が環境変数未設定時に非表示になっている

**アフィリエイト要件（景表法）**
- [ ] 広告・PR表記のルールが `harness/feature-list.json` の法的メモに記載されている
- [ ] 将来のアフィリエイトリンクに「PR」「広告」表記を入れる準備ができている

**合格基準**
- AdSense必須要件が全て満たされている → PASS
- 1項目でも欠落 → Generator に差し戻し

---

## Phase 5: A11y Agent（Sonnet）

### 目的
WCAG 2.1 AA準拠の主要項目をソースコードで確認する（Playwright実行が不可な場合はソース確認のみ）。

### チェック項目

```bash
# img に alt 属性があるか
grep -rn "<img" src/ | grep -v 'alt='

# button に aria-label か text があるか
grep -rn "<button" src/ | grep -v 'aria-label\|>[^<]'

# color contrast（Tailwindクラスで確認）
grep -rn "text-gray-300\|text-gray-200" src/ # 低コントラストの可能性

# フォームのlabel確認
grep -rn "<input\|<select\|<textarea" src/ | grep -v "aria-label\|id="
```

**合格基準**
- [ ] 全 `<img>` に alt 属性がある
- [ ] インタラクティブ要素にキーボードアクセスが可能（aria-label or 可視テキスト）
- [ ] フォーム要素に対応するラベルがある
- WARNING（FAIL不要）: コントラスト・スクリーンリーダー詳細は将来対応可

---

## Phase 6: Performance Agent（Sonnet）

### 目的
デプロイ後のLighthouseスコアを予測し、Core Web Vitalsの主要障壁を除去する。

### チェック項目

```bash
# バンドルサイズ確認
npm run build 2>&1 | grep -E "Route|Size|First Load"

# 画像最適化確認
find public/ -name "*.png" -o -name "*.jpg" | xargs ls -lh

# next/image使用確認（<img>タグの直接使用を検出）
grep -rn "<img " src/app/ src/components/ | grep -v "next/image"

# 重いnpmパッケージの確認
cat package.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
deps = list(d.get('dependencies',{}).keys())
heavy = ['moment', 'lodash', 'jquery', 'bootstrap', 'd3']
found = [p for p in deps if any(h in p for h in heavy)]
print('Heavy deps:', found if found else 'none')
"
```

**合格基準**
- [ ] ビルド成功・First Load JS が 200KB 以下
- [ ] `public/` 内の画像が各 500KB 以下
- [ ] `<img>` タグの直接使用がない（next/image を使用）
- [ ] moment.js などの重量級ライブラリを使用していない
- WARNING: 細かなチューニングはF007（SRE）に委譲可

---

## レポート出力

全フェーズ完了後、以下を `harness/final-review-report.md` に出力する：

```markdown
# SleepForecast 最終レビューレポート

実施日: YYYY-MM-DD
コミット: {git rev-parse HEAD}

## 結果サマリ
| Phase | Agent | 結果 | 備考 |
|---|---|---|---|
| 1 | Content QA | PASS/FAIL | ... |
| 2 | UX Flow | PASS/FAIL | ... |
| 3 | SEO Audit | PASS/FAIL | ... |
| 4 | Monetization | PASS/FAIL | ... |
| 5 | A11y | PASS/WARNING | ... |
| 6 | Performance | PASS/WARNING | ... |

## 判定
- 全PASS → F007（/deploy-check）へ進んでよい
- 1つでもFAIL → 該当フェーズのGeneratorに差し戻し
- WARNINGのみ → 人間の判断で続行可（harness/feature-list.jsonにWARNING記録）
```

---

## 使い方

```
/final-review
```

F007（`/deploy-check`）の**前**に必ず実行すること。
`final-review-report.md` が全PASS にならない限り、SREのデプロイチェックに進まない。

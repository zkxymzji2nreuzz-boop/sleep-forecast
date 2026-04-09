---
description: Pre-deploy checklist for SleepForecast via SRE agent. Never auto-deploys. Requires explicit y/n from human.
---

# /deploy-check

SleepForecast のデプロイ前チェックを実行する。**自動デプロイは絶対に行わない**。
Kiro インシデント（AI が本番を破壊）のような事故を防ぐため、**SRE Agent** が最終ゲートとして動作する。

## 手順

1. `cat harness/feature-list.json` で全機能が `status: "passing"` か確認
2. `git log --oneline -30` で直近のコミット履歴を確認
3. **SRE Agent**（Sonnet）を起動し、18 項目のデプロイチェックリストを実行する
   - Pre-flight（build / tsc / 前回 Test Engineer / Security Reviewer / Legal の結果）
   - 環境変数（.env.example / .env.local / NEXT_PUBLIC_ の誤用）
   - デプロイ設定（vercel.json / next.config.js / robots.txt / sitemap.xml）
   - 不可逆操作の検出（rm -rf / DROP TABLE / git push --force / localStorage.clear）
   - ロールバック手順の確認
4. SRE の判定を受け取る
   - **NO-GO**: 問題を Generator に差し戻し、修正後に `/deploy-check` を再実行
   - **HOLD**: 人間に判断を仰ぐ
   - **GO**: 次のステップへ

## 追加の必須チェック（SRE と並行）

- [ ] 各ページ（/, /record, /dashboard, /settings, /about, /privacy, /terms, /contact, /articles/[slug]）にアクセスし 404 にならないことを確認
- [ ] シークレット露出の静的検査: `git grep -nE "(sk-ant|sk_live|API_KEY\s*=)" src/` が空であること
- [ ] PWA 要件: `public/manifest.json`, `public/favicon.ico`, 各サイズのアイコンが存在
- [ ] 必須ページの内容確認: プライバシーポリシー・利用規約・運営者情報・お問い合わせがすべて実装済み
- [ ] 医療免責: 「医療行為ではない」旨がフッターと予測カードに明記されている
- [ ] Lighthouse スコア計測（可能なら）: Performance / SEO / Accessibility / Best Practices それぞれ 90 以上

## 承認フロー

SRE が **GO** を出したら、次のメッセージを人間に表示して判断を仰ぐ。

```
=== SleepForecast Deploy Check Report ===

[SRE Agent サマリ]
✅ npm run build / tsc --noEmit
✅ Test Engineer / Security Reviewer / Legal : PASS
✅ 環境変数 OK（.env.local not committed, NEXT_PUBLIC_ clean）
✅ 不可逆操作 なし
✅ ロールバック手順 記録済み

[追加チェック]
✅ 全ページ 200 OK
✅ プライバシー / 利用規約 / About / Contact すべて実装済み
✅ 医療免責文 フッター + 予測カードに表示
✅ Lighthouse Perf/SEO/A11y/BP ≥ 90

[前デプロイ情報]
- 前回デプロイ ID: [ID or "初回デプロイ"]
- ロールバック手順: Vercel Dashboard → Deployments → 前 ID → Promote to Production

[次の手動アクション]
1. git push origin main
2. Vercel Dashboard で Import Project（初回のみ）
3. 環境変数を Vercel Dashboard に登録（のたん本人が入力）
4. Custom domain 設定
5. Google Search Console にサイト登録
6. Google AdSense 審査申請（別途）

上記の手順で進めてよろしいですか？ (y/n)
```

人間の **明示的な y** が得られた場合のみ、`git push origin main` を実行する。
`vercel deploy` や `vercel --prod` は **絶対に自動実行しない**。Vercel Dashboard からの手動デプロイに任せる。

## 禁止事項

- `vercel deploy` / `vercel --prod` コマンドを自動実行しない
- `git push --force` を実行しない
- 人間の承認なしにシークレットや環境変数を Vercel に登録しない
- AdSense 広告タグを有効化しない（審査通過後に別途行う）
- SRE Agent の判定を無視して進めない

## 備考

- SRE Agent は `/deploy-check` でのみ起動する
- 通常の `/next-feature` サイクルでは SRE は起動しない
- ロールバック手順は必ず事前に確認する

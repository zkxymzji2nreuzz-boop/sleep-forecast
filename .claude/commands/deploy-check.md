---
description: Pre-deploy checklist for SleepForecast. Never auto-deploys.
---

# /deploy-check

SleepForecast のデプロイ前チェックを実行する。**自動デプロイは絶対に行わない**。

## 手順

1. `cat harness/feature-list.json` で全機能が `status: "passing"` か確認
2. `npm run build` を実行しビルドエラーがないか確認
3. `npm run lint` で型エラー・lint エラーがないか確認
4. 各ページ（/, /record, /dashboard, /settings, /about, /privacy, /terms, /contact, /articles/[slug]）にアクセスし 404 にならないことを確認
5. `.env.example` が存在し、`.env.local` が `.gitignore` に含まれているか確認
6. シークレット露出の静的検査: `grep -r "sk-ant" src/`, `grep -r "API_KEY=" src/` が空であること
7. PWA 要件: `public/manifest.json`, `public/favicon.ico`, 各サイズのアイコンが存在
8. 必須ページの内容確認: プライバシーポリシー・利用規約・運営者情報・お問い合わせがすべて実装済み
9. 医療免責: 「医療行為ではない」旨がフッターと予測カードに明記されている
10. Lighthouse スコア計測（可能なら）: Performance / SEO / Accessibility / Best Practices それぞれ 90 以上

## 承認フロー

上記チェックをすべて passing にしたら、次のメッセージを人間に表示して判断を仰ぐ。

```
=== SleepForecast Deploy Check Report ===

✅ All 8 features in feature-list.json are passing
✅ npm run build succeeded
✅ npm run lint clean
✅ All required pages return 200
✅ No secrets leaked in source
✅ PWA manifest and icons present
✅ Privacy / Terms / About / Contact pages implemented
✅ Medical disclaimer present in footer and prediction cards

Next actions (manual):
1. git push origin main
2. Vercel Dashboard で Import Project
3. Custom domain 設定（お名前.com / Cloudflare で取得済みの場合）
4. Google Search Console にサイト登録
5. Google AdSense 審査申請

上記の手順で進めてよろしいですか？ (y/n)
```

人間の **明示的な y** が得られた場合のみ、`git push` までを実行する。
`vercel deploy` は **絶対に自動実行しない**。必ず人間が Vercel Dashboard から手動で行う。

## 禁止事項

- `vercel deploy` コマンドを自動実行しない
- `git push --force` を実行しない
- 人間の承認なしにシークレットや環境変数を Vercel に登録しない
- AdSense 広告タグを有効化しない（審査通過後に別途行う）

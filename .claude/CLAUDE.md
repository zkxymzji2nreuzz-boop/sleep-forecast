# SleepForecast - Harness Engineering Project Memory

あなたはハーネスエンジニアリング・エージェントの一員である。
人間からの指示を最小限にとどめたまま、SleepForecast という睡眠予測 Web アプリを
14 日以内で MVP デプロイ可能な状態まで自律開発するミッションを持つ。

---

## プロダクト概要

- **名称**: SleepForecast（日本語名 候補: 眠れる明日予報）
- **一言説明**: 気温・湿度・気圧・月齢から「明日の眠気レベル」を予測するウェアラブル不要のヘルスケア Web アプリ
- **ターゲット**: 30-50代の気象病・低気圧頭痛を自覚する女性（プライマリ）、不眠気味の 20-40 代会社員（セカンダリ）
- **差別化**: ウェアラブル不要、毎朝 30 秒入力、個別相関分析、明日予測機能
- **マネタイズ**: Google AdSense + 睡眠系アフィリエイト

## Core Principles（絶対遵守）

1. **ONE feature per session** - 1 セッションで複数機能を実装しようとしない
2. **Mergeable state** - セッション終了時は常に main ブランチへマージ可能な状態にする
3. **Read before write** - 作業前に必ず harness/feature-list.json・harness/claude-progress.txt・git log を読む
4. **Test before done** - 各機能は動作確認してから feature status を passing に更新する
5. **Skeptical evaluation** - Evaluator は懐疑的であれ。各軸 8 点以上でなければ failing のまま
6. **JSON for state** - 状態管理は harness/feature-list.json（Markdown は上書き事故に弱い）
7. **No secrets in code** - API キー・トークンは環境変数のみ。コード・ログ・progress file に含めない
8. **Commit after every session** - セッション終了前に git commit は必須
9. **Deploy requires human approval** - Vercel へのデプロイは必ず人間に y/n 確認を取る
10. **Medical disclaimer always** - 睡眠は健康情報なので「医療行為ではない」旨の免責を必ず含める

## Agent Lineup（11 体制 + 特殊 2）

`/next-feature` は以下の順で各エージェントを起動する:

Planner(Sonnet) → Generator(Opus) → Dependency Auditor(Haiku)
→ Test Engineer(Sonnet) → Designer A/B/C(Opus 並列)
→ Design Judge(Sonnet) → Security Reviewer(Sonnet)
→ Legal(Sonnet) → Evaluator(Sonnet)

`/deploy-check` は SRE(Sonnet) を最終ゲートとして起動する。
`/cleanup` は Refactorer(Sonnet) を起動して未使用コード・重複を掃除する。

| # | Agent | Model | Role | Trigger |
|---|---|---|---|---|
| 1 | Planner | Sonnet | 仕様 refine | /next-feature |
| 2 | Generator | Opus | コード実装 | /next-feature |
| 3 | Dependency Auditor | Haiku | import / npm audit 軽量チェック | /next-feature |
| 4 | Test Engineer | Sonnet | tsc / build / Vitest / Playwright 実行 | /next-feature |
| 5 | Designer A | Opus | ミニマル・モダン案 | /next-feature |
| 6 | Designer B | Opus | ウェルネス・感情デザイン案 | /next-feature |
| 7 | Designer C | Opus | データビジュアライゼーション案 | /next-feature |
| 8 | Design Judge | Sonnet | 3 案比較・最良案決定 | /next-feature |
| 9 | Security Reviewer | Sonnet | XSS / 脆弱性 / OWASP Top 10 | /next-feature |
| 10 | Legal | Sonnet | 薬機法・景表法・個人情報保護法 | /next-feature |
| 11 | Evaluator | Sonnet | 4 軸採点（閾値 8/10） | /next-feature |
| +1 | SRE | Sonnet | 18 項目デプロイ前チェック | /deploy-check |
| +2 | Refactorer | Sonnet | knip / ts-prune / jscpd による断捨離 | /cleanup |

差し戻しは最大 3 回まで。それ以上は feature を failing のまま次セッションへ引き継ぐ。
Refactorer と SRE は削除や不可逆操作の前に必ず人間の y/n を取る。

## 技術スタック（変更禁止）

- **フレームワーク**: Next.js 14（App Router）+ TypeScript
- **スタイリング**: Tailwind CSS + shadcn/ui
- **チャート**: Chart.js + react-chartjs-2
- **月齢計算**: suncalc
- **日付処理**: date-fns
- **アイコン**: lucide-react
- **データ保存**: localStorage（MVP）→ 将来 Supabase
- **気象 API**: Open-Meteo（無料・認証不要）
- **ホスティング**: Vercel
- **PWA**: next-pwa
- **SEO**: next-sitemap、JSON-LD 構造化データ
- **アナリティクス**: Google Analytics 4 + Vercel Analytics
- **広告**: Google AdSense（審査通過後に有効化）

## ディレクトリ構造（厳守）

```
sleep-forecast/
├── .claude/
│   ├── CLAUDE.md                 # このファイル
│   ├── agents/                   # Planner / Generator / Evaluator
│   └── commands/                 # /next-feature, /deploy-check, etc.
├── harness/
│   ├── feature-list.json         # 機能台帳（JSON）
│   ├── claude-progress.txt       # 進捗ログ（人間可読）
│   └── audit.log                 # Edit/Write の監査ログ
├── src/
│   ├── app/
│   │   ├── page.tsx              # トップ
│   │   ├── record/page.tsx       # 記録画面
│   │   ├── dashboard/page.tsx    # ダッシュボード
│   │   ├── settings/page.tsx     # 設定
│   │   ├── articles/[slug]/page.tsx  # SEO記事
│   │   ├── about/page.tsx        # 運営者情報
│   │   ├── privacy/page.tsx      # プライバシーポリシー
│   │   ├── terms/page.tsx        # 利用規約
│   │   ├── contact/page.tsx      # お問い合わせ
│   │   └── api/weather/route.ts  # Open-Meteo プロキシ
│   ├── components/
│   │   ├── ui/                   # shadcn/ui
│   │   ├── RecordForm.tsx
│   │   ├── CorrelationChart.tsx
│   │   ├── PredictionCard.tsx
│   │   └── AdBanner.tsx
│   ├── lib/
│   │   ├── storage.ts            # localStorage 操作
│   │   ├── weather.ts            # Open-Meteo API
│   │   ├── correlation.ts        # ピアソン相関 + 線形回帰
│   │   ├── prediction.ts         # 明日の予測ロジック
│   │   ├── prefectures.ts        # 47都道府県の緯度経度
│   │   └── types.ts              # TypeScript 型定義
│   └── content/
│       └── articles/             # Markdown の SEO 記事
├── public/
│   ├── manifest.json             # PWA
│   ├── ads.txt                   # AdSense
│   └── favicon.ico
├── package.json
├── tailwind.config.ts
├── next.config.js
├── .env.example
├── .gitignore
└── README.md
```

## Session Start Checklist

毎セッションの冒頭に必ず行う。

1. `cat harness/feature-list.json` で機能台帳を確認
2. `tail -50 harness/claude-progress.txt` で前回の作業を把握
3. `git log --oneline -20` で過去のコミットを確認
4. `npm run dev` または `./init.sh` で開発環境が立ち上がることを検証（初回以降）
5. 最優先の failing 機能を 1 つ選ぶ
6. Planner → Generator → Evaluator のループを実行

## Session End Checklist

- [ ] 実装した機能が動作する
- [ ] 動作確認（可能なら Playwright または手動）を行った
- [ ] harness/feature-list.json の status を更新した（Evaluator の判定後）
- [ ] harness/claude-progress.txt に作業サマリを追記した
- [ ] git commit した（メッセージ接頭辞: feat / fix / chore / docs）
- [ ] 不要なデバッグコード・console.log を削除した
- [ ] シークレットがコードに含まれていないか確認した

## プライバシー・免責事項

- 健康データを扱うため、**プライバシーポリシーは必須**
- 位置情報は「都道府県」精度まで。正確な緯度経度は保存しない
- 「医療行為・診断ではない」旨をフッターと各予測カードに明記
- GDPR・個人情報保護法対応の注記を設ける
- localStorage 中心、個人特定情報は収集しない

## KPI（参考）

- ローンチ後 1 ヶ月: DAU 100 / 月間 PV 3,000 / AdSense $0-10
- ローンチ後 3 ヶ月: DAU 500 / 月間 PV 30,000 / AdSense $50-100

---
description: Run one Planner → Generator → Evaluator cycle for SleepForecast
---

# /next-feature

SleepForecast の次の failing 機能を 1 つ実装するサイクルを実行する。

## 手順

1. `cat harness/feature-list.json` で機能台帳を読む
2. `tail -50 harness/claude-progress.txt` で前回までの作業を把握
3. `git log --oneline -20` で過去のコミットを確認
4. `status == "failing"` で最優先の機能を 1 つ特定
5. Planner Agent を起動し、必要に応じて steps / acceptance_criteria を refine する
6. Generator Agent を起動し、その機能を **1 つだけ** 実装する
7. Generator の実装完了後、git commit する
8. Evaluator Agent を起動し、4 軸で採点する（閾値 8 点以上）
9. 評価結果を feature-list.json と claude-progress.txt に反映する
10. セッションサマリを出力する

## 成功判定

- git log に新しいコミットが 1 つ以上存在する
- feature-list.json の該当機能の status が更新されている（passing or failing）
- claude-progress.txt に Evaluator のフィードバックが追記されている

## 注意

- このコマンドは 1 回の実行で 1 機能のみ進める
- 全機能を通したい場合は `/next-feature` を繰り返し実行する
- デプロイ機能（deploy-check）は別コマンド `/deploy-check` を使う

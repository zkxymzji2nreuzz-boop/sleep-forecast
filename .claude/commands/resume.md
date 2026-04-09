---
description: Resume from the last session using progress file and git log
---

# /resume

直前のセッションの続きから作業を再開する。

## 手順

1. `tail -100 harness/claude-progress.txt` で直近の作業を把握
2. `git log --oneline -20` を実行
3. `cat harness/feature-list.json` で次に着手すべき failing 機能を特定
4. その機能について Planner → Generator → Evaluator のループを 1 回だけ実行
5. セッションを終える前に commit と progress 更新を必ず行う

## 用途

- 前セッションが途中で終わった場合
- 複数日にわたって作業する場合
- エラーで止まった場合、状況を整理してから続ける

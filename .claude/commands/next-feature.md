---
description: Run one Planner → Generator → Dep Auditor → Test Engineer → Designer(×3) → Design Judge → Security → Legal → Evaluator cycle for SleepForecast
---

# /next-feature

SleepForecast の次の failing 機能を 1 つ実装するサイクルを実行する。

## 手順

1. `cat harness/feature-list.json` で機能台帳を読む
2. `tail -50 harness/claude-progress.txt` で前回までの作業を把握
3. `git log --oneline -20` で過去のコミットを確認
4. `status == "failing"` で最優先の機能を 1 つ特定
5. **Planner Agent**（Sonnet）を起動し、steps / acceptance_criteria を refine する
6. **Generator Agent**（Opus）を起動し、その機能を **1 つだけ** 実装する
7. Generator の実装完了後、git commit する（`feat: implement Fxxx (WIP)`）
8. **Dependency Auditor Agent**（Haiku）を起動し、ハルシネート import / 脆弱性を高速チェック
   - FAIL の場合: Generator に差し戻し → 修正 → 再チェック
9. **Test Engineer Agent**（Sonnet）を起動し、テストを書いて実行する
   - FAIL の場合: Generator に差し戻し → 修正 → 再テスト
10. **Designer Agent A・B・C**（各 Opus）を並列起動し、それぞれデザイン改善案を提案する
11. **Design Judge Agent**（Sonnet）を起動し、3 案を評価して最良案を決定・Generator に実装指示を出す
12. Generator が Design Judge の指示に従いデザインを適用し、git commit する（`style: apply Design Judge recommendations for Fxxx`）
13. **Security Reviewer Agent**（Sonnet）を起動し、技術的脆弱性をチェックする
    - FAIL の場合: Generator に差し戻し → 修正 → 再チェック
    - WARNING の場合: 次へ進む
14. **Legal Agent**（Sonnet）を起動し、法的コンプライアンスをチェックする
    - FAIL の場合: Generator に差し戻し → 修正 → 再チェック
    - PASS / WARNING の場合: 次へ進む
15. **Evaluator Agent**（Sonnet）を起動し、4 軸で採点する（閾値 各 8 点以上）
16. 評価結果を feature-list.json と claude-progress.txt に反映する
17. 最終 git commit（`feat: complete Fxxx`）してセッションサマリを出力する

## エージェント構成（9 体制）

| # | エージェント | モデル | 役割 | タイミング |
|---|---|---|---|---|
| 1 | Planner | Sonnet | 仕様 refine | 最初 |
| 2 | Generator | Opus | コード実装 | 2nd / 各差し戻し後 |
| 3 | Dependency Auditor | Haiku | import / 脆弱性高速チェック | 実装直後 |
| 4 | Test Engineer | Sonnet | テスト作成・実行 | Dep Auditor 後 |
| 5 | Designer A | Opus | ミニマル・モダン案 | 並列 |
| 6 | Designer B | Opus | ウェルネス・感情デザイン案 | 並列 |
| 7 | Designer C | Opus | データビジュアライゼーション案 | 並列 |
| 8 | Design Judge | Sonnet | 3 案比較・最良案決定 | Designer 後 |
| 9 | Security Reviewer | Sonnet | 技術的脆弱性チェック | デザイン適用後 |
| 10 | Legal | Sonnet | 法的コンプライアンスチェック | Security 後 |
| 11 | Evaluator | Sonnet | 4 軸採点（閾値 8/10） | 最後 |

## 差し戻しループ

Generator に戻す可能性のあるエージェント:
- Dependency Auditor → ハルシネート / 脆弱性
- Test Engineer → 型エラー / ビルド失敗 / テスト赤
- Security Reviewer → 技術的脆弱性
- Legal → 薬機法・景表法などの違反
- Evaluator → 4 軸どれかが 8 点未満

差し戻しの回数は **最大 3 回** まで。それ以上は feature を failing のまま残し、claude-progress.txt に理由を記録して次セッションに引き継ぐ。

## 成功判定

- git log に新しいコミットが 2 つ以上存在する（実装 + デザイン適用）
- feature-list.json の該当機能の status が更新されている（passing or failing）
- claude-progress.txt に各エージェントのフィードバックが追記されている
- Test Engineer / Security / Legal が PASS または WARNING
- Evaluator が全 4 軸 8 点以上

## 注意

- このコマンドは 1 回の実行で 1 機能のみ進める
- 全機能を通したい場合は `/next-feature` を繰り返し実行する
- デプロイは別コマンド `/deploy-check` を使う
- Designer 3 案は可能な限り並列実行してトークン消費を抑える
- SRE / DevOps エージェントは `/deploy-check` のみで動く（ここでは起動しない）

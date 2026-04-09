---
description: Run the Refactorer agent to detect unused code, files, exports, and duplication. Never auto-deletes — requires human y/n.
---

# /cleanup

SleepForecast のコードベースから無駄を検出し、削除提案を出す。
**自動削除は絶対にしない**。必ず人間（のたん）の y/n 確認を経る。

推奨頻度: **3〜4 機能実装ごと** または重要なマイルストーン前（`/deploy-check` の前など）

## 手順

1. `git status` で未コミットの変更がないか確認する
   - あれば先にコミットするよう促す（クリーンな状態で走らせる）
2. `git log --oneline -20` で直近の変更範囲を把握
3. **Refactorer Agent**（Sonnet）を起動する
4. Refactorer は以下のツールを順に実行する
   - `npx knip` — 未使用ファイル・export・依存
   - `npx ts-prune` — 未使用 export（補助）
   - `npx jscpd src` — 重複コード検出
   - `git grep` — console.log / debugger / TODO 残骸
5. Refactorer は検出結果をカテゴリ別（High / Medium / Low）にまとめる
6. 削除提案を **カテゴリごと** に人間に提示し、y/n を聞く
7. **y の場合のみ** 削除を実行
8. 削除後、`npx tsc --noEmit` と `npm run build` でビルド壊れていないか検証
9. 壊れていたら即 `git restore` でロールバック
10. OK なら `refactor: cleanup unused code (x files, y exports, z deps)` で commit

## 削除承認のまとめ方

Refactorer は以下のように段階的に確認する:

```
【High 優先: 安全に削除できるもの】
✅ 未使用ファイル 3 件
✅ 未使用依存 2 件
→ これらを削除してよろしいですか？ (y/n)
```

```
【Medium 優先: 一応確認したいもの】
⚠️ 未使用 export 5 件（将来の可能性あり）
→ これらを削除してよろしいですか？ (y/n/skip)
```

```
【Low 優先: 軽量な掃除】
🧹 console.log 残骸 8 件
🧹 TODO 放置 3 件
→ これらを掃除してよろしいですか？ (y/n)
```

```
【要レビュー: Generator への依頼案件】
📝 重複コード 2 ブロック → 共通フック抽出を推奨
📝 300 行超えファイル 1 件 → 分割を推奨
→ これらは次の /next-feature サイクルで Generator に依頼することを推奨します
```

## 禁止事項

- 人間の y/n 確認なしにファイルを削除しない
- `src/components/ui/` (shadcn/ui) を削除しない
- テストファイル（`*.test.ts` / `__tests__/`）を「未使用」として削除しない
- 国際化キー・翻訳データを削除しない
- `.git` / `node_modules` / `package-lock.json` に触らない
- マイグレーションスクリプトを削除しない
- ビルドが壊れる可能性がある場合は即中止

## 成功判定

- git log に `refactor:` prefix の新コミットがある
- `npm run build` が削除後もエラーなく成功する
- `npx tsc --noEmit` が削除後もエラーなし
- 削除したファイルの一覧が claude-progress.txt に記録されている

## 備考

- Refactorer は `/cleanup` でのみ起動する（`/next-feature` では起動しない）
- `knip.config.ts` が未作成の場合は Refactorer が最初に作成する
- shadcn/ui の未使用コンポーネントは `ignore` 設定で除外する（将来使う可能性があるため）
- このコマンドは 1 回あたり 2〜5 分で完了するはず

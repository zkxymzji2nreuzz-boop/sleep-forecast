# File Integrity Agent

## 役割

セッション開始時にプロジェクトファイルの破損を検知し、自動修復する。
人間の介入なしに完結させる。人間に報告するのは**修復不可能な場合のみ**。

## 起動タイミング

- `/next-feature` の**フェーズ 0**（最初のステップ）
- 手動実行: `ファイル整合性チェックを実行して` と指示する

---

## 実行手順

### Step 1: git 状態の確認

```bash
git status --short
git log --oneline -5
```

- `git status` で uncommitted changes（M, ??, UU 等）を列挙
- 意図せず変更されているファイルがあれば破損候補とする

### Step 2: 構文チェック（破損検知）

以下を並列で実行する:

```bash
# JSON ファイルの構文チェック
jq . harness/feature-list.json > /dev/null 2>&1 && echo "OK: feature-list.json" || echo "BROKEN: feature-list.json"
jq . package.json > /dev/null 2>&1 && echo "OK: package.json" || echo "BROKEN: package.json"
jq . tsconfig.json > /dev/null 2>&1 && echo "OK: tsconfig.json" || echo "BROKEN: tsconfig.json"

# TypeScript の主要ファイルが空や短すぎないか確認（破損 = 正常時の 30% 以下）
wc -l src/lib/types.ts src/lib/prediction.ts src/lib/weather.ts src/lib/storage.ts \
       src/app/layout.tsx src/app/page.tsx src/app/record/page.tsx \
       src/app/dashboard/page.tsx src/components/PredictionCard.tsx 2>/dev/null
```

**破損の判定基準:**
- JSON: `jq .` がエラーを返す
- TypeScript: 行数が git HEAD のファイルと比べて 50% 以下
- ファイル: 存在するが 10 行未満（空に近い）

### Step 3: git HEAD との差分確認

怪しいファイルについて git HEAD と比較する:

```bash
git diff HEAD -- <file>
```

- 差分が大きすぎる（500行以上の削除）場合は破損とみなす
- 差分が合理的（50行以下の変更）な場合は正常な変更とみなし、スキップ

### Step 4: 自動修復

破損ファイルを git HEAD から復元する:

```bash
git show HEAD:<path/to/file> > <path/to/file>
echo "[$(date '+%Y-%m-%d %H:%M:%S')] REPAIRED: <file> restored from git HEAD" >> harness/audit.log
```

**修復後の検証:**
- JSON: `jq . <file>` が通ること
- TypeScript: `npx tsc --noEmit 2>&1 | head -20` でエラーが増えていないこと

### Step 5: 修復レポート

```
=== File Integrity Report ===
実行時刻: <datetime>
チェックファイル数: N
破損検知: M 件
自動修復: M 件
  - REPAIRED: src/lib/types.ts (truncated → restored from git HEAD)
  - REPAIRED: package.json (invalid JSON → restored from git HEAD)
修復不可: 0 件
===========================
```

---

## 修復不可能なケース（人間に報告）

以下の場合は**作業を止めて**人間に状況を説明する:

1. git 管理外の新規ファイルが壊れている（`git show HEAD` できない）
2. `git show HEAD:<file>` が失敗する（git リポジトリ破損の疑い）
3. 修復後もビルドエラーが残る（`tsc --noEmit` が新たなエラーを出す）
4. 同一ファイルが**前回の audit.log にも修復記録がある**（繰り返し破損）

報告フォーマット:
```
⚠️ File Integrity Agent: 自動修復できないファイルがあります
ファイル: <path>
問題: <理由>
推奨対応: <手動で確認してください / git 履歴を確認してください>
```

---

## audit.log フォーマット

`harness/audit.log` に追記する（上書き禁止）:

```
[2026-04-10 09:00:00] SESSION_START: File Integrity check started
[2026-04-10 09:00:01] OK: harness/feature-list.json
[2026-04-10 09:00:01] OK: package.json
[2026-04-10 09:00:02] BROKEN: src/lib/types.ts (3 lines, expected ~80)
[2026-04-10 09:00:02] REPAIRED: src/lib/types.ts restored from git HEAD
[2026-04-10 09:00:03] SESSION_START: complete (1 repaired, 0 unresolvable)
```

---

## 注意事項

- **決して `git reset --hard` を使わない**（未コミットの正常な変更まで消えてしまう）
- **`git show HEAD:<file> > <file>` のみ使う**（対象ファイル 1 つずつ）
- 修復は破損が確認されたファイルのみ。正常ファイルには触れない
- ログは append（`>>`）のみ。上書き（`>`）禁止

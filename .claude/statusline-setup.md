# Statusline セットアップ手順

statusline.py は `.claude/statusline.py` に配置済みです。
Claude Code の settings.json に以下を追記してください。

## 設定方法

WSL のターミナルで次を実行してください：

```bash
cat >> ~/.claude/settings.json << 'EOF'
EOF
```

または ~/.claude/settings.json を開いて、以下の `statusLine` ブロックを追記してください：

```json
{
  "statusLine": {
    "type": "command",
    "command": "python3 /mnt/c/Users/nonog/Desktop/sleep-forecast/.claude/statusline.py",
    "refreshInterval": 30
  }
}
```

## 確認方法

Claude Code を再起動すると画面下部に2行のステータスラインが表示されます。

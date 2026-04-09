#!/usr/bin/env python3
import json, sys, subprocess, os
from datetime import datetime

data = json.load(sys.stdin)
model = data['model']['display_name']
directory = os.path.basename(data['workspace']['current_dir'])
cost = data.get('cost', {}).get('total_cost_usd', 0) or 0
pct = int(data.get('context_window', {}).get('used_percentage', 0) or 0)
duration_ms = data.get('cost', {}).get('total_duration_ms', 0) or 0

CYAN, GREEN, YELLOW, RED, RESET = '\033[36m', '\033[32m', '\033[33m', '\033[31m', '\033[0m'

# コンテキストバー（使用率で色が変化）
bar_color = RED if pct >= 90 else YELLOW if pct >= 70 else GREEN
bar = '█' * (pct // 10) + '░' * (10 - pct // 10)

# レート制限（Pro/Max のみ表示）
rl = data.get('rate_limits', {})
five_hour = rl.get('five_hour', {})
rl_pct = five_hour.get('used_percentage')
resets_at = five_hour.get('resets_at')
if rl_pct is not None and resets_at:
    reset_time = datetime.fromtimestamp(resets_at).strftime('%H:%M')
    rl_str = f" | 🔄 {rl_pct:.0f}% (reset {reset_time})"
else:
    rl_str = ""

mins, secs = duration_ms // 60000, (duration_ms % 60000) // 1000

# git ブランチ
try:
    branch = subprocess.check_output(
        ['git', 'branch', '--show-current'],
        text=True, stderr=subprocess.DEVNULL
    ).strip()
    branch_str = f" | 🌿 {branch}" if branch else ""
except:
    branch_str = ""

# 1行目：モデル・ディレクトリ・ブランチ
print(f"{CYAN}[{model}]{RESET} 📁 {directory}{branch_str}")
# 2行目：コンテキスト・コスト・時間・レート制限
print(f"{bar_color}{bar}{RESET} {pct}% ctx | {YELLOW}💰 ${cost:.3f}{RESET} | ⏱️ {mins}m {secs}s{rl_str}")

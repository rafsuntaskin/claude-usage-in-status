# usage-tracker

A Claude Code plugin that shows live token usage and rate limit status in your statusline after every prompt.

## What it shows

```
ctx 57% (+2.0%) in:3 out:94 ♻️ 108.8K │ session 90% 3h15m (9am) │ week 37% 4d4h (30 APR 10am)
```

| Segment | Source | Meaning |
|---------|--------|---------|
| `ctx 57%` | `context_window.used_percentage` | How full the context window is |
| `(+2.0%)` | Delta from previous turn | How much this prompt grew the context |
| `in:3 out:94` | `current_usage.input/output_tokens` | Fresh tokens sent and generated this turn |
| `♻️ 108.8K` | `current_usage.cache_read + cache_creation` | Tokens served from / written to cache |
| `session 90% 3h15m (9am)` | `rate_limits.five_hour` | 5-hour rate limit usage + time until reset |
| `week 37% 4d4h (30 APR 10am)` | `rate_limits.seven_day` | Weekly rate limit usage + reset date/time |

All data comes directly from Claude Code's stdin — no external API calls.

## Installation

```bash
cp -r usage-tracker-plugin ~/.claude/plugins/usage-tracker
```

Or via Claude Code:
```
/plugin install /path/to/usage-tracker-plugin
```

## Statusline setup

Run the setup script to auto-configure:

```bash
node ~/.claude/plugins/usage-tracker/setup.js
```

Or add manually to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/plugins/usage-tracker/hooks/scripts/statusline.js",
    "padding": 0
  }
}
```

Restart Claude Code after setup.

### Combining with other statuslines

```bash
#!/bin/bash
# ~/.claude/statusline-wrapper.sh
input=$(cat)
echo "$input" | your-existing-statusline.sh
echo "$input" | node ~/.claude/plugins/usage-tracker/hooks/scripts/statusline.js
```

## How the context delta works

The `(+2.0%)` value is the difference in `context_window.used_percentage` between the current and previous turn. State is stored in `~/.claude/usage-tracker/statusline-state.json` and cached per-render so re-renders don't overwrite the delta.

## Data files

`~/.claude/usage-tracker/`

| File | Description |
|------|-------------|
| `statusline-state.json` | Per-session previous ctx% for delta calculation |
| `usage-log.csv` | Per-prompt log written by the Stop hook |
| `session-summary.json` | Per-session aggregated stats |

## Plugin structure

```
usage-tracker-plugin/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       ├── statusline.js       # Statusline — reads stdin, writes one line
│       ├── track-usage.js      # Stop hook — logs per-prompt usage to CSV
│       ├── session-start.js    # SessionStart hook — initialises session summary
│       └── codex-adapter.js    # Import Codex CLI transcripts into usage-log.csv
├── setup.js
└── README.md
```

## Requirements

- Node.js 18+
- Claude Code 2.0+

## License

MIT

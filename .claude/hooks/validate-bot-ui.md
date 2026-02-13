# Validate Bot UI Hook

Automatically validates bot/ Python files after editing to catch UI anti-patterns.

## What It Checks

- **BOT001**: Raw Unicode escapes (`\U0001f`, `\u26a0`) — should use `emoji.py` constants
- **BOT002**: `parse_mode=` with non-HTML value
- **BOT003**: `InlineKeyboardMarkup` defined outside `keyboards.py`

## Setup

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "python bot/tools/validate_bot_ui.py bot/",
        "description": "Validate bot UI patterns after editing bot/ files"
      }
    ]
  }
}
```

## Manual Run

```bash
python bot/tools/validate_bot_ui.py bot/
```

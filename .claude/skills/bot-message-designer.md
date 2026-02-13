# Bot Message Designer

Design and modify Telegram bot messages for PredictRu using the template system.

## Template System

All bot messages are in `bot/templates/`:

- **`emoji.py`** — `E` class with emoji constants (E.CHART, E.MONEY, E.TARGET, etc.)
- **`keyboards.py`** — `Kb` class with inline keyboard factories
- **`messages.py`** — `Msg` class with message template methods

## Message Pattern

Every bot message follows this structure:

```
{emoji} <b>Header</b>

{emoji} Data line: <b>value</b>
{emoji} Data line: <b>value</b>

{emoji} <i>Hint or call-to-action</i>
```

Rules:
1. Always use `html.escape()` for user-supplied data (names, titles)
2. Use `<b>` for headers and values, `<i>` for hints
3. Use emoji from `E` class, never raw Unicode escapes like `\U0001f680`
4. Keep messages under 4096 characters (Telegram limit)
5. All messages use `parse_mode="HTML"`
6. Keyboards come from `Kb` class factories

## Adding a New Message

1. Add emoji constants to `bot/templates/emoji.py` if needed
2. Add a `@staticmethod` method to `Msg` class in `bot/templates/messages.py`
3. Add a keyboard factory to `Kb` class in `bot/templates/keyboards.py` if needed
4. Use `Msg.your_method()` and `Kb.your_keyboard()` in the handler
5. Add a preset to `bot/tools/preview.html` PRESETS object

## Preview

Open `bot/tools/preview.html` in a browser to preview messages with Telegram styling.

## Validation

Run `python bot/tools/validate_bot_ui.py bot/` to check for:
- BOT001: Raw Unicode escapes (use emoji.py)
- BOT002: Non-HTML parse_mode
- BOT003: Inline keyboards outside keyboards.py

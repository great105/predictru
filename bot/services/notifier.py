import logging

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

logger = logging.getLogger(__name__)


async def send_resolution_notification(
    bot: Bot,
    telegram_id: int,
    market_title: str,
    market_id: str,
    outcome: str,
    is_winner: bool,
    payout: float,
):
    outcome_label = "ДА" if outcome.lower() == "yes" else "НЕТ"

    if is_winner:
        text = (
            f"\U0001f389 <b>Твой прогноз сбылся!</b>\n\n"
            f"\U0001f4cc {market_title}\n"
            f"\U0001f3af Исход: <b>{outcome_label}</b>\n"
            f"\U0001f4b0 Выплата: <b>+{payout:.2f} PRC</b>\n\n"
            f"\U0001f525 Так держать!"
        )
    else:
        text = (
            f"\U0001f4e2 <b>Рынок закрыт</b>\n\n"
            f"\U0001f4cc {market_title}\n"
            f"\U0001f3af Исход: <b>{outcome_label}</b>\n\n"
            f"\U0001f4aa В следующий раз повезёт!"
        )

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="\U0001f4c8 Посмотреть рынок",
                    callback_data=f"open_market:{market_id}",
                )
            ],
            [
                InlineKeyboardButton(
                    text="\u274c Закрыть",
                    callback_data="dismiss",
                )
            ],
        ]
    )

    try:
        await bot.send_message(
            telegram_id, text, reply_markup=keyboard, parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Failed to send notification to {telegram_id}: {e}")


async def send_daily_digest(
    bot: Bot,
    telegram_id: int,
    hot_markets: list[dict],
):
    if not hot_markets:
        return

    lines = [
        "\U0001f31e <b>Доброе утро!</b>\n",
        "\U0001f525 <b>Горячие рынки сегодня:</b>\n",
    ]

    for i, m in enumerate(hot_markets[:5], 1):
        price_pct = m["price_yes"] * 100
        volume = m.get("total_volume", 0)
        lines.append(
            f"  <b>{i}.</b> {m['title']}\n"
            f"     \U0001f4ca Да: <b>{price_pct:.0f}%</b> \u2022 "
            f"Объём: <b>{volume:,.0f} PRC</b>\n"
        )

    lines.append("\n\U0001f447 Открой приложение и торгуй!")

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="\U0001f680 Открыть приложение",
                    callback_data="open_market:home",
                )
            ]
        ]
    )

    try:
        await bot.send_message(
            telegram_id,
            "\n".join(lines),
            reply_markup=keyboard,
            parse_mode="HTML",
        )
    except Exception as e:
        logger.error(f"Failed to send digest to {telegram_id}: {e}")

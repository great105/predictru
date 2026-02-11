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
    if is_winner:
        text = (
            f"Your prediction was correct!\n\n"
            f"Market: {market_title}\n"
            f"Outcome: {outcome.upper()}\n"
            f"Payout: +{payout:.2f} PRC"
        )
    else:
        text = (
            f"Market resolved\n\n"
            f"Market: {market_title}\n"
            f"Outcome: {outcome.upper()}\n"
            f"Better luck next time!"
        )

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="View Market",
                    callback_data=f"open_market:{market_id}",
                )
            ],
            [
                InlineKeyboardButton(text="Dismiss", callback_data="dismiss")
            ],
        ]
    )

    try:
        await bot.send_message(telegram_id, text, reply_markup=keyboard)
    except Exception as e:
        logger.error(f"Failed to send notification to {telegram_id}: {e}")


async def send_daily_digest(
    bot: Bot,
    telegram_id: int,
    hot_markets: list[dict],
):
    if not hot_markets:
        return

    lines = ["Daily Digest - Hot Markets:\n"]
    for m in hot_markets[:5]:
        lines.append(
            f"  {m['title']}\n"
            f"  Yes: {m['price_yes'] * 100:.0f}% | Vol: {m['total_volume']:.0f} PRC\n"
        )

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Open App",
                    callback_data="open_market:home",
                )
            ]
        ]
    )

    try:
        await bot.send_message(telegram_id, "\n".join(lines), reply_markup=keyboard)
    except Exception as e:
        logger.error(f"Failed to send digest to {telegram_id}: {e}")

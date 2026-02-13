import html
import logging

from aiogram import Bot

from app.core.config import settings
from app.tasks.broker import broker

logger = logging.getLogger(__name__)


def _outcome_label(outcome: str) -> str:
    return "ДА" if outcome.lower() == "yes" else "НЕТ"


@broker.task
async def send_resolution_notifications(
    market_id: str,
    market_title: str,
    outcome: str,
    winners: list[dict],
    losers: list[dict],
) -> None:
    """Send notifications to all participants of a resolved market."""
    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    safe_title = html.escape(market_title)
    label = _outcome_label(outcome)

    try:
        for winner in winners:
            try:
                text = (
                    f"🎉 <b>Твой прогноз сбылся!</b>\n\n"
                    f"📌 {safe_title}\n"
                    f"🎯 Исход: <b>{label}</b>\n"
                    f"💰 Выплата: <b>+{winner['payout']:.2f} PRC</b>\n\n"
                    f"🔥 Так держать!"
                )
                await bot.send_message(
                    winner["telegram_id"], text, parse_mode="HTML"
                )
            except Exception as e:
                logger.error(f"Failed to notify winner {winner['telegram_id']}: {e}")

        for loser in losers:
            try:
                text = (
                    f"📢 <b>Рынок закрыт</b>\n\n"
                    f"📌 {safe_title}\n"
                    f"🎯 Исход: <b>{label}</b>\n\n"
                    f"💪 В следующий раз повезёт!"
                )
                await bot.send_message(
                    loser["telegram_id"], text, parse_mode="HTML"
                )
            except Exception as e:
                logger.error(f"Failed to notify loser {loser['telegram_id']}: {e}")
    finally:
        await bot.session.close()


@broker.task
async def send_trade_confirmation(
    telegram_id: int,
    market_title: str,
    outcome: str,
    shares: float,
    cost: float,
) -> None:
    """Send trade confirmation to user."""
    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    safe_title = html.escape(market_title)
    label = _outcome_label(outcome)

    try:
        text = (
            f"✅ <b>Сделка подтверждена!</b>\n\n"
            f"📌 {safe_title}\n"
            f"🎯 Сторона: <b>{label}</b>\n"
            f"📊 Акций: <b>{shares:.2f}</b>\n"
            f"💳 Стоимость: <b>{cost:.2f} PRC</b>"
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML")
    except Exception as e:
        logger.error(f"Failed to send trade confirmation to {telegram_id}: {e}")
    finally:
        await bot.session.close()

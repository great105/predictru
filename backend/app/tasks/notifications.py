import logging

from aiogram import Bot

from app.core.config import settings
from app.tasks.broker import broker

logger = logging.getLogger(__name__)


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

    try:
        for winner in winners:
            try:
                await bot.send_message(
                    winner["telegram_id"],
                    f"Your prediction was correct!\n\n"
                    f"Market: {market_title}\n"
                    f"Outcome: {outcome.upper()}\n"
                    f"Payout: +{winner['payout']:.2f} PRC",
                )
            except Exception as e:
                logger.error(f"Failed to notify winner {winner['telegram_id']}: {e}")

        for loser in losers:
            try:
                await bot.send_message(
                    loser["telegram_id"],
                    f"Market resolved: {market_title}\n"
                    f"Outcome: {outcome.upper()}\n"
                    f"Better luck next time!",
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
    try:
        await bot.send_message(
            telegram_id,
            f"Trade confirmed!\n\n"
            f"Market: {market_title}\n"
            f"Side: {outcome.upper()}\n"
            f"Shares: {shares:.2f}\n"
            f"Cost: {cost:.2f} PRC",
        )
    except Exception as e:
        logger.error(f"Failed to send trade confirmation to {telegram_id}: {e}")
    finally:
        await bot.session.close()

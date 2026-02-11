import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session
from app.core.redis import get_redis
from app.models.market import Market, MarketStatus
from app.models.user import User
from app.tasks.broker import broker

logger = logging.getLogger(__name__)


@broker.task(schedule=[{"cron": "*/5 * * * *"}])
async def refresh_leaderboard() -> None:
    """Refresh leaderboard cache every 5 minutes."""
    redis = await get_redis()
    async with async_session() as db:
        result = await db.execute(
            select(User)
            .where(User.is_active)
            .order_by(User.total_profit.desc())
            .limit(100)
        )
        users = result.scalars().all()

        entries = []
        for rank, user in enumerate(users, 1):
            entries.append(
                {
                    "id": str(user.id),
                    "username": user.username,
                    "first_name": user.first_name,
                    "total_profit": float(user.total_profit),
                    "win_rate": float(user.win_rate),
                    "total_trades": user.total_trades,
                    "rank": rank,
                }
            )

        for period in ("week", "month", "all"):
            await redis.setex(
                f"leaderboard:{period}",
                300,
                json.dumps(entries),
            )

    await redis.aclose()
    logger.info(f"Leaderboard refreshed with {len(entries)} entries")


@broker.task(schedule=[{"cron": "* * * * *"}])
async def close_expired_markets() -> None:
    """Close markets that have passed their closing time."""
    now = datetime.now(timezone.utc)
    async with async_session() as db:
        result = await db.execute(
            select(Market).where(
                Market.status == MarketStatus.OPEN,
                Market.closes_at <= now,
            )
        )
        markets = result.scalars().all()

        for market in markets:
            market.status = MarketStatus.TRADING_CLOSED
            logger.info(f"Market closed: {market.id} - {market.title}")

        if markets:
            await db.commit()

    redis = await get_redis()
    await redis.delete("markets:list")
    await redis.aclose()


@broker.task(schedule=[{"cron": "0 6 * * *"}])
async def send_daily_digests() -> None:
    """Send daily digest notifications at 09:00 MSK (06:00 UTC)."""
    from aiogram import Bot

    async with async_session() as db:
        # Get hot markets
        result = await db.execute(
            select(Market)
            .where(Market.status == MarketStatus.OPEN)
            .order_by(Market.total_volume.desc())
            .limit(5)
        )
        hot_markets = result.scalars().all()

        if not hot_markets:
            return

        # Get all active users
        result = await db.execute(select(User).where(User.is_active).limit(1000))
        users = result.scalars().all()

    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    try:
        market_lines = []
        for m in hot_markets:
            market_lines.append(f"  {m.title}")

        text = "Good morning! Here are today's hot markets:\n\n" + "\n".join(
            market_lines
        )

        sent = 0
        for user in users:
            try:
                await bot.send_message(user.telegram_id, text)
                sent += 1
            except Exception:
                pass

        logger.info(f"Daily digest sent to {sent}/{len(users)} users")
    finally:
        await bot.session.close()

import json
import logging
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session
from app.core.redis import get_redis
from app.models.market import Market, MarketStatus
from app.models.private_bet import PrivateBet, PrivateBetParticipant, PrivateBetStatus
from app.models.transaction import Transaction, TransactionType
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
    import html as html_mod

    from aiogram import Bot
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

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
    nums = ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"]
    try:
        lines = [
            "☀️ <b>Доброе утро!</b>\n",
            "Вот что обсуждают прямо сейчас:\n",
        ]
        for i, m in enumerate(hot_markets, 1):
            safe_title = html_mod.escape(m.title)
            price_pct = float(m.price_yes) * 100 if m.price_yes else 50
            num = nums[i] if i < len(nums) else f"<b>{i}.</b>"
            lines.append(
                f"{num} {safe_title}\n     → <b>{price_pct:.0f}%</b> думают что ДА\n"
            )
        lines.append("Согласен? Поставь свой прогноз 👇")
        text = "\n".join(lines)

        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="▶️ Сделать прогноз",
                        callback_data="open_market:home",
                    )
                ]
            ]
        )

        sent = 0
        for user in users:
            try:
                await bot.send_message(
                    user.telegram_id,
                    text,
                    reply_markup=keyboard,
                    parse_mode="HTML",
                )
                sent += 1
            except Exception:
                pass

        logger.info(f"Daily digest sent to {sent}/{len(users)} users")
    finally:
        await bot.session.close()


FEE_RATE = Decimal("0.02")


@broker.task(schedule=[{"cron": "* * * * *"}])
async def close_expired_private_bets() -> None:
    """Move OPEN private bets past closes_at to VOTING (or CANCEL if one-sided)."""
    now = datetime.now(timezone.utc)
    async with async_session() as db:
        result = await db.execute(
            select(PrivateBet)
            .where(
                PrivateBet.status == PrivateBetStatus.OPEN,
                PrivateBet.closes_at <= now,
            )
            .with_for_update()
        )
        bets = result.scalars().all()

        for bet in bets:
            total = bet.yes_count + bet.no_count
            # Cancel if nobody joined, or only one side has participants
            if total <= 1 or bet.yes_count == 0 or bet.no_count == 0:
                bet.status = PrivateBetStatus.CANCELLED
                bet.resolved_at = now
                # Refund all
                p_result = await db.execute(
                    select(PrivateBetParticipant).where(
                        PrivateBetParticipant.bet_id == bet.id
                    )
                )
                for p in p_result.scalars().all():
                    p.payout = bet.stake_amount
                    user = await db.get(User, p.user_id, with_for_update=True)
                    if user:
                        user.balance += bet.stake_amount
                        db.add(
                            Transaction(
                                user_id=p.user_id,
                                type=TransactionType.BET_REFUND,
                                amount=bet.stake_amount,
                                description=f"Возврат ставки: {bet.title[:80]}",
                            )
                        )
                logger.info(f"Private bet cancelled (one-sided): {bet.id}")
            else:
                bet.status = PrivateBetStatus.VOTING
                logger.info(f"Private bet moved to voting: {bet.id}")

        if bets:
            await db.commit()


@broker.task(schedule=[{"cron": "*/5 * * * *"}])
async def resolve_expired_voting() -> None:
    """Resolve VOTING private bets past voting_deadline by majority vote."""
    now = datetime.now(timezone.utc)
    async with async_session() as db:
        result = await db.execute(
            select(PrivateBet)
            .where(
                PrivateBet.status == PrivateBetStatus.VOTING,
                PrivateBet.voting_deadline <= now,
            )
            .with_for_update()
        )
        bets = result.scalars().all()

        for bet in bets:
            total_votes = bet.yes_votes + bet.no_votes
            if total_votes == 0 or bet.yes_votes == bet.no_votes:
                # No votes or tie → cancel and refund
                bet.status = PrivateBetStatus.CANCELLED
                bet.resolved_at = now
                p_result = await db.execute(
                    select(PrivateBetParticipant).where(
                        PrivateBetParticipant.bet_id == bet.id
                    )
                )
                for p in p_result.scalars().all():
                    p.payout = bet.stake_amount
                    user = await db.get(User, p.user_id, with_for_update=True)
                    if user:
                        user.balance += bet.stake_amount
                        db.add(
                            Transaction(
                                user_id=p.user_id,
                                type=TransactionType.BET_REFUND,
                                amount=bet.stake_amount,
                                description=f"Возврат ставки: {bet.title[:80]}",
                            )
                        )
                logger.info(f"Private bet cancelled (tie/no votes): {bet.id}")
            else:
                # Majority wins
                winning = "yes" if bet.yes_votes > bet.no_votes else "no"
                bet.status = PrivateBetStatus.RESOLVED
                bet.resolution_outcome = winning
                bet.resolved_at = now

                total_pool = bet.total_pool
                fee = (total_pool * FEE_RATE).quantize(Decimal("0.01"))
                payout_pool = total_pool - fee

                w_result = await db.execute(
                    select(PrivateBetParticipant).where(
                        PrivateBetParticipant.bet_id == bet.id,
                        PrivateBetParticipant.outcome == winning,
                    )
                )
                winners = w_result.scalars().all()
                if winners:
                    per_winner = (payout_pool / len(winners)).quantize(Decimal("0.01"))
                    for w in winners:
                        w.payout = per_winner
                        user = await db.get(User, w.user_id, with_for_update=True)
                        if user:
                            user.balance += per_winner
                            db.add(
                                Transaction(
                                    user_id=w.user_id,
                                    type=TransactionType.BET_PAYOUT,
                                    amount=per_winner,
                                    description=f"Выигрыш в споре: {bet.title[:80]}",
                                )
                            )

                logger.info(
                    f"Private bet resolved by deadline: {bet.id}, outcome={winning}"
                )

        if bets:
            await db.commit()

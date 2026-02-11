import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.market import Market, MarketStatus
from app.models.position import Position
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.services.order_book import OrderBookService


class ResolutionService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis

    async def resolve_market(
        self,
        market_id: uuid.UUID,
        outcome: str,
    ) -> dict:
        if outcome not in ("yes", "no"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid outcome")

        market = await self.db.get(Market, market_id, with_for_update=True)
        if market is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")
        if market.status not in (MarketStatus.OPEN, MarketStatus.TRADING_CLOSED):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Market cannot be resolved"
            )

        market.status = MarketStatus.RESOLVED
        market.resolution_outcome = outcome
        market.resolved_at = datetime.now(timezone.utc)

        # Cancel all open CLOB orders before payouts
        if market.amm_type == "clob":
            ob_service = OrderBookService(self.db, self.redis)
            await ob_service.cancel_all_market_orders(market_id)

        # Get all positions for this market
        result = await self.db.execute(
            select(Position).where(Position.market_id == market_id)
        )
        positions = result.scalars().all()

        winners = []
        for position in positions:
            user = await self.db.get(User, position.user_id, with_for_update=True)
            if user is None:
                continue

            if position.outcome == outcome:
                # Winner: payout = shares * 1.00 PRC per share
                payout = position.shares * Decimal("1.00")
                user.balance += payout
                profit = payout - position.total_cost
                user.total_profit += profit

                tx = Transaction(
                    user_id=position.user_id,
                    market_id=market_id,
                    type=TransactionType.PAYOUT,
                    amount=payout,
                    shares=position.shares,
                    outcome=outcome,
                    description=f"Payout for {market.title}",
                )
                self.db.add(tx)
                winners.append(position.user_id)
            # Losers get nothing - their cost is already deducted

            # Update win rate
            if user.total_trades > 0:
                # Count winning transactions
                win_result = await self.db.execute(
                    select(Transaction).where(
                        Transaction.user_id == user.id,
                        Transaction.type == TransactionType.PAYOUT,
                    )
                )
                wins = len(win_result.scalars().all())
                user.win_rate = Decimal(str(round(wins / user.total_trades * 100, 2)))

        await self.db.commit()

        await self.redis.delete(f"market:{market_id}")
        await self.redis.delete("markets:list")

        return {
            "market_id": str(market_id),
            "outcome": outcome,
            "winners_count": len(winners),
            "total_positions": len(positions),
        }

    async def cancel_market(self, market_id: uuid.UUID) -> dict:
        market = await self.db.get(Market, market_id, with_for_update=True)
        if market is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")
        if market.status == MarketStatus.RESOLVED:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Cannot cancel resolved market"
            )

        market.status = MarketStatus.CANCELLED

        # Refund all positions
        result = await self.db.execute(
            select(Position).where(Position.market_id == market_id)
        )
        positions = result.scalars().all()

        refunded = 0
        for position in positions:
            if position.total_cost <= 0:
                continue

            user = await self.db.get(User, position.user_id, with_for_update=True)
            if user is None:
                continue

            user.balance += position.total_cost
            refunded += 1

            tx = Transaction(
                user_id=position.user_id,
                market_id=market_id,
                type=TransactionType.PAYOUT,
                amount=position.total_cost,
                shares=position.shares,
                outcome=position.outcome,
                description=f"Refund for cancelled market: {market.title}",
            )
            self.db.add(tx)

        await self.db.commit()

        await self.redis.delete(f"market:{market_id}")
        await self.redis.delete("markets:list")

        return {
            "market_id": str(market_id),
            "refunded_positions": refunded,
        }

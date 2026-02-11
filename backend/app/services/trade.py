import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.market import Market, MarketStatus
from app.models.position import Position
from app.models.price_history import PriceHistory
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.core.config import settings
from app.services.market_maker.base import MarketState
from app.services.market_maker.factory import get_market_maker


class TradeService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis
        self.fee_percent = Decimal(str(settings.TRADE_FEE_PERCENT)) / Decimal("100")

    async def buy(
        self,
        user_id: uuid.UUID,
        market_id: uuid.UUID,
        outcome: str,
        amount: Decimal,
    ) -> dict:
        if outcome not in ("yes", "no"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid outcome")
        if amount <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Amount must be positive")

        # Lock market and user rows
        market = await self.db.get(Market, market_id, with_for_update=True)
        if market is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")
        if market.status != MarketStatus.OPEN:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Market is not open for trading"
            )
        if market.amm_type != "lmsr":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "This market uses CLOB. Use /v1/orderbook/orders",
            )

        # Check bet limits
        if amount < market.min_bet:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"Minimum bet is {market.min_bet} PRC"
            )
        if amount > market.max_bet:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"Maximum bet is {market.max_bet} PRC"
            )

        user = await self.db.get(User, user_id, with_for_update=True)
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        if user.balance < amount:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient balance")

        # Calculate fee
        fee = (amount * self.fee_percent).quantize(Decimal("0.01"))
        net_amount = amount - fee

        # Calculate shares via MarketMaker (on net amount after fee)
        mm = get_market_maker(market.amm_type)
        state = MarketState(
            q_yes=market.q_yes, q_no=market.q_no, liquidity_b=market.liquidity_b
        )
        shares = mm.get_shares_for_amount(state, outcome, float(net_amount))

        if shares <= 0:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Cannot purchase zero shares"
            )

        # Update market quantities
        if outcome == "yes":
            market.q_yes += Decimal(str(shares))
        else:
            market.q_no += Decimal(str(shares))
        market.total_volume += amount

        # Update user balance
        user.balance -= amount
        user.total_trades += 1

        # Upsert position
        result = await self.db.execute(
            select(Position)
            .where(
                Position.user_id == user_id,
                Position.market_id == market_id,
                Position.outcome == outcome,
            )
            .with_for_update()
        )
        position = result.scalar_one_or_none()

        if position is None:
            position = Position(
                user_id=user_id,
                market_id=market_id,
                outcome=outcome,
                shares=Decimal(str(shares)),
                total_cost=amount,
                avg_price=amount / Decimal(str(shares)),
            )
            self.db.add(position)
            market.total_traders += 1
        else:
            total_shares = position.shares + Decimal(str(shares))
            position.total_cost += amount
            position.avg_price = position.total_cost / total_shares
            position.shares = total_shares

        # Get new price
        new_state = MarketState(
            q_yes=market.q_yes, q_no=market.q_no, liquidity_b=market.liquidity_b
        )
        price_yes = mm.get_price(new_state, "yes")
        price_no = mm.get_price(new_state, "no")

        # Record buy transaction
        tx = Transaction(
            user_id=user_id,
            market_id=market_id,
            type=TransactionType.BUY,
            amount=-amount,
            shares=Decimal(str(shares)),
            outcome=outcome,
            price_at_trade=Decimal(
                str(round(price_yes if outcome == "yes" else price_no, 4))
            ),
            description=f"Buy {outcome.upper()} | fee: {fee} PRC",
        )
        self.db.add(tx)

        # Record fee transaction
        if fee > 0:
            fee_tx = Transaction(
                user_id=user_id,
                market_id=market_id,
                type=TransactionType.FEE,
                amount=-fee,
                description=f"Trading fee {settings.TRADE_FEE_PERCENT}%",
            )
            self.db.add(fee_tx)

        # Record price history
        ph = PriceHistory(
            market_id=market_id,
            price_yes=Decimal(str(round(price_yes, 4))),
            price_no=Decimal(str(round(price_no, 4))),
            q_yes=market.q_yes,
            q_no=market.q_no,
        )
        self.db.add(ph)

        await self.db.commit()

        # Invalidate cache
        await self.redis.delete(f"market:{market_id}")
        await self.redis.delete("markets:list")

        return {
            "shares": round(shares, 6),
            "cost": float(amount),
            "fee": float(fee),
            "price_yes": round(price_yes, 4),
            "price_no": round(price_no, 4),
            "new_balance": float(user.balance),
        }

    async def sell(
        self,
        user_id: uuid.UUID,
        market_id: uuid.UUID,
        outcome: str,
        shares: Decimal,
    ) -> dict:
        if outcome not in ("yes", "no"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid outcome")
        if shares <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Shares must be positive")

        market = await self.db.get(Market, market_id, with_for_update=True)
        if market is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")
        if market.status != MarketStatus.OPEN:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Market is not open for trading"
            )
        if market.amm_type != "lmsr":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "This market uses CLOB. Use /v1/orderbook/orders",
            )

        user = await self.db.get(User, user_id, with_for_update=True)
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

        result = await self.db.execute(
            select(Position)
            .where(
                Position.user_id == user_id,
                Position.market_id == market_id,
                Position.outcome == outcome,
            )
            .with_for_update()
        )
        position = result.scalar_one_or_none()

        if position is None or position.shares < shares:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient shares")

        # Calculate revenue
        mm = get_market_maker(market.amm_type)
        state = MarketState(
            q_yes=market.q_yes, q_no=market.q_no, liquidity_b=market.liquidity_b
        )
        revenue = mm.get_sale_revenue(state, outcome, float(shares))
        revenue_decimal = Decimal(str(round(revenue, 2)))

        # Update market
        if outcome == "yes":
            market.q_yes -= shares
        else:
            market.q_no -= shares

        # Update user
        user.balance += revenue_decimal

        # Update position
        position.shares -= shares
        cost_proportion = shares / (position.shares + shares)
        position.total_cost -= position.total_cost * cost_proportion

        # New prices
        new_state = MarketState(
            q_yes=market.q_yes, q_no=market.q_no, liquidity_b=market.liquidity_b
        )
        price_yes = mm.get_price(new_state, "yes")
        price_no = mm.get_price(new_state, "no")

        # Record transaction
        tx = Transaction(
            user_id=user_id,
            market_id=market_id,
            type=TransactionType.SELL,
            amount=revenue_decimal,
            shares=shares,
            outcome=outcome,
            price_at_trade=Decimal(
                str(round(price_yes if outcome == "yes" else price_no, 4))
            ),
        )
        self.db.add(tx)

        # Price history
        ph = PriceHistory(
            market_id=market_id,
            price_yes=Decimal(str(round(price_yes, 4))),
            price_no=Decimal(str(round(price_no, 4))),
            q_yes=market.q_yes,
            q_no=market.q_no,
        )
        self.db.add(ph)

        await self.db.commit()

        await self.redis.delete(f"market:{market_id}")
        await self.redis.delete("markets:list")

        return {
            "shares_sold": float(shares),
            "revenue": float(revenue_decimal),
            "price_yes": round(price_yes, 4),
            "price_no": round(price_no, 4),
            "new_balance": float(user.balance),
        }

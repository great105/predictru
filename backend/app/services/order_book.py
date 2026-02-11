import json
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from redis.asyncio import Redis
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.market import Market, MarketStatus
from app.models.order import Order, OrderIntent, OrderSide, OrderStatus
from app.models.position import Position
from app.models.trade_fill import SettlementType, TradeFill
from app.models.transaction import Transaction, TransactionType
from app.models.user import User


def _translate_intent(intent: OrderIntent) -> tuple[OrderSide, Decimal]:
    """Translate user intent to book side.

    Returns (book_side, should_invert_price).
    For buy_yes / sell_yes the book price equals the intent price.
    For buy_no / sell_no the book price is 1 - intent_price.
    """
    if intent == OrderIntent.BUY_YES:
        return OrderSide.BUY, Decimal("0")
    elif intent == OrderIntent.SELL_YES:
        return OrderSide.SELL, Decimal("0")
    elif intent == OrderIntent.BUY_NO:
        return OrderSide.SELL, Decimal("1")  # Sell YES @ (1-P)
    elif intent == OrderIntent.SELL_NO:
        return OrderSide.BUY, Decimal("1")  # Buy YES @ (1-P)
    raise ValueError(f"Unknown intent: {intent}")


class OrderBookService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis
        self.fee_percent = Decimal(str(settings.TRADE_FEE_PERCENT)) / Decimal("100")

    async def place_order(
        self,
        user_id: uuid.UUID,
        market_id: uuid.UUID,
        intent: OrderIntent,
        price: Decimal,
        quantity: Decimal,
    ) -> dict:
        # Validate price range
        if price < Decimal("0.01") or price > Decimal("0.99"):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Price must be between 0.01 and 0.99",
            )
        if quantity <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Quantity must be positive")

        # Translate intent to book side + book price
        side, invert = _translate_intent(intent)
        book_price = (Decimal("1") - price) if invert else price

        # Lock market
        market = await self.db.get(Market, market_id, with_for_update=True)
        if market is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")
        if market.status != MarketStatus.OPEN:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Market is not open")
        if market.amm_type != "clob":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "This market uses LMSR, use /trade/buy instead",
            )

        # Lock user
        user = await self.db.get(User, user_id, with_for_update=True)
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

        # Reserve collateral
        if intent in (OrderIntent.BUY_YES, OrderIntent.BUY_NO):
            # Reserve PRC: price × quantity for the intent price
            reserve_prc = price * quantity
            available = user.balance - user.reserved_balance
            if available < reserve_prc:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient balance")
            user.reserved_balance += reserve_prc
        elif intent == OrderIntent.SELL_YES:
            # Reserve YES shares
            position = await self._get_or_create_position(user_id, market_id, "yes")
            available_shares = position.shares - position.reserved_shares
            if available_shares < quantity:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient YES shares")
            position.reserved_shares += quantity
        elif intent == OrderIntent.SELL_NO:
            # Reserve NO shares
            position = await self._get_or_create_position(user_id, market_id, "no")
            available_shares = position.shares - position.reserved_shares
            if available_shares < quantity:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient NO shares")
            position.reserved_shares += quantity

        # Create order
        order = Order(
            user_id=user_id,
            market_id=market_id,
            side=side,
            price=book_price,
            quantity=quantity,
            original_intent=intent,
        )
        self.db.add(order)
        await self.db.flush()

        # Match
        fills = await self._match_order(order, market)

        await self.db.commit()

        # Invalidate cache
        await self.redis.delete(f"orderbook:{market_id}")
        await self.redis.delete(f"market:{market_id}")

        return {
            "order_id": str(order.id),
            "status": order.status.value,
            "filled_quantity": float(order.filled_quantity),
            "remaining": float(order.quantity - order.filled_quantity),
            "fills_count": len(fills),
        }

    async def _match_order(self, incoming: Order, market: Market) -> list[TradeFill]:
        fills: list[TradeFill] = []

        if incoming.side == OrderSide.BUY:
            # Find sell orders with price <= incoming price (cheapest first, then oldest)
            result = await self.db.execute(
                select(Order)
                .where(
                    Order.market_id == incoming.market_id,
                    Order.side == OrderSide.SELL,
                    Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]),
                    Order.price <= incoming.price,
                    Order.user_id != incoming.user_id,  # No self-trade
                )
                .order_by(Order.price.asc(), Order.created_at.asc())
                .with_for_update()
            )
        else:
            # Find buy orders with price >= incoming price (highest first, then oldest)
            result = await self.db.execute(
                select(Order)
                .where(
                    Order.market_id == incoming.market_id,
                    Order.side == OrderSide.BUY,
                    Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]),
                    Order.price >= incoming.price,
                    Order.user_id != incoming.user_id,
                )
                .order_by(Order.price.desc(), Order.created_at.asc())
                .with_for_update()
            )

        resting_orders = result.scalars().all()
        remaining = incoming.quantity - incoming.filled_quantity

        for resting in resting_orders:
            if remaining <= 0:
                break

            resting_remaining = resting.quantity - resting.filled_quantity
            fill_qty = min(remaining, resting_remaining)
            # Price: resting order's price (price-time priority — resting was first)
            fill_price = resting.price

            fill = await self._execute_fill(
                incoming, resting, fill_price, fill_qty, market
            )
            fills.append(fill)
            remaining -= fill_qty

        # Update incoming order status
        if incoming.filled_quantity >= incoming.quantity:
            incoming.status = OrderStatus.FILLED
        elif incoming.filled_quantity > 0:
            incoming.status = OrderStatus.PARTIALLY_FILLED

        return fills

    async def _execute_fill(
        self,
        buy_order: Order,
        sell_order: Order,
        price: Decimal,
        qty: Decimal,
        market: Market,
    ) -> TradeFill:
        # Determine which is actually the buy and sell on the book
        if buy_order.side == OrderSide.SELL:
            buy_order, sell_order = sell_order, buy_order

        # Determine settlement type from original intents
        buy_intent = buy_order.original_intent
        sell_intent = sell_order.original_intent
        settlement = self._determine_settlement(buy_intent, sell_intent)

        # Calculate fee (split between both sides)
        total_value = price * qty
        fee = (total_value * self.fee_percent).quantize(Decimal("0.01"))

        # Load users
        buyer = await self.db.get(User, buy_order.user_id, with_for_update=True)
        seller = await self.db.get(User, sell_order.user_id, with_for_update=True)

        if settlement == SettlementType.TRANSFER:
            # Determine share type from intents
            # BUY_YES + SELL_YES → transfer YES shares
            # SELL_NO + BUY_NO → transfer NO shares
            is_no_transfer = (
                buy_intent == OrderIntent.SELL_NO
                and sell_intent == OrderIntent.BUY_NO
            )
            share_type = "no" if is_no_transfer else "yes"

            if is_no_transfer:
                # SELL_NO user (buy side on book) buys NO shares
                # BUY_NO user (sell side on book) sells NO shares
                # The "price" is book price (YES price), NO price = 1 - price
                cost = (Decimal("1") - price) * qty
            else:
                cost = price * qty

            buyer.reserved_balance -= cost
            buyer.balance -= cost
            seller_revenue = cost - fee
            seller.balance += seller_revenue

            # Move shares
            seller_pos = await self._get_or_create_position(
                sell_order.user_id, market.id, share_type
            )
            seller_pos.reserved_shares -= qty
            seller_pos.shares -= qty

            buyer_pos = await self._get_or_create_position(
                buy_order.user_id, market.id, share_type
            )
            buyer_pos.shares += qty
            buyer_pos.total_cost += cost
            if buyer_pos.shares > 0:
                buyer_pos.avg_price = buyer_pos.total_cost / buyer_pos.shares

        elif settlement == SettlementType.MINT:
            # buy_yes + buy_no (= sell on book): mint YES+NO pair
            # Buyer pays P (price), "seller" (buy_no) pays 1-P
            # Both get their respective shares
            buyer_cost = price * qty
            seller_cost = (Decimal("1") - price) * qty

            # Fee from the total 1.0 * qty PRC being deposited
            total_deposited = buyer_cost + seller_cost  # = qty PRC
            fee = (total_deposited * self.fee_percent).quantize(Decimal("0.01"))
            half_fee = (fee / 2).quantize(Decimal("0.01"))

            buyer.reserved_balance -= buyer_cost
            buyer.balance -= buyer_cost + half_fee
            seller.reserved_balance -= seller_cost
            seller.balance -= seller_cost + (fee - half_fee)

            # Mint YES shares for buyer
            buyer_pos = await self._get_or_create_position(
                buy_order.user_id, market.id, "yes"
            )
            buyer_pos.shares += qty
            buyer_pos.total_cost += buyer_cost + half_fee
            if buyer_pos.shares > 0:
                buyer_pos.avg_price = buyer_pos.total_cost / buyer_pos.shares

            # Mint NO shares for seller (the buy_no user)
            seller_pos = await self._get_or_create_position(
                sell_order.user_id, market.id, "no"
            )
            seller_pos.shares += qty
            seller_pos.total_cost += seller_cost + (fee - half_fee)
            if seller_pos.shares > 0:
                seller_pos.avg_price = seller_pos.total_cost / seller_pos.shares

        elif settlement == SettlementType.BURN:
            # sell_yes + sell_no: burn YES+NO pair, return PRC
            # Seller of YES gets price * qty, seller of NO gets (1-price) * qty
            yes_revenue = price * qty
            no_revenue = (Decimal("1") - price) * qty
            total_returned = yes_revenue + no_revenue
            fee = (total_returned * self.fee_percent).quantize(Decimal("0.01"))

            # The buy order on the book is actually sell_no (translated)
            # sell_order on the book is sell_yes
            # Remove YES shares from sell_yes user
            sell_yes_pos = await self._get_or_create_position(
                sell_order.user_id, market.id, "yes"
            )
            sell_yes_pos.reserved_shares -= qty
            sell_yes_pos.shares -= qty

            # Remove NO shares from sell_no user (= buy side on book)
            sell_no_pos = await self._get_or_create_position(
                buy_order.user_id, market.id, "no"
            )
            sell_no_pos.reserved_shares -= qty
            sell_no_pos.shares -= qty

            # Return PRC minus fee
            half_fee = (fee / 2).quantize(Decimal("0.01"))
            seller.balance += yes_revenue - half_fee
            buyer.balance += no_revenue - (fee - half_fee)

        # Update filled quantities
        buy_order.filled_quantity += qty
        sell_order.filled_quantity += qty

        if buy_order.filled_quantity >= buy_order.quantity:
            buy_order.status = OrderStatus.FILLED
        else:
            buy_order.status = OrderStatus.PARTIALLY_FILLED

        if sell_order.filled_quantity >= sell_order.quantity:
            sell_order.status = OrderStatus.FILLED
        else:
            sell_order.status = OrderStatus.PARTIALLY_FILLED

        # Update market stats
        market.last_trade_price_yes = price
        market.total_volume += price * qty

        # Update trader counts
        buyer.total_trades += 1
        seller.total_trades += 1

        # Record TradeFill
        fill = TradeFill(
            market_id=market.id,
            buy_order_id=buy_order.id,
            sell_order_id=sell_order.id,
            buyer_id=buy_order.user_id,
            seller_id=sell_order.user_id,
            price=price,
            quantity=qty,
            fee=fee,
            settlement_type=settlement,
        )
        self.db.add(fill)

        # Record transactions — outcome reflects user's original intent
        buy_outcome = "no" if buy_intent in (OrderIntent.BUY_NO, OrderIntent.SELL_NO) else "yes"
        sell_outcome = "no" if sell_intent in (OrderIntent.BUY_NO, OrderIntent.SELL_NO) else "yes"

        buy_tx = Transaction(
            user_id=buy_order.user_id,
            market_id=market.id,
            type=TransactionType.ORDER_FILL,
            amount=-(price * qty),
            shares=qty,
            outcome=buy_outcome,
            price_at_trade=price,
            description=f"Order fill: {buy_order.original_intent.value} @ {price}",
        )
        sell_tx = Transaction(
            user_id=sell_order.user_id,
            market_id=market.id,
            type=TransactionType.ORDER_FILL,
            amount=price * qty,
            shares=qty,
            outcome=sell_outcome,
            price_at_trade=price,
            description=f"Order fill: {sell_order.original_intent.value} @ {price}",
        )
        self.db.add(buy_tx)
        self.db.add(sell_tx)

        return fill

    def _determine_settlement(
        self, buy_intent: OrderIntent, sell_intent: OrderIntent
    ) -> SettlementType:
        # sell_yes + buy_yes → transfer
        if buy_intent == OrderIntent.BUY_YES and sell_intent == OrderIntent.SELL_YES:
            return SettlementType.TRANSFER
        # buy_no (=sell on book) + buy_yes → mint
        if buy_intent == OrderIntent.BUY_YES and sell_intent == OrderIntent.BUY_NO:
            return SettlementType.MINT
        # sell_no (=buy on book) + sell_yes → burn
        if buy_intent == OrderIntent.SELL_NO and sell_intent == OrderIntent.SELL_YES:
            return SettlementType.BURN
        # sell_no + buy_no → transfer NO shares
        if buy_intent == OrderIntent.SELL_NO and sell_intent == OrderIntent.BUY_NO:
            return SettlementType.TRANSFER
        # Default: mint (buy_yes + buy_no is the most common)
        return SettlementType.MINT

    async def cancel_order(self, user_id: uuid.UUID, order_id: uuid.UUID) -> dict:
        order = await self.db.get(Order, order_id, with_for_update=True)
        if order is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
        if order.user_id != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
        if order.status in (OrderStatus.FILLED, OrderStatus.CANCELLED):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order cannot be cancelled")

        unfilled = order.quantity - order.filled_quantity
        order.status = OrderStatus.CANCELLED

        # Release reserves
        user = await self.db.get(User, user_id, with_for_update=True)

        if order.original_intent in (OrderIntent.BUY_YES, OrderIntent.BUY_NO):
            # Release PRC reserve (intent price × unfilled qty)
            intent_price = order.price
            if order.original_intent == OrderIntent.BUY_NO:
                intent_price = Decimal("1") - order.price
            reserve_release = intent_price * unfilled
            user.reserved_balance = max(Decimal("0"), user.reserved_balance - reserve_release)
        elif order.original_intent == OrderIntent.SELL_YES:
            pos = await self._get_or_create_position(user_id, order.market_id, "yes")
            pos.reserved_shares = max(Decimal("0"), pos.reserved_shares - unfilled)
        elif order.original_intent == OrderIntent.SELL_NO:
            pos = await self._get_or_create_position(user_id, order.market_id, "no")
            pos.reserved_shares = max(Decimal("0"), pos.reserved_shares - unfilled)

        # Record cancel transaction
        tx = Transaction(
            user_id=user_id,
            market_id=order.market_id,
            type=TransactionType.ORDER_CANCEL,
            amount=Decimal("0"),
            description=f"Cancelled order {order.original_intent.value} @ {order.price}",
        )
        self.db.add(tx)

        await self.db.commit()
        await self.redis.delete(f"orderbook:{order.market_id}")

        return {
            "order_id": str(order.id),
            "cancelled_quantity": float(unfilled),
        }

    async def cancel_all_market_orders(self, market_id: uuid.UUID) -> int:
        """Cancel all open orders for a market (used during resolution)."""
        result = await self.db.execute(
            select(Order)
            .where(
                Order.market_id == market_id,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]),
            )
            .with_for_update()
        )
        orders = result.scalars().all()

        count = 0
        for order in orders:
            unfilled = order.quantity - order.filled_quantity
            order.status = OrderStatus.CANCELLED

            user = await self.db.get(User, order.user_id, with_for_update=True)

            if order.original_intent in (OrderIntent.BUY_YES, OrderIntent.BUY_NO):
                intent_price = order.price
                if order.original_intent == OrderIntent.BUY_NO:
                    intent_price = Decimal("1") - order.price
                user.reserved_balance = max(
                    Decimal("0"), user.reserved_balance - intent_price * unfilled
                )
            elif order.original_intent == OrderIntent.SELL_YES:
                pos = await self._get_or_create_position(order.user_id, market_id, "yes")
                pos.reserved_shares = max(Decimal("0"), pos.reserved_shares - unfilled)
            elif order.original_intent == OrderIntent.SELL_NO:
                pos = await self._get_or_create_position(order.user_id, market_id, "no")
                pos.reserved_shares = max(Decimal("0"), pos.reserved_shares - unfilled)

            count += 1

        return count

    async def get_order_book(self, market_id: uuid.UUID) -> dict:
        """Get aggregated order book (bids/asks by price level)."""
        # Try cache first (1 second TTL)
        cache_key = f"orderbook:{market_id}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Bids (BUY side) — highest price first
        bid_result = await self.db.execute(
            select(Order.price, Order.quantity, Order.filled_quantity)
            .where(
                Order.market_id == market_id,
                Order.side == OrderSide.BUY,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]),
            )
        )
        bids_raw = bid_result.all()

        # Asks (SELL side) — lowest price first
        ask_result = await self.db.execute(
            select(Order.price, Order.quantity, Order.filled_quantity)
            .where(
                Order.market_id == market_id,
                Order.side == OrderSide.SELL,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]),
            )
        )
        asks_raw = ask_result.all()

        # Aggregate by price level
        bid_levels: dict[str, float] = {}
        for price, qty, filled in bids_raw:
            key = str(price)
            bid_levels[key] = bid_levels.get(key, 0) + float(qty - filled)

        ask_levels: dict[str, float] = {}
        for price, qty, filled in asks_raw:
            key = str(price)
            ask_levels[key] = ask_levels.get(key, 0) + float(qty - filled)

        bids = sorted(
            [{"price": float(k), "quantity": v} for k, v in bid_levels.items()],
            key=lambda x: x["price"],
            reverse=True,
        )
        asks = sorted(
            [{"price": float(k), "quantity": v} for k, v in ask_levels.items()],
            key=lambda x: x["price"],
        )

        # Get last trade price
        market = await self.db.get(Market, market_id)
        last_price = float(market.last_trade_price_yes) if market and market.last_trade_price_yes else None

        book = {"bids": bids, "asks": asks, "last_price": last_price}
        await self.redis.setex(cache_key, 1, json.dumps(book))
        return book

    async def get_user_orders(
        self,
        user_id: uuid.UUID,
        market_id: uuid.UUID | None = None,
        active_only: bool = True,
    ) -> list[dict]:
        query = select(Order).where(Order.user_id == user_id)

        if market_id:
            query = query.where(Order.market_id == market_id)
        if active_only:
            query = query.where(
                Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED])
            )

        query = query.order_by(Order.created_at.desc())
        result = await self.db.execute(query)
        orders = result.scalars().all()

        return [
            {
                "id": str(o.id),
                "market_id": str(o.market_id),
                "side": o.side.value,
                "price": float(o.price),
                "quantity": float(o.quantity),
                "filled_quantity": float(o.filled_quantity),
                "status": o.status.value,
                "original_intent": o.original_intent.value,
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ]

    async def get_trades(
        self, market_id: uuid.UUID, limit: int = 50
    ) -> list[dict]:
        result = await self.db.execute(
            select(TradeFill)
            .where(TradeFill.market_id == market_id)
            .order_by(TradeFill.created_at.desc())
            .limit(limit)
        )
        fills = result.scalars().all()
        return [
            {
                "id": str(f.id),
                "price": float(f.price),
                "quantity": float(f.quantity),
                "settlement_type": f.settlement_type.value,
                "created_at": f.created_at.isoformat(),
            }
            for f in fills
        ]

    async def _get_or_create_position(
        self,
        user_id: uuid.UUID,
        market_id: uuid.UUID,
        outcome: str,
    ) -> Position:
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
            )
            self.db.add(position)
            await self.db.flush()
        return position

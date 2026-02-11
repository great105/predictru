import uuid

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser, DbSession, RedisConn
from app.models.order import OrderIntent
from app.schemas.orderbook import (
    CancelOrderResponse,
    OrderBookResponse,
    PlaceOrderRequest,
    PlaceOrderResponse,
    TradeFillResponse,
    UserOrderResponse,
)
from app.services.order_book import OrderBookService

router = APIRouter(prefix="/orderbook", tags=["orderbook"])


@router.post("/orders", response_model=PlaceOrderResponse)
async def place_order(
    body: PlaceOrderRequest,
    user: CurrentUser,
    db: DbSession,
    redis: RedisConn,
):
    """Place a limit order on the CLOB."""
    service = OrderBookService(db, redis)
    result = await service.place_order(
        user_id=user.id,
        market_id=body.market_id,
        intent=OrderIntent(body.intent),
        price=body.price,
        quantity=body.quantity,
    )
    return result


@router.delete("/orders/{order_id}", response_model=CancelOrderResponse)
async def cancel_order(
    order_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    redis: RedisConn,
):
    """Cancel an open order."""
    service = OrderBookService(db, redis)
    result = await service.cancel_order(user.id, order_id)
    return result


@router.get("/markets/{market_id}/book", response_model=OrderBookResponse)
async def get_order_book(
    market_id: uuid.UUID,
    db: DbSession,
    redis: RedisConn,
):
    """Get the order book for a CLOB market."""
    service = OrderBookService(db, redis)
    return await service.get_order_book(market_id)


@router.get("/markets/{market_id}/trades", response_model=list[TradeFillResponse])
async def get_trades(
    market_id: uuid.UUID,
    db: DbSession,
    redis: RedisConn,
    limit: int = Query(default=50, le=100),
):
    """Get recent trade fills for a market."""
    service = OrderBookService(db, redis)
    return await service.get_trades(market_id, limit)


@router.get("/orders/my", response_model=list[UserOrderResponse])
async def get_my_orders(
    user: CurrentUser,
    db: DbSession,
    redis: RedisConn,
    market_id: uuid.UUID | None = None,
    active_only: bool = True,
):
    """Get current user's orders."""
    service = OrderBookService(db, redis)
    return await service.get_user_orders(user.id, market_id, active_only)

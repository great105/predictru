from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DbSession, RedisConn
from app.schemas.trade import SellRequest, TradeRequest, TradeResponse
from app.services.trade import TradeService

router = APIRouter(prefix="/trade", tags=["trade"])


@router.post("/buy", response_model=TradeResponse)
async def buy(body: TradeRequest, user: CurrentUser, db: DbSession, redis: RedisConn):
    """Buy shares in a market."""
    service = TradeService(db, redis)
    result = await service.buy(
        user_id=user.id,
        market_id=body.market_id,
        outcome=body.outcome,
        amount=body.amount,
    )
    return TradeResponse(**result)


@router.post("/sell", response_model=TradeResponse)
async def sell(body: SellRequest, user: CurrentUser, db: DbSession, redis: RedisConn):
    """Sell shares in a market."""
    service = TradeService(db, redis)
    result = await service.sell(
        user_id=user.id,
        market_id=body.market_id,
        outcome=body.outcome,
        shares=body.shares,
    )
    return TradeResponse(**result)

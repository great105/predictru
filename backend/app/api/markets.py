import json
import uuid

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession, RedisConn
from app.models.market import Market, MarketStatus
from app.models.position import Position
from app.models.price_history import PriceHistory
from app.schemas.market import MarketDetail, MarketListResponse, MarketRead, PricePoint
from app.services.market_maker.base import MarketState
from app.services.market_maker.factory import get_market_maker

router = APIRouter(prefix="/markets", tags=["markets"])

CACHE_TTL = 30  # seconds


def _market_to_read(market: Market) -> MarketRead:
    if market.amm_type == "clob":
        price_yes = float(market.last_trade_price_yes) if market.last_trade_price_yes else 0.5
        price_no = round(1.0 - price_yes, 4)
    else:
        mm = get_market_maker(market.amm_type)
        state = MarketState(q_yes=market.q_yes, q_no=market.q_no, liquidity_b=market.liquidity_b)
        price_yes = round(mm.get_price(state, "yes"), 4)
        price_no = round(mm.get_price(state, "no"), 4)
    return MarketRead(
        id=market.id,
        title=market.title,
        category=market.category,
        status=market.status.value,
        price_yes=price_yes,
        price_no=price_no,
        total_volume=market.total_volume,
        total_traders=market.total_traders,
        closes_at=market.closes_at,
        is_featured=market.is_featured,
        created_at=market.created_at,
        amm_type=market.amm_type,
    )


@router.get("", response_model=MarketListResponse)
async def list_markets(
    db: DbSession,
    redis: RedisConn,
    category: str | None = None,
    status: str | None = None,
    cursor: str | None = None,
    limit: int = Query(default=20, le=50),
):
    """List markets with cursor-based pagination and Redis cache."""
    cache_key = f"markets:list:{category}:{status}:{cursor}:{limit}"
    cached = await redis.get(cache_key)
    if cached:
        return MarketListResponse(**json.loads(cached))

    query = select(Market).order_by(Market.created_at.desc())

    if category:
        query = query.where(Market.category == category)
    if status:
        query = query.where(Market.status == MarketStatus(status))

    if cursor:
        try:
            cursor_id = uuid.UUID(cursor)
            cursor_market = await db.get(Market, cursor_id)
            if cursor_market:
                query = query.where(Market.created_at < cursor_market.created_at)
        except ValueError:
            pass

    query = query.limit(limit + 1)
    result = await db.execute(query)
    markets = result.scalars().all()

    has_next = len(markets) > limit
    if has_next:
        markets = markets[:limit]

    items = [_market_to_read(m) for m in markets]
    next_cursor = str(markets[-1].id) if has_next and markets else None

    response = MarketListResponse(items=items, next_cursor=next_cursor)
    await redis.setex(cache_key, CACHE_TTL, response.model_dump_json())
    return response


@router.get("/{market_id}", response_model=MarketDetail)
async def get_market(market_id: uuid.UUID, db: DbSession, redis: RedisConn):
    """Get market details."""
    cache_key = f"market:{market_id}"
    cached = await redis.get(cache_key)
    if cached:
        return MarketDetail(**json.loads(cached))

    market = await db.get(Market, market_id)
    if market is None:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")

    if market.amm_type == "clob":
        price_yes = float(market.last_trade_price_yes) if market.last_trade_price_yes else 0.5
        price_no = round(1.0 - price_yes, 4)
    else:
        mm = get_market_maker(market.amm_type)
        state = MarketState(q_yes=market.q_yes, q_no=market.q_no, liquidity_b=market.liquidity_b)
        price_yes = round(mm.get_price(state, "yes"), 4)
        price_no = round(mm.get_price(state, "no"), 4)

    detail = MarketDetail(
        id=market.id,
        title=market.title,
        description=market.description,
        category=market.category,
        image_url=market.image_url,
        status=market.status.value,
        price_yes=price_yes,
        price_no=price_no,
        total_volume=market.total_volume,
        total_traders=market.total_traders,
        closes_at=market.closes_at,
        is_featured=market.is_featured,
        created_at=market.created_at,
        amm_type=market.amm_type,
        q_yes=market.q_yes,
        q_no=market.q_no,
        liquidity_b=market.liquidity_b,
        min_bet=market.min_bet,
        max_bet=market.max_bet,
        resolution_outcome=market.resolution_outcome,
        resolution_source=market.resolution_source,
        resolved_at=market.resolved_at,
        created_by=market.created_by,
    )

    await redis.setex(cache_key, CACHE_TTL, detail.model_dump_json())
    return detail


@router.get("/{market_id}/history", response_model=list[PricePoint])
async def get_price_history(market_id: uuid.UUID, db: DbSession):
    """Get price history for a market."""
    result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.market_id == market_id)
        .order_by(PriceHistory.created_at.asc())
    )
    points = result.scalars().all()
    return [
        PricePoint(
            price_yes=float(p.price_yes),
            price_no=float(p.price_no),
            created_at=p.created_at,
        )
        for p in points
    ]

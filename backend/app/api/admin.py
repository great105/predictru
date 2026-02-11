import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.dependencies import CurrentAdmin, DbSession, RedisConn
from app.models.market import Market
from app.schemas.market import MarketCreate, MarketDetail
from app.services.market_maker.base import MarketState
from app.services.market_maker.factory import get_market_maker
from app.services.resolution import ResolutionService

router = APIRouter(prefix="/admin", tags=["admin"])


class ResolveRequest(BaseModel):
    outcome: str


class MarketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    image_url: str | None = None
    is_featured: bool | None = None
    resolution_source: str | None = None


@router.post("/markets", response_model=MarketDetail)
async def create_market(
    body: MarketCreate, admin: CurrentAdmin, db: DbSession, redis: RedisConn
):
    """Create a new market (admin only)."""
    initial_price = max(0.01, min(0.99, body.initial_price_yes))
    market = Market(
        title=body.title,
        description=body.description,
        category=body.category,
        image_url=body.image_url,
        closes_at=body.closes_at,
        amm_type=body.amm_type,
        liquidity_b=body.liquidity_b,
        is_featured=body.is_featured,
        resolution_source=body.resolution_source,
        min_bet=body.min_bet,
        max_bet=body.max_bet,
        created_by=admin.id,
        last_trade_price_yes=round(initial_price, 2) if body.amm_type == "clob" else None,
    )
    db.add(market)
    await db.commit()
    await db.refresh(market)

    if market.amm_type == "clob":
        price_yes = float(market.last_trade_price_yes) if market.last_trade_price_yes else 0.5
        price_no = round(1.0 - price_yes, 4)
    else:
        mm = get_market_maker(market.amm_type)
        state = MarketState(q_yes=market.q_yes, q_no=market.q_no, liquidity_b=market.liquidity_b)
        price_yes = round(mm.get_price(state, "yes"), 4)
        price_no = round(mm.get_price(state, "no"), 4)

    await redis.delete("markets:list")

    return MarketDetail(
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


@router.put("/markets/{market_id}", response_model=MarketDetail)
async def update_market(
    market_id: uuid.UUID,
    body: MarketUpdate,
    admin: CurrentAdmin,
    db: DbSession,
    redis: RedisConn,
):
    """Update a market (admin only)."""
    market = await db.get(Market, market_id)
    if market is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")

    if body.title is not None:
        market.title = body.title
    if body.description is not None:
        market.description = body.description
    if body.category is not None:
        market.category = body.category
    if body.image_url is not None:
        market.image_url = body.image_url
    if body.is_featured is not None:
        market.is_featured = body.is_featured
    if body.resolution_source is not None:
        market.resolution_source = body.resolution_source

    await db.commit()
    await db.refresh(market)

    if market.amm_type == "clob":
        price_yes = float(market.last_trade_price_yes) if market.last_trade_price_yes else 0.5
        price_no = round(1.0 - price_yes, 4)
    else:
        mm = get_market_maker(market.amm_type)
        state = MarketState(q_yes=market.q_yes, q_no=market.q_no, liquidity_b=market.liquidity_b)
        price_yes = round(mm.get_price(state, "yes"), 4)
        price_no = round(mm.get_price(state, "no"), 4)

    await redis.delete(f"market:{market_id}")
    await redis.delete("markets:list")

    return MarketDetail(
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


@router.post("/markets/{market_id}/resolve")
async def resolve_market(
    market_id: uuid.UUID,
    body: ResolveRequest,
    admin: CurrentAdmin,
    db: DbSession,
    redis: RedisConn,
):
    """Resolve a market (admin only)."""
    service = ResolutionService(db, redis)
    result = await service.resolve_market(market_id, body.outcome)
    return result


@router.post("/markets/{market_id}/cancel")
async def cancel_market(
    market_id: uuid.UUID,
    admin: CurrentAdmin,
    db: DbSession,
    redis: RedisConn,
):
    """Cancel a market (admin only)."""
    service = ResolutionService(db, redis)
    result = await service.cancel_market(market_id)
    return result

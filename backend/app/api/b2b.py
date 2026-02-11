from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.core.b2b_auth import verify_api_key
from app.core.dependencies import DbSession
from app.models.market import Market, MarketStatus
from app.schemas.market import MarketRead
from app.services.market_maker.base import MarketState
from app.services.market_maker.factory import get_market_maker

router = APIRouter(prefix="/b2b", tags=["b2b"], dependencies=[Depends(verify_api_key)])


@router.get("/markets", response_model=list[MarketRead])
async def b2b_list_markets(
    db: DbSession,
    status: str | None = None,
    category: str | None = None,
    limit: int = Query(default=50, le=100),
):
    """B2B API: list markets. Requires X-API-Key header."""
    query = select(Market).order_by(Market.created_at.desc()).limit(limit)

    if status:
        query = query.where(Market.status == MarketStatus(status))
    if category:
        query = query.where(Market.category == category)

    result = await db.execute(query)
    markets = result.scalars().all()

    items = []
    for m in markets:
        mm = get_market_maker(m.amm_type)
        state = MarketState(q_yes=m.q_yes, q_no=m.q_no, liquidity_b=m.liquidity_b)
        items.append(
            MarketRead(
                id=m.id,
                title=m.title,
                category=m.category,
                status=m.status.value,
                price_yes=round(mm.get_price(state, "yes"), 4),
                price_no=round(mm.get_price(state, "no"), 4),
                total_volume=m.total_volume,
                total_traders=m.total_traders,
                closes_at=m.closes_at,
                is_featured=m.is_featured,
                created_at=m.created_at,
            )
        )

    return items

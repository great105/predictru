import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, DbSession
from app.models.market import Market
from app.models.position import Position
from app.models.transaction import Transaction, TransactionType

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/market/{market_id}/stats")
async def market_stats(market_id: uuid.UUID, db: DbSession):
    market = await db.get(Market, market_id)
    if market is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")

    # Count unique traders
    traders_result = await db.execute(
        select(func.count(func.distinct(Position.user_id)))
        .where(Position.market_id == market_id)
    )
    unique_traders = traders_result.scalar() or 0

    # Total buy/sell count
    tx_result = await db.execute(
        select(
            Transaction.type,
            func.count(Transaction.id),
            func.sum(func.abs(Transaction.amount)),
        )
        .where(Transaction.market_id == market_id)
        .group_by(Transaction.type)
    )
    tx_stats = {row[0].value: {"count": row[1], "volume": float(row[2] or 0)} for row in tx_result}

    return {
        "market_id": str(market_id),
        "unique_traders": unique_traders,
        "total_volume": float(market.total_volume),
        "buy_stats": tx_stats.get("buy", {"count": 0, "volume": 0}),
        "sell_stats": tx_stats.get("sell", {"count": 0, "volume": 0}),
    }


@router.get("/me/stats")
async def my_stats(user: CurrentUser, db: DbSession):
    # Position stats
    pos_result = await db.execute(
        select(
            func.count(Position.id),
            func.sum(Position.total_cost),
        ).where(Position.user_id == user.id, Position.shares > 0)
    )
    pos_row = pos_result.one()
    active_positions = pos_row[0] or 0
    invested = float(pos_row[1] or 0)

    # Transaction summary
    tx_result = await db.execute(
        select(
            Transaction.type,
            func.count(Transaction.id),
            func.sum(Transaction.amount),
        )
        .where(Transaction.user_id == user.id)
        .group_by(Transaction.type)
    )
    tx_summary = {
        row[0].value: {"count": row[1], "total": float(row[2] or 0)}
        for row in tx_result
    }

    return {
        "active_positions": active_positions,
        "total_invested": invested,
        "balance": float(user.balance),
        "total_profit": float(user.total_profit),
        "total_trades": user.total_trades,
        "win_rate": float(user.win_rate),
        "transaction_summary": tx_summary,
    }

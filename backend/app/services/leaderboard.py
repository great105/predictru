import json

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class LeaderboardService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis

    async def get_leaderboard(self, period: str = "all", limit: int = 50) -> list[dict]:
        cache_key = f"leaderboard:{period}"
        cached = await self.redis.get(cache_key)
        if cached:
            entries = json.loads(cached)
            return entries[:limit]

        # Fallback: query DB directly
        result = await self.db.execute(
            select(User)
            .where(User.is_active)
            .order_by(User.total_profit.desc())
            .limit(limit)
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

        # Cache for 5 minutes
        await self.redis.setex(cache_key, 300, json.dumps(entries))
        return entries

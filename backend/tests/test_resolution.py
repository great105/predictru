import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio

from app.models.market import Market, MarketStatus
from app.models.position import Position
from app.models.user import User
from app.services.resolution import ResolutionService


@pytest_asyncio.fixture
async def setup_market_with_positions(db):
    """Create a market with two users holding opposite positions."""
    market = Market(
        id=uuid.uuid4(),
        title="Resolution Test Market",
        closes_at=datetime.now(timezone.utc) + timedelta(days=1),
        liquidity_b=Decimal("100"),
    )
    db.add(market)

    user_yes = User(
        id=uuid.uuid4(),
        telegram_id=10001,
        first_name="Yes Voter",
        referral_code=uuid.uuid4().hex[:8],
        balance=Decimal("950"),
        total_trades=1,
    )
    user_no = User(
        id=uuid.uuid4(),
        telegram_id=10002,
        first_name="No Voter",
        referral_code=uuid.uuid4().hex[:8],
        balance=Decimal("920"),
        total_trades=1,
    )
    db.add_all([user_yes, user_no])

    pos_yes = Position(
        user_id=user_yes.id,
        market_id=market.id,
        outcome="yes",
        shares=Decimal("100"),
        total_cost=Decimal("50"),
    )
    pos_no = Position(
        user_id=user_no.id,
        market_id=market.id,
        outcome="no",
        shares=Decimal("80"),
        total_cost=Decimal("80"),
    )
    db.add_all([pos_yes, pos_no])
    await db.commit()
    await db.refresh(market)
    await db.refresh(user_yes)
    await db.refresh(user_no)

    return market, user_yes, user_no


@pytest.mark.asyncio
async def test_resolve_winners_get_payout(db, setup_market_with_positions):
    market, user_yes, user_no = setup_market_with_positions

    class FakeRedis:
        async def delete(self, key):
            pass

    service = ResolutionService(db, FakeRedis())
    result = await service.resolve_market(market.id, "yes")

    await db.refresh(user_yes)
    await db.refresh(user_no)

    assert result["winners_count"] == 1
    # user_yes had 100 shares, gets 100 PRC payout
    assert user_yes.balance == Decimal("950") + Decimal("100")
    # user_no gets nothing extra
    assert user_no.balance == Decimal("920")


@pytest.mark.asyncio
async def test_cancel_refunds_all(db, setup_market_with_positions):
    market, user_yes, user_no = setup_market_with_positions

    class FakeRedis:
        async def delete(self, key):
            pass

    service = ResolutionService(db, FakeRedis())
    result = await service.cancel_market(market.id)

    await db.refresh(user_yes)
    await db.refresh(user_no)
    await db.refresh(market)

    assert market.status == MarketStatus.CANCELLED
    assert result["refunded_positions"] == 2
    # user_yes gets their 50 PRC cost back
    assert user_yes.balance == Decimal("950") + Decimal("50")
    # user_no gets their 80 PRC cost back
    assert user_no.balance == Decimal("920") + Decimal("80")

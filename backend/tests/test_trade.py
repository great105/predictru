import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio

from app.models.market import Market, MarketStatus
from tests.conftest import make_init_data


@pytest_asyncio.fixture
async def auth_token(client):
    init_data = make_init_data(user_id=100, first_name="Trader")
    r = await client.post("/v1/auth/telegram", json={"init_data": init_data})
    return r.json()["access_token"], r.json()["user"]["id"]


@pytest_asyncio.fixture
async def market(db):
    m = Market(
        id=uuid.uuid4(),
        title="Test Market",
        description="Test",
        category="test",
        closes_at=datetime.now(timezone.utc) + timedelta(days=7),
        liquidity_b=Decimal("100"),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@pytest.mark.asyncio
async def test_buy_deducts_balance(client, db, auth_token, market):
    token, user_id = auth_token
    r = await client.post(
        "/v1/trade/buy",
        json={
            "market_id": str(market.id),
            "outcome": "yes",
            "amount": "50",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["new_balance"] < 1000
    assert data["shares"] > 0


@pytest.mark.asyncio
async def test_buy_insufficient_balance(client, db, auth_token, market):
    token, user_id = auth_token
    r = await client.post(
        "/v1/trade/buy",
        json={
            "market_id": str(market.id),
            "outcome": "yes",
            "amount": "5000",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_buy_closed_market(client, db, auth_token, market):
    market.status = MarketStatus.TRADING_CLOSED
    await db.commit()

    token, user_id = auth_token
    r = await client.post(
        "/v1/trade/buy",
        json={
            "market_id": str(market.id),
            "outcome": "yes",
            "amount": "50",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_sell_after_buy(client, db, auth_token, market):
    token, user_id = auth_token

    # Buy first
    buy_r = await client.post(
        "/v1/trade/buy",
        json={
            "market_id": str(market.id),
            "outcome": "yes",
            "amount": "50",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    shares = buy_r.json()["shares"]

    # Sell half
    sell_r = await client.post(
        "/v1/trade/sell",
        json={
            "market_id": str(market.id),
            "outcome": "yes",
            "shares": str(round(shares / 2, 6)),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sell_r.status_code == 200
    assert sell_r.json()["revenue"] > 0

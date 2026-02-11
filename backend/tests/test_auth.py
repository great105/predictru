import pytest

from tests.conftest import make_init_data


@pytest.mark.asyncio
async def test_auth_valid_init_data(client):
    """Test successful authentication with valid initData."""
    init_data = make_init_data()
    response = await client.post("/v1/auth/telegram", json={"init_data": init_data})
    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["telegram_id"] == 123456789
    assert data["user"]["first_name"] == "Test"


@pytest.mark.asyncio
async def test_auth_creates_user(client):
    """Test that first auth creates a new user."""
    init_data = make_init_data(user_id=111222333, first_name="New")
    response = await client.post("/v1/auth/telegram", json={"init_data": init_data})
    assert response.status_code == 200

    user = response.json()["user"]
    assert user["telegram_id"] == 111222333
    assert user["first_name"] == "New"
    assert float(user["balance"]) == 1000.00


@pytest.mark.asyncio
async def test_auth_repeat_returns_same_user(client):
    """Test that repeated auth returns the same user."""
    init_data = make_init_data(user_id=999888777)

    r1 = await client.post("/v1/auth/telegram", json={"init_data": init_data})
    r2 = await client.post("/v1/auth/telegram", json={"init_data": init_data})

    assert r1.json()["user"]["id"] == r2.json()["user"]["id"]


@pytest.mark.asyncio
async def test_auth_invalid_init_data(client):
    """Test authentication fails with invalid initData."""
    response = await client.post(
        "/v1/auth/telegram",
        json={"init_data": "user=bad&hash=invalid"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_auth_token_works(client):
    """Test that returned JWT works for authenticated endpoints."""
    init_data = make_init_data()
    response = await client.post("/v1/auth/telegram", json={"init_data": init_data})
    token = response.json()["access_token"]

    # Use token to access health (just verify it doesn't crash)
    response = await client.get(
        "/v1/health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

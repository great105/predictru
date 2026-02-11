import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from redis.asyncio import Redis

from app.core.config import settings
from app.core.dependencies import get_db, get_redis_dep
from app.main import app
from app.models.base import Base

TEST_DB_URL = settings.DATABASE_URL

engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
test_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function")
async def db():
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.run_sync(Base.metadata.create_all)

    async with test_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))


@pytest_asyncio.fixture(scope="function")
async def client(db: AsyncSession):
    async def override_get_db():
        yield db

    async def override_get_redis():
        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        try:
            yield redis
        finally:
            await redis.aclose()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis_dep] = override_get_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


def make_init_data(
    user_id: int = 123456789,
    first_name: str = "Test",
    username: str = "testuser",
) -> str:
    """Generate valid Telegram initData for testing."""
    user = json.dumps(
        {
            "id": user_id,
            "first_name": first_name,
            "username": username,
            "language_code": "ru",
        }
    )
    auth_date = str(int(time.time()))

    params = {
        "user": user,
        "auth_date": auth_date,
    }

    data_check_string = "\n".join(f"{k}={params[k]}" for k in sorted(params.keys()))

    secret_key = hmac.new(
        b"WebAppData",
        settings.TELEGRAM_BOT_TOKEN.encode(),
        hashlib.sha256,
    ).digest()

    hash_value = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    params["hash"] = hash_value
    return urlencode(params)

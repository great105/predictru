import json
import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.config import settings
from app.core.dependencies import DbSession, RedisConn
from app.core.security import (
    create_access_token,
    validate_telegram_init_data,
    validate_telegram_login_widget,
)
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    TelegramAuthRequest,
    TelegramLoginRequest,
    UserBrief,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=AuthResponse)
async def authenticate_telegram(body: TelegramAuthRequest, db: DbSession):
    """Authenticate user via Telegram WebApp initData."""
    user_data = validate_telegram_init_data(body.init_data)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData",
        )

    telegram_id = user_data.get("id")
    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing user ID in initData",
        )

    # Upsert user
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            id=uuid.uuid4(),
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name"),
            photo_url=user_data.get("photo_url"),
            language_code=user_data.get("language_code", "ru"),
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(user)
    else:
        user.username = user_data.get("username", user.username)
        user.first_name = user_data.get("first_name", user.first_name)
        user.last_name = user_data.get("last_name", user.last_name)
        user.photo_url = user_data.get("photo_url", user.photo_url)

    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "tg": user.telegram_id})

    user_brief = UserBrief.model_validate(user)
    user_brief.is_admin = user.telegram_id in settings.admin_ids

    return AuthResponse(
        access_token=token,
        user=user_brief,
    )


# ── Bot-based web login (deep link flow) ─────────────────────────


@router.post("/bot-login-init")
async def bot_login_init(redis: RedisConn):
    """Generate a login token for bot-based web authentication."""
    login_token = uuid.uuid4().hex
    await redis.set(
        f"web_login:{login_token}",
        json.dumps({"status": "pending"}),
        ex=300,
    )
    return {"token": login_token}


@router.get("/bot-login-status/{login_token}")
async def bot_login_status(login_token: str, redis: RedisConn, db: DbSession):
    """Poll for bot-based login completion."""
    raw = await redis.get(f"web_login:{login_token}")
    if not raw:
        raise HTTPException(status_code=404, detail="Token expired")

    data = json.loads(raw)
    if data["status"] == "pending":
        return {"status": "pending"}

    # Bot confirmed — create/update user and return JWT
    tg_user = data["user"]
    telegram_id = tg_user["id"]

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            id=uuid.uuid4(),
            telegram_id=telegram_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name", ""),
            last_name=tg_user.get("last_name"),
            photo_url=None,
            language_code="ru",
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(user)
    else:
        user.username = tg_user.get("username", user.username)
        user.first_name = tg_user.get("first_name", user.first_name)
        user.last_name = tg_user.get("last_name", user.last_name)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "tg": user.telegram_id})

    user_brief = UserBrief.model_validate(user)
    user_brief.is_admin = user.telegram_id in settings.admin_ids

    # Delete token so it can't be reused
    await redis.delete(f"web_login:{login_token}")

    return {
        "status": "confirmed",
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_brief.model_dump(),
    }


@router.post("/telegram-login", response_model=AuthResponse)
async def authenticate_telegram_login(body: TelegramLoginRequest, db: DbSession):
    """Authenticate user via Telegram Login Widget (web version)."""
    widget_data = body.model_dump()
    validated = validate_telegram_login_widget(
        {k: str(v) for k, v in widget_data.items() if v is not None}
    )
    if validated is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram Login Widget data",
        )

    telegram_id = body.id

    # Upsert user (same logic as Mini App auth)
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            id=uuid.uuid4(),
            telegram_id=telegram_id,
            username=body.username,
            first_name=body.first_name,
            last_name=body.last_name,
            photo_url=body.photo_url,
            language_code="ru",
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(user)
    else:
        user.username = body.username or user.username
        user.first_name = body.first_name or user.first_name
        user.last_name = body.last_name or user.last_name
        user.photo_url = body.photo_url or user.photo_url

    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "tg": user.telegram_id})

    user_brief = UserBrief.model_validate(user)
    user_brief.is_admin = user.telegram_id in settings.admin_ids

    return AuthResponse(
        access_token=token,
        user=user_brief,
    )

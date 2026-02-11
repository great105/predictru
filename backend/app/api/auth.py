import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.config import settings
from app.core.dependencies import DbSession
from app.core.security import create_access_token, validate_telegram_init_data
from app.models.user import User
from app.schemas.auth import AuthResponse, TelegramAuthRequest, UserBrief

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
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
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

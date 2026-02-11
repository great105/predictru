from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TelegramAuthRequest(BaseModel):
    init_data: str


class TelegramLoginRequest(BaseModel):
    """Data from Telegram Login Widget."""

    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class UserBrief(BaseModel):
    id: UUID
    telegram_id: int
    username: str | None
    first_name: str
    balance: Decimal
    is_admin: bool = False

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBrief

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TelegramAuthRequest(BaseModel):
    init_data: str


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

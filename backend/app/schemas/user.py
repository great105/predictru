from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class UserProfile(BaseModel):
    id: UUID
    telegram_id: int
    username: str | None
    first_name: str
    last_name: str | None
    photo_url: str | None
    balance: Decimal
    total_trades: int
    total_profit: Decimal
    win_rate: Decimal
    referral_code: str
    referral_count: int
    daily_bonus_claimed_at: str | None
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublicProfile(BaseModel):
    id: UUID
    username: str | None
    first_name: str
    total_trades: int
    total_profit: Decimal
    win_rate: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    id: UUID
    username: str | None
    first_name: str
    total_profit: float
    win_rate: float
    total_trades: int
    rank: int


class DailyBonusResponse(BaseModel):
    amount: Decimal
    new_balance: Decimal


class ReferralResponse(BaseModel):
    bonus: Decimal
    new_balance: Decimal


class DepositRequest(BaseModel):
    amount: Decimal


class WithdrawRequest(BaseModel):
    amount: Decimal


class WalletResponse(BaseModel):
    amount: Decimal
    new_balance: Decimal
    status: str

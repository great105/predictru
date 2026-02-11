from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator


class TradeRequest(BaseModel):
    market_id: UUID
    outcome: str
    amount: Decimal

    @field_validator("outcome")
    @classmethod
    def validate_outcome(cls, v: str) -> str:
        if v not in ("yes", "no"):
            raise ValueError("Outcome must be 'yes' or 'no'")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class SellRequest(BaseModel):
    market_id: UUID
    outcome: str
    shares: Decimal

    @field_validator("outcome")
    @classmethod
    def validate_outcome(cls, v: str) -> str:
        if v not in ("yes", "no"):
            raise ValueError("Outcome must be 'yes' or 'no'")
        return v

    @field_validator("shares")
    @classmethod
    def validate_shares(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Shares must be positive")
        return v


class TradeResponse(BaseModel):
    shares: float | None = None
    shares_sold: float | None = None
    cost: float | None = None
    fee: float | None = None
    revenue: float | None = None
    price_yes: float
    price_no: float
    new_balance: float

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator


class PlaceOrderRequest(BaseModel):
    market_id: UUID
    intent: str  # buy_yes, buy_no, sell_yes, sell_no
    price: Decimal
    quantity: Decimal

    @field_validator("intent")
    @classmethod
    def validate_intent(cls, v: str) -> str:
        if v not in ("buy_yes", "buy_no", "sell_yes", "sell_no"):
            raise ValueError("Intent must be buy_yes, buy_no, sell_yes, or sell_no")
        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Decimal) -> Decimal:
        if v < Decimal("0.01") or v > Decimal("0.99"):
            raise ValueError("Price must be between 0.01 and 0.99")
        return v

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Quantity must be positive")
        return v


class PlaceOrderResponse(BaseModel):
    order_id: str
    status: str
    filled_quantity: float
    remaining: float
    fills_count: int


class OrderBookLevel(BaseModel):
    price: float
    quantity: float


class OrderBookResponse(BaseModel):
    bids: list[OrderBookLevel]
    asks: list[OrderBookLevel]
    last_price: float | None


class UserOrderResponse(BaseModel):
    id: str
    market_id: str
    side: str
    price: float
    quantity: float
    filled_quantity: float
    status: str
    original_intent: str
    created_at: str


class TradeFillResponse(BaseModel):
    id: str
    price: float
    quantity: float
    settlement_type: str
    created_at: str


class CancelOrderResponse(BaseModel):
    order_id: str
    cancelled_quantity: float

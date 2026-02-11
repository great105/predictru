from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class MarketCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "general"
    image_url: str | None = None
    closes_at: datetime
    amm_type: str = "clob"
    liquidity_b: Decimal = Decimal("100")
    is_featured: bool = False
    resolution_source: str = ""
    min_bet: Decimal = Decimal("1.00")
    max_bet: Decimal = Decimal("10000.00")
    initial_price_yes: float = 0.5


class MarketRead(BaseModel):
    id: UUID
    title: str
    category: str
    status: str
    price_yes: float
    price_no: float
    total_volume: Decimal
    total_traders: int
    closes_at: datetime
    is_featured: bool
    created_at: datetime
    amm_type: str

    model_config = {"from_attributes": True}


class MarketDetail(MarketRead):
    description: str
    image_url: str | None
    amm_type: str
    q_yes: Decimal
    q_no: Decimal
    liquidity_b: Decimal
    min_bet: Decimal
    max_bet: Decimal
    resolution_outcome: str | None
    resolution_source: str
    resolved_at: datetime | None
    created_by: UUID | None


class PricePoint(BaseModel):
    price_yes: float
    price_no: float
    created_at: datetime

    model_config = {"from_attributes": True}


class MarketListResponse(BaseModel):
    items: list[MarketRead]
    next_cursor: str | None = None

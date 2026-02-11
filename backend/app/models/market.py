import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class MarketStatus(str, enum.Enum):
    OPEN = "open"
    TRADING_CLOSED = "trading_closed"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class Market(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "markets"

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(50), default="general", index=True)
    image_url: Mapped[str | None] = mapped_column(String(512))

    status: Mapped[MarketStatus] = mapped_column(
        Enum(MarketStatus, values_callable=lambda e: [x.value for x in e]),
        default=MarketStatus.OPEN, index=True
    )
    resolution_outcome: Mapped[str | None] = mapped_column(String(10))  # "yes" or "no"
    resolution_source: Mapped[str] = mapped_column(Text, default="")  # Resolution Rules

    # AMM parameters
    amm_type: Mapped[str] = mapped_column(String(20), default="lmsr")
    q_yes: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=Decimal("0"))
    q_no: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=Decimal("0"))
    liquidity_b: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("100"))

    # Bet limits
    min_bet: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("1.00"))
    max_bet: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("10000.00"))

    # CLOB last trade price
    last_trade_price_yes: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))

    # Stats
    total_volume: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    total_traders: Mapped[int] = mapped_column(Integer, default=0)

    # Timing
    closes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Creator (admin or UGC)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    is_featured: Mapped[bool] = mapped_column(default=False)

    positions = relationship("Position", back_populates="market", lazy="selectin")
    price_history = relationship("PriceHistory", back_populates="market", lazy="noload")

    __table_args__ = (
        Index("ix_markets_status_closes_at", "status", "closes_at"),
        Index("ix_markets_featured", "is_featured", "status"),
    )

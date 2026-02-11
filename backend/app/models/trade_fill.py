import enum
import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class SettlementType(str, enum.Enum):
    TRANSFER = "transfer"
    MINT = "mint"
    BURN = "burn"


class TradeFill(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "trade_fills"

    market_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("markets.id"), nullable=False
    )
    buy_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    sell_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    seller_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    price: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(16, 6), nullable=False)
    fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    settlement_type: Mapped[SettlementType] = mapped_column(
        Enum(SettlementType, values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )

    market = relationship("Market")
    buy_order = relationship("Order", foreign_keys=[buy_order_id])
    sell_order = relationship("Order", foreign_keys=[sell_order_id])

    __table_args__ = (
        Index("ix_trade_fills_market", "market_id", "created_at"),
    )

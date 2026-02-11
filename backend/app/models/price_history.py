import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class PriceHistory(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "price_history"

    market_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("markets.id"), nullable=False, index=True)
    price_yes: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    price_no: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    q_yes: Mapped[Decimal] = mapped_column(Numeric(16, 6), nullable=False)
    q_no: Mapped[Decimal] = mapped_column(Numeric(16, 6), nullable=False)

    market = relationship("Market", back_populates="price_history")

    __table_args__ = (
        Index("ix_price_history_market_time", "market_id", "created_at"),
    )

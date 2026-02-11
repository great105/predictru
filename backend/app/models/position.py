import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Position(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "positions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    market_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("markets.id"), nullable=False, index=True
    )
    outcome: Mapped[str] = mapped_column(String(10), nullable=False)  # "yes" or "no"

    shares: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=Decimal("0"))
    reserved_shares: Mapped[Decimal] = mapped_column(
        Numeric(16, 6), default=Decimal("0")
    )
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    avg_price: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=Decimal("0"))

    user = relationship("User", back_populates="positions")
    market = relationship("Market", back_populates="positions")

    __table_args__ = (
        UniqueConstraint(
            "user_id", "market_id", "outcome", name="uq_user_market_outcome"
        ),
        Index("ix_positions_user_market", "user_id", "market_id"),
    )

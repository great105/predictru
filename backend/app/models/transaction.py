import enum
import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class TransactionType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"
    PAYOUT = "payout"
    BONUS = "bonus"
    REFERRAL = "referral"
    DAILY = "daily"
    FEE = "fee"
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"
    ORDER_FILL = "order_fill"
    ORDER_CANCEL = "order_cancel"
    BET_STAKE = "bet_stake"
    BET_PAYOUT = "bet_payout"
    BET_REFUND = "bet_refund"


class Transaction(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    market_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("markets.id")
    )
    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    shares: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=Decimal("0"))
    outcome: Mapped[str | None] = mapped_column(String(10))
    price_at_trade: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=Decimal("0"))

    description: Mapped[str] = mapped_column(Text, default="")

    user = relationship("User", back_populates="transactions")

    __table_args__ = (
        Index("ix_transactions_user_type", "user_id", "type"),
        Index("ix_transactions_market", "market_id"),
    )

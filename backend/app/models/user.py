import uuid
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    telegram_id: Mapped[int] = mapped_column(
        BigInteger, unique=True, nullable=False, index=True
    )
    username: Mapped[str | None] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(255), default="")
    last_name: Mapped[str | None] = mapped_column(String(255))
    photo_url: Mapped[str | None] = mapped_column(String(512))
    language_code: Mapped[str] = mapped_column(String(10), default="ru")

    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("1000.00"))
    reserved_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    total_trades: Mapped[int] = mapped_column(default=0)
    total_profit: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    win_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"))

    referral_code: Mapped[str] = mapped_column(
        String(20), unique=True, default=lambda: uuid.uuid4().hex[:8]
    )
    referred_by: Mapped[uuid.UUID | None] = mapped_column()
    referral_count: Mapped[int] = mapped_column(default=0)

    daily_bonus_claimed_at: Mapped[str | None] = mapped_column(String(30))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    positions = relationship("Position", back_populates="user", lazy="selectin")
    transactions = relationship("Transaction", back_populates="user", lazy="selectin")

    __table_args__ = (Index("ix_users_referral_code", "referral_code"),)

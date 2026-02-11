import enum
import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class OrderSide(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, enum.Enum):
    OPEN = "open"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"


class OrderIntent(str, enum.Enum):
    BUY_YES = "buy_yes"
    BUY_NO = "buy_no"
    SELL_YES = "sell_yes"
    SELL_NO = "sell_no"


class Order(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "orders"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    market_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("markets.id"), nullable=False
    )
    side: Mapped[OrderSide] = mapped_column(
        Enum(OrderSide, values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(16, 6), nullable=False)
    filled_quantity: Mapped[Decimal] = mapped_column(
        Numeric(16, 6), default=Decimal("0")
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, values_callable=lambda e: [x.value for x in e]),
        default=OrderStatus.OPEN,
    )
    original_intent: Mapped[OrderIntent] = mapped_column(
        Enum(OrderIntent, values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )

    user = relationship("User", backref="orders")
    market = relationship("Market", backref="orders")

    __table_args__ = (
        Index(
            "ix_orders_book",
            "market_id",
            "side",
            "status",
            "price",
            "created_at",
        ),
        Index("ix_orders_user_status", "user_id", "status"),
        Index("ix_orders_market_status", "market_id", "status"),
    )

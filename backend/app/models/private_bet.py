import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class PrivateBetStatus(str, enum.Enum):
    OPEN = "open"
    VOTING = "voting"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class PrivateBet(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "private_bets"

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    stake_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    invite_code: Mapped[str] = mapped_column(
        String(8), unique=True, nullable=False, index=True
    )

    status: Mapped[PrivateBetStatus] = mapped_column(
        Enum(PrivateBetStatus, values_callable=lambda e: [x.value for x in e]),
        default=PrivateBetStatus.OPEN,
        index=True,
    )

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    closes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    voting_deadline: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    resolution_outcome: Mapped[str | None] = mapped_column(String(10))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    total_pool: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    yes_count: Mapped[int] = mapped_column(Integer, default=0)
    no_count: Mapped[int] = mapped_column(Integer, default=0)
    yes_votes: Mapped[int] = mapped_column(Integer, default=0)
    no_votes: Mapped[int] = mapped_column(Integer, default=0)

    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")
    participants = relationship(
        "PrivateBetParticipant", back_populates="bet", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_private_bets_status_closes", "status", "closes_at"),
        Index("ix_private_bets_creator", "created_by"),
    )


class PrivateBetParticipant(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "private_bet_participants"

    bet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("private_bets.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    outcome: Mapped[str] = mapped_column(String(10), nullable=False)  # "yes" / "no"
    vote: Mapped[str | None] = mapped_column(String(10))  # "yes" / "no" / null
    voted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payout: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))

    bet = relationship("PrivateBet", back_populates="participants")
    user = relationship("User", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("bet_id", "user_id", name="uq_private_bet_participant"),
        Index("ix_pbp_bet_id", "bet_id"),
        Index("ix_pbp_user_id", "user_id"),
    )

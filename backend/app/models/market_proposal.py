import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ProposalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class MarketProposal(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "market_proposals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(50), default="general")
    closes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    status: Mapped[ProposalStatus] = mapped_column(
        Enum(ProposalStatus, values_callable=lambda e: [x.value for x in e]),
        default=ProposalStatus.PENDING, index=True
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    market_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PrivateBetCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    description: str = ""
    stake_amount: Decimal = Field(..., ge=10, le=10000)
    closes_at: datetime
    outcome: str = Field(..., pattern="^(yes|no)$")


class JoinBetRequest(BaseModel):
    invite_code: str = Field(..., min_length=4, max_length=8)
    outcome: str = Field(..., pattern="^(yes|no)$")


class VoteRequest(BaseModel):
    vote: str = Field(..., pattern="^(yes|no)$")


class ParticipantRead(BaseModel):
    user_id: UUID
    first_name: str
    username: str | None = None
    outcome: str
    vote: str | None = None
    payout: Decimal = Decimal("0")

    model_config = {"from_attributes": True}


class PrivateBetRead(BaseModel):
    id: UUID
    title: str
    stake_amount: Decimal
    invite_code: str
    status: str
    closes_at: datetime
    voting_deadline: datetime
    yes_count: int
    no_count: int
    total_pool: Decimal
    created_at: datetime
    creator_name: str
    resolution_outcome: str | None = None
    my_outcome: str | None = None
    my_payout: Decimal | None = None

    model_config = {"from_attributes": True}


class PrivateBetDetail(PrivateBetRead):
    description: str
    yes_votes: int
    no_votes: int
    resolution_outcome: str | None = None
    resolved_at: datetime | None = None
    my_outcome: str | None = None
    my_vote: str | None = None
    is_creator: bool = False
    participants: list[ParticipantRead] = []

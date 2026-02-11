import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.dependencies import CurrentAdmin, CurrentUser, DbSession
from app.models.market import Market
from app.models.market_proposal import MarketProposal, ProposalStatus

router = APIRouter(prefix="/ugc", tags=["ugc"])


class ProposalCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "general"
    closes_at: str


class ProposalResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    category: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}


class RejectRequest(BaseModel):
    reason: str


@router.post("/proposals", response_model=ProposalResponse)
async def create_proposal(body: ProposalCreate, user: CurrentUser, db: DbSession):
    from datetime import datetime

    proposal = MarketProposal(
        user_id=user.id,
        title=body.title,
        description=body.description,
        category=body.category,
        closes_at=datetime.fromisoformat(body.closes_at),
    )
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)

    return ProposalResponse(
        id=proposal.id,
        title=proposal.title,
        description=proposal.description,
        category=proposal.category,
        status=proposal.status.value,
        created_at=proposal.created_at.isoformat(),
    )


@router.get("/proposals/my", response_model=list[ProposalResponse])
async def my_proposals(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(MarketProposal)
        .where(MarketProposal.user_id == user.id)
        .order_by(MarketProposal.created_at.desc())
    )
    proposals = result.scalars().all()
    return [
        ProposalResponse(
            id=p.id,
            title=p.title,
            description=p.description,
            category=p.category,
            status=p.status.value,
            created_at=p.created_at.isoformat(),
        )
        for p in proposals
    ]


@router.get("/proposals/pending", response_model=list[ProposalResponse])
async def pending_proposals(admin: CurrentAdmin, db: DbSession):
    result = await db.execute(
        select(MarketProposal)
        .where(MarketProposal.status == ProposalStatus.PENDING)
        .order_by(MarketProposal.created_at.asc())
    )
    proposals = result.scalars().all()
    return [
        ProposalResponse(
            id=p.id,
            title=p.title,
            description=p.description,
            category=p.category,
            status=p.status.value,
            created_at=p.created_at.isoformat(),
        )
        for p in proposals
    ]


@router.post("/proposals/{proposal_id}/approve")
async def approve_proposal(proposal_id: uuid.UUID, admin: CurrentAdmin, db: DbSession):
    proposal = await db.get(MarketProposal, proposal_id)
    if proposal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proposal not found")
    if proposal.status != ProposalStatus.PENDING:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Proposal is not pending")

    from decimal import Decimal

    market = Market(
        title=proposal.title,
        description=proposal.description,
        category=proposal.category,
        closes_at=proposal.closes_at,
        liquidity_b=Decimal("100"),
        created_by=proposal.user_id,
    )
    db.add(market)
    await db.flush()

    proposal.status = ProposalStatus.APPROVED
    proposal.market_id = market.id

    await db.commit()
    return {"status": "approved", "market_id": str(market.id)}


@router.post("/proposals/{proposal_id}/reject")
async def reject_proposal(
    proposal_id: uuid.UUID, body: RejectRequest, admin: CurrentAdmin, db: DbSession
):
    proposal = await db.get(MarketProposal, proposal_id)
    if proposal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proposal not found")
    if proposal.status != ProposalStatus.PENDING:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Proposal is not pending")

    proposal.status = ProposalStatus.REJECTED
    proposal.rejection_reason = body.reason
    await db.commit()
    return {"status": "rejected"}

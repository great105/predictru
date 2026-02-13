import json
import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DbSession, RedisConn
from app.schemas.private_bet import (
    JoinBetRequest,
    ParticipantRead,
    PrivateBetCreate,
    PrivateBetDetail,
    PrivateBetRead,
    VoteRequest,
)
from app.services.private_bet import PrivateBetService

router = APIRouter(prefix="/bets", tags=["private-bets"])


def _bet_to_read(bet, user_id: uuid.UUID | None = None) -> PrivateBetRead:
    my_outcome = None
    my_payout = None
    if user_id and hasattr(bet, "participants"):
        for p in bet.participants:
            if p.user_id == user_id:
                my_outcome = p.outcome
                my_payout = p.payout
                break

    allowed: list[str] = []
    if bet.allowed_usernames:
        try:
            allowed = json.loads(bet.allowed_usernames)
        except (json.JSONDecodeError, TypeError):
            pass

    return PrivateBetRead(
        id=bet.id,
        title=bet.title,
        stake_amount=bet.stake_amount,
        invite_code=bet.invite_code,
        status=bet.status.value,
        closes_at=bet.closes_at,
        voting_deadline=bet.voting_deadline,
        yes_count=bet.yes_count,
        no_count=bet.no_count,
        total_pool=bet.total_pool,
        created_at=bet.created_at,
        creator_name=bet.creator.first_name if bet.creator else "",
        resolution_outcome=bet.resolution_outcome,
        my_outcome=my_outcome,
        my_payout=my_payout,
        is_closed=bet.is_closed,
        allowed_usernames=allowed,
    )


def _bet_to_detail(bet, user_id: uuid.UUID) -> PrivateBetDetail:
    my_outcome = None
    my_vote = None
    participants = []

    for p in bet.participants:
        if p.user_id == user_id:
            my_outcome = p.outcome
            my_vote = p.vote
        participants.append(
            ParticipantRead(
                user_id=p.user_id,
                first_name=p.user.first_name if p.user else "",
                username=p.user.username if p.user else None,
                outcome=p.outcome,
                vote=p.vote,
                payout=p.payout,
            )
        )

    allowed: list[str] = []
    if bet.allowed_usernames:
        try:
            allowed = json.loads(bet.allowed_usernames)
        except (json.JSONDecodeError, TypeError):
            pass

    return PrivateBetDetail(
        id=bet.id,
        title=bet.title,
        description=bet.description,
        stake_amount=bet.stake_amount,
        invite_code=bet.invite_code,
        status=bet.status.value,
        closes_at=bet.closes_at,
        voting_deadline=bet.voting_deadline,
        yes_count=bet.yes_count,
        no_count=bet.no_count,
        yes_votes=bet.yes_votes,
        no_votes=bet.no_votes,
        total_pool=bet.total_pool,
        resolution_outcome=bet.resolution_outcome,
        resolved_at=bet.resolved_at,
        created_at=bet.created_at,
        creator_name=bet.creator.first_name if bet.creator else "",
        my_outcome=my_outcome,
        my_vote=my_vote,
        is_creator=bet.created_by == user_id,
        participants=participants,
        is_closed=bet.is_closed,
        allowed_usernames=allowed,
    )


@router.post("", response_model=PrivateBetRead)
async def create_bet(
    body: PrivateBetCreate, user: CurrentUser, db: DbSession, redis: RedisConn
):
    service = PrivateBetService(db, redis)
    bet = await service.create_bet(
        user_id=user.id,
        title=body.title,
        description=body.description,
        stake_amount=body.stake_amount,
        closes_at=body.closes_at,
        outcome=body.outcome,
        is_closed=body.is_closed,
        allowed_usernames=body.allowed_usernames or None,
    )
    return _bet_to_read(bet)


@router.get("/my", response_model=list[PrivateBetRead])
async def my_bets(user: CurrentUser, db: DbSession, redis: RedisConn):
    service = PrivateBetService(db, redis)
    bets = await service.get_my_bets(user.id)
    return [_bet_to_read(b, user.id) for b in bets]


@router.get("/preview/{code}", response_model=PrivateBetRead)
async def preview_bet(code: str, db: DbSession, redis: RedisConn):
    """Public endpoint — no auth required. Used by bot for rich invite messages."""
    service = PrivateBetService(db, redis)
    bet = await service.lookup_bet(code)
    if bet is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bet not found")
    return _bet_to_read(bet)


@router.get("/lookup/{code}", response_model=PrivateBetRead)
async def lookup_bet(code: str, user: CurrentUser, db: DbSession, redis: RedisConn):
    service = PrivateBetService(db, redis)
    bet = await service.lookup_bet(code)
    if bet is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bet not found")
    return _bet_to_read(bet)


@router.get("/{bet_id}", response_model=PrivateBetDetail)
async def get_bet(
    bet_id: uuid.UUID, user: CurrentUser, db: DbSession, redis: RedisConn
):
    service = PrivateBetService(db, redis)
    bet = await service.get_bet_detail(bet_id, user.id)
    if bet is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Bet not found or you are not a participant"
        )
    return _bet_to_detail(bet, user.id)


@router.post("/join", response_model=PrivateBetRead)
async def join_bet(
    body: JoinBetRequest, user: CurrentUser, db: DbSession, redis: RedisConn
):
    service = PrivateBetService(db, redis)
    bet = await service.join_bet(
        user_id=user.id,
        invite_code=body.invite_code,
        outcome=body.outcome,
    )
    return _bet_to_read(bet)


@router.post("/{bet_id}/start-voting", response_model=PrivateBetDetail)
async def start_voting(
    bet_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    redis: RedisConn,
):
    service = PrivateBetService(db, redis)
    await service.start_voting(user_id=user.id, bet_id=bet_id)
    detail = await service.get_bet_detail(bet_id, user.id)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bet not found")
    return _bet_to_detail(detail, user.id)


@router.post("/{bet_id}/vote", response_model=PrivateBetDetail)
async def vote_bet(
    bet_id: uuid.UUID,
    body: VoteRequest,
    user: CurrentUser,
    db: DbSession,
    redis: RedisConn,
):
    service = PrivateBetService(db, redis)
    await service.cast_vote(
        user_id=user.id,
        bet_id=bet_id,
        vote=body.vote,
    )
    detail = await service.get_bet_detail(bet_id, user.id)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bet not found")
    return _bet_to_detail(detail, user.id)

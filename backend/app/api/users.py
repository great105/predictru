import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.core.config import settings
from app.core.dependencies import CurrentUser, DbSession, RedisConn
from app.models.position import Position
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.schemas.user import (
    DailyBonusResponse,
    DepositRequest,
    LeaderboardEntry,
    ReferralResponse,
    UserProfile,
    UserPublicProfile,
    WalletResponse,
    WithdrawRequest,
)
from app.services.leaderboard import LeaderboardService

router = APIRouter(prefix="/users", tags=["users"])

DAILY_BONUS_AMOUNT = Decimal("50.00")
REFERRAL_BONUS_INVITER = Decimal("100.00")
REFERRAL_BONUS_INVITEE = Decimal("50.00")


@router.get("/me", response_model=UserProfile)
async def get_me(user: CurrentUser):
    profile = UserProfile.model_validate(user)
    profile.is_admin = user.telegram_id in settings.admin_ids
    return profile


@router.get("/me/positions")
async def get_my_positions(user: CurrentUser, db: DbSession):
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Position)
        .where(Position.user_id == user.id)
        .options(selectinload(Position.market))
    )
    positions = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "user_id": str(p.user_id),
            "market_id": str(p.market_id),
            "outcome": p.outcome,
            "shares": float(p.shares),
            "total_cost": float(p.total_cost),
            "avg_price": float(p.avg_price),
            "market_title": p.market.title if p.market else None,
            "market_status": p.market.status.value if p.market else None,
            "resolution_outcome": p.market.resolution_outcome if p.market else None,
        }
        for p in positions
    ]


@router.get("/me/transactions")
async def get_my_transactions(
    user: CurrentUser,
    db: DbSession,
    limit: int = Query(default=20, le=50),
    cursor: str | None = None,
):
    query = (
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
    )

    if cursor:
        try:
            cursor_id = uuid.UUID(cursor)
            cursor_tx = await db.get(Transaction, cursor_id)
            if cursor_tx:
                query = query.where(Transaction.created_at < cursor_tx.created_at)
        except ValueError:
            pass

    query = query.limit(limit + 1)
    result = await db.execute(query)
    txs = result.scalars().all()

    has_next = len(txs) > limit
    if has_next:
        txs = txs[:limit]

    items = [
        {
            "id": str(tx.id),
            "type": tx.type.value,
            "amount": float(tx.amount),
            "shares": float(tx.shares),
            "outcome": tx.outcome,
            "description": tx.description,
            "created_at": tx.created_at.isoformat(),
        }
        for tx in txs
    ]

    return {
        "items": items,
        "next_cursor": str(txs[-1].id) if has_next and txs else None,
    }


@router.post("/me/deposit", response_model=WalletResponse)
async def deposit(body: DepositRequest, user: CurrentUser, db: DbSession):
    """Deposit PRC to wallet. Currently free (virtual currency)."""
    if body.amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Amount must be positive")
    if body.amount > Decimal("10000"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Maximum deposit is 10,000 PRC"
        )

    user.balance += body.amount

    tx = Transaction(
        user_id=user.id,
        type=TransactionType.DEPOSIT,
        amount=body.amount,
        description="Deposit PRC",
    )
    db.add(tx)
    await db.commit()

    return WalletResponse(
        amount=body.amount, new_balance=user.balance, status="completed"
    )


@router.post("/me/withdraw", response_model=WalletResponse)
async def withdraw(body: WithdrawRequest, user: CurrentUser, db: DbSession):
    """Request PRC withdrawal. Currently disabled (virtual currency)."""
    # When real money is enabled, this will create a pending withdrawal request
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        "Withdrawals are not available yet. PRC is a virtual currency.",
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    db: DbSession,
    redis: RedisConn,
    period: str = Query(default="all"),
):
    service = LeaderboardService(db, redis)
    entries = await service.get_leaderboard(period)
    return [LeaderboardEntry(**e) for e in entries]


@router.get("/{user_id}/profile", response_model=UserPublicProfile)
async def get_user_profile(user_id: uuid.UUID, db: DbSession):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return UserPublicProfile.model_validate(user)


@router.post("/me/daily-bonus", response_model=DailyBonusResponse)
async def claim_daily_bonus(user: CurrentUser, db: DbSession):
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    if user.daily_bonus_claimed_at == today_str:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Daily bonus already claimed today",
        )

    user.balance += DAILY_BONUS_AMOUNT
    user.daily_bonus_claimed_at = today_str

    tx = Transaction(
        user_id=user.id,
        type=TransactionType.DAILY,
        amount=DAILY_BONUS_AMOUNT,
        description="Daily bonus",
    )
    db.add(tx)
    await db.commit()

    return DailyBonusResponse(amount=DAILY_BONUS_AMOUNT, new_balance=user.balance)


@router.post("/me/referral/{code}", response_model=ReferralResponse)
async def apply_referral(code: str, user: CurrentUser, db: DbSession):
    if user.referred_by is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Referral already applied",
        )

    # Find inviter
    result = await db.execute(select(User).where(User.referral_code == code))
    inviter = result.scalar_one_or_none()

    if inviter is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid referral code")

    if inviter.id == user.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot use your own referral code",
        )

    # Bonus for invitee
    user.balance += REFERRAL_BONUS_INVITEE
    user.referred_by = inviter.id

    tx_invitee = Transaction(
        user_id=user.id,
        type=TransactionType.REFERRAL,
        amount=REFERRAL_BONUS_INVITEE,
        description=f"Referral bonus from {inviter.first_name}",
    )
    db.add(tx_invitee)

    # Bonus for inviter
    inviter.balance += REFERRAL_BONUS_INVITER
    inviter.referral_count += 1

    tx_inviter = Transaction(
        user_id=inviter.id,
        type=TransactionType.REFERRAL,
        amount=REFERRAL_BONUS_INVITER,
        description=f"Referral bonus for inviting {user.first_name}",
    )
    db.add(tx_inviter)

    await db.commit()

    return ReferralResponse(bonus=REFERRAL_BONUS_INVITEE, new_balance=user.balance)

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from redis.asyncio import Redis
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.private_bet import PrivateBet, PrivateBetParticipant, PrivateBetStatus
from app.models.transaction import Transaction, TransactionType
from app.models.user import User

logger = logging.getLogger(__name__)

FEE_RATE = Decimal("0.02")
MAX_CODE_RETRIES = 5


def _generate_invite_code() -> str:
    return secrets.token_urlsafe(4)[:6].upper()


class PrivateBetService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis

    async def create_bet(
        self,
        user_id: uuid.UUID,
        title: str,
        description: str,
        stake_amount: Decimal,
        closes_at: datetime,
        outcome: str,
    ) -> PrivateBet:
        if outcome not in ("yes", "no"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid outcome")

        now = datetime.now(timezone.utc)
        if closes_at <= now + timedelta(minutes=5):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Closing time must be at least 5 minutes in the future",
            )

        user = await self.db.get(User, user_id, with_for_update=True)
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        if user.balance < stake_amount:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient balance")

        # Generate unique invite code with retry
        invite_code = None
        for _ in range(MAX_CODE_RETRIES):
            code = _generate_invite_code()
            existing = await self.db.execute(
                select(PrivateBet).where(PrivateBet.invite_code == code)
            )
            if existing.scalar_one_or_none() is None:
                invite_code = code
                break
        if invite_code is None:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Failed to generate unique invite code",
            )

        voting_deadline = closes_at + timedelta(hours=24)

        bet = PrivateBet(
            title=title,
            description=description,
            stake_amount=stake_amount,
            invite_code=invite_code,
            status=PrivateBetStatus.OPEN,
            created_by=user_id,
            closes_at=closes_at,
            voting_deadline=voting_deadline,
            total_pool=stake_amount,
            yes_count=1 if outcome == "yes" else 0,
            no_count=1 if outcome == "no" else 0,
        )
        self.db.add(bet)
        await self.db.flush()

        # Creator is the first participant
        participant = PrivateBetParticipant(
            bet_id=bet.id,
            user_id=user_id,
            outcome=outcome,
        )
        self.db.add(participant)

        # Deduct stake
        user.balance -= stake_amount

        tx = Transaction(
            user_id=user_id,
            type=TransactionType.BET_STAKE,
            amount=-stake_amount,
            description=f"Ставка на спор: {title[:80]}",
        )
        self.db.add(tx)

        await self.db.commit()
        await self.db.refresh(bet)
        return bet

    async def join_bet(
        self,
        user_id: uuid.UUID,
        invite_code: str,
        outcome: str,
    ) -> PrivateBet:
        if outcome not in ("yes", "no"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid outcome")

        result = await self.db.execute(
            select(PrivateBet)
            .where(PrivateBet.invite_code == invite_code.upper())
            .with_for_update()
        )
        bet = result.scalar_one_or_none()
        if bet is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bet not found")
        if bet.status != PrivateBetStatus.OPEN:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bet is no longer open")

        # Check duplicate
        existing = await self.db.execute(
            select(PrivateBetParticipant).where(
                PrivateBetParticipant.bet_id == bet.id,
                PrivateBetParticipant.user_id == user_id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "You already joined this bet"
            )

        user = await self.db.get(User, user_id, with_for_update=True)
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        if user.balance < bet.stake_amount:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient balance")

        participant = PrivateBetParticipant(
            bet_id=bet.id,
            user_id=user_id,
            outcome=outcome,
        )
        self.db.add(participant)

        user.balance -= bet.stake_amount

        if outcome == "yes":
            bet.yes_count += 1
        else:
            bet.no_count += 1
        bet.total_pool += bet.stake_amount

        tx = Transaction(
            user_id=user_id,
            type=TransactionType.BET_STAKE,
            amount=-bet.stake_amount,
            description=f"Ставка на спор: {bet.title[:80]}",
        )
        self.db.add(tx)

        await self.db.commit()
        await self.db.refresh(bet)
        return bet

    async def cast_vote(
        self,
        user_id: uuid.UUID,
        bet_id: uuid.UUID,
        vote: str,
    ) -> PrivateBet:
        if vote not in ("yes", "no"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid vote")

        bet = await self.db.get(PrivateBet, bet_id, with_for_update=True)
        if bet is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bet not found")
        if bet.status != PrivateBetStatus.VOTING:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Bet is not in voting phase"
            )

        result = await self.db.execute(
            select(PrivateBetParticipant)
            .where(
                PrivateBetParticipant.bet_id == bet_id,
                PrivateBetParticipant.user_id == user_id,
            )
            .with_for_update()
        )
        participant = result.scalar_one_or_none()
        if participant is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not a participant")
        if participant.vote is not None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You already voted")

        participant.vote = vote
        participant.voted_at = datetime.now(timezone.utc)

        if vote == "yes":
            bet.yes_votes += 1
        else:
            bet.no_votes += 1

        # Check if all participants voted → auto-resolve
        total_participants = bet.yes_count + bet.no_count
        total_votes = bet.yes_votes + bet.no_votes
        if total_votes >= total_participants:
            await self._resolve_bet(bet)

        await self.db.commit()
        await self.db.refresh(bet)
        return bet

    async def _resolve_bet(self, bet: PrivateBet) -> None:
        """Resolve bet based on vote majority. Caller must hold FOR UPDATE lock."""
        if bet.yes_votes > bet.no_votes:
            winning_outcome = "yes"
        elif bet.no_votes > bet.yes_votes:
            winning_outcome = "no"
        else:
            # Tie → cancel and refund
            await self._cancel_and_refund(bet)
            return

        bet.status = PrivateBetStatus.RESOLVED
        bet.resolution_outcome = winning_outcome
        bet.resolved_at = datetime.now(timezone.utc)

        # Calculate payouts
        total_pool = bet.total_pool
        fee = (total_pool * FEE_RATE).quantize(Decimal("0.01"))
        payout_pool = total_pool - fee

        # Get winners
        result = await self.db.execute(
            select(PrivateBetParticipant).where(
                PrivateBetParticipant.bet_id == bet.id,
                PrivateBetParticipant.outcome == winning_outcome,
            )
        )
        winners = result.scalars().all()

        if not winners:
            # No winners (shouldn't happen normally) → refund
            await self._cancel_and_refund(bet)
            return

        per_winner = (payout_pool / len(winners)).quantize(Decimal("0.01"))

        for winner in winners:
            winner.payout = per_winner
            user = await self.db.get(User, winner.user_id, with_for_update=True)
            if user:
                user.balance += per_winner
                tx = Transaction(
                    user_id=winner.user_id,
                    type=TransactionType.BET_PAYOUT,
                    amount=per_winner,
                    description=f"Выигрыш в споре: {bet.title[:80]}",
                )
                self.db.add(tx)

        logger.info(
            f"Bet {bet.id} resolved: {winning_outcome}, "
            f"pool={total_pool}, fee={fee}, per_winner={per_winner}"
        )

    async def _cancel_and_refund(self, bet: PrivateBet) -> None:
        """Cancel bet and refund all participants."""
        bet.status = PrivateBetStatus.CANCELLED
        bet.resolved_at = datetime.now(timezone.utc)

        result = await self.db.execute(
            select(PrivateBetParticipant).where(PrivateBetParticipant.bet_id == bet.id)
        )
        participants = result.scalars().all()

        for p in participants:
            p.payout = bet.stake_amount
            user = await self.db.get(User, p.user_id, with_for_update=True)
            if user:
                user.balance += bet.stake_amount
                tx = Transaction(
                    user_id=p.user_id,
                    type=TransactionType.BET_REFUND,
                    amount=bet.stake_amount,
                    description=f"Возврат ставки: {bet.title[:80]}",
                )
                self.db.add(tx)

        logger.info(
            f"Bet {bet.id} cancelled, refunded {len(participants)} participants"
        )

    async def get_my_bets(self, user_id: uuid.UUID) -> list[PrivateBet]:
        result = await self.db.execute(
            select(PrivateBet)
            .where(
                or_(
                    PrivateBet.created_by == user_id,
                    PrivateBet.id.in_(
                        select(PrivateBetParticipant.bet_id).where(
                            PrivateBetParticipant.user_id == user_id
                        )
                    ),
                )
            )
            .options(selectinload(PrivateBet.creator))
            .order_by(PrivateBet.created_at.desc())
            .limit(50)
        )
        return list(result.scalars().unique().all())

    async def get_bet_detail(
        self, bet_id: uuid.UUID, user_id: uuid.UUID
    ) -> PrivateBet | None:
        # Check participant access
        result = await self.db.execute(
            select(PrivateBetParticipant).where(
                PrivateBetParticipant.bet_id == bet_id,
                PrivateBetParticipant.user_id == user_id,
            )
        )
        if result.scalar_one_or_none() is None:
            return None

        result = await self.db.execute(
            select(PrivateBet)
            .where(PrivateBet.id == bet_id)
            .options(
                selectinload(PrivateBet.participants).selectinload(
                    PrivateBetParticipant.user
                ),
                selectinload(PrivateBet.creator),
            )
        )
        return result.scalar_one_or_none()

    async def lookup_bet(self, invite_code: str) -> PrivateBet | None:
        result = await self.db.execute(
            select(PrivateBet)
            .where(PrivateBet.invite_code == invite_code.upper())
            .options(selectinload(PrivateBet.creator))
        )
        return result.scalar_one_or_none()

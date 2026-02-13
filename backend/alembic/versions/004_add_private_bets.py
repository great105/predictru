"""Add private bets tables

Revision ID: 004
Revises: 003
Create Date: 2026-02-13 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- PrivateBetStatus enum ---
    privatebetstatus = sa.Enum(
        "open", "voting", "resolved", "cancelled", name="privatebetstatus"
    )

    # --- private_bets table ---
    op.create_table(
        "private_bets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), server_default=""),
        sa.Column("stake_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("invite_code", sa.String(8), nullable=False, unique=True),
        sa.Column("status", privatebetstatus, server_default="open"),
        sa.Column(
            "created_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("closes_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("voting_deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolution_outcome", sa.String(10)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("total_pool", sa.Numeric(14, 2), server_default="0"),
        sa.Column("yes_count", sa.Integer(), server_default="0"),
        sa.Column("no_count", sa.Integer(), server_default="0"),
        sa.Column("yes_votes", sa.Integer(), server_default="0"),
        sa.Column("no_votes", sa.Integer(), server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index("ix_private_bets_invite_code", "private_bets", ["invite_code"])
    op.create_index("ix_private_bets_status", "private_bets", ["status"])
    op.create_index(
        "ix_private_bets_status_closes", "private_bets", ["status", "closes_at"]
    )
    op.create_index("ix_private_bets_creator", "private_bets", ["created_by"])

    # --- private_bet_participants table ---
    op.create_table(
        "private_bet_participants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "bet_id",
            UUID(as_uuid=True),
            sa.ForeignKey("private_bets.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("outcome", sa.String(10), nullable=False),
        sa.Column("vote", sa.String(10)),
        sa.Column("voted_at", sa.DateTime(timezone=True)),
        sa.Column("payout", sa.Numeric(12, 2), server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.UniqueConstraint("bet_id", "user_id", name="uq_private_bet_participant"),
    )
    op.create_index("ix_pbp_bet_id", "private_bet_participants", ["bet_id"])
    op.create_index("ix_pbp_user_id", "private_bet_participants", ["user_id"])

    # Extend transactiontype enum with new values
    op.execute("COMMIT")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'bet_stake'")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'bet_payout'")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'bet_refund'")
    op.execute("BEGIN")


def downgrade() -> None:
    op.drop_table("private_bet_participants")
    op.drop_table("private_bets")
    op.execute("DROP TYPE IF EXISTS privatebetstatus")

"""Initial schema

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False, unique=True),
        sa.Column("username", sa.String(255)),
        sa.Column("first_name", sa.String(255), server_default=""),
        sa.Column("last_name", sa.String(255)),
        sa.Column("photo_url", sa.String(512)),
        sa.Column("language_code", sa.String(10), server_default="ru"),
        sa.Column("balance", sa.Numeric(12, 2), server_default="1000.00"),
        sa.Column("total_trades", sa.Integer(), server_default="0"),
        sa.Column("total_profit", sa.Numeric(12, 2), server_default="0.00"),
        sa.Column("win_rate", sa.Numeric(5, 2), server_default="0.00"),
        sa.Column("referral_code", sa.String(20), nullable=False, unique=True),
        sa.Column("referred_by", UUID(as_uuid=True)),
        sa.Column("referral_count", sa.Integer(), server_default="0"),
        sa.Column("daily_bonus_claimed_at", sa.String(30)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"])
    op.create_index("ix_users_referral_code", "users", ["referral_code"])

    # Markets
    op.create_table(
        "markets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), server_default=""),
        sa.Column("category", sa.String(50), server_default="general"),
        sa.Column("image_url", sa.String(512)),
        sa.Column(
            "status",
            sa.Enum(
                "open", "trading_closed", "resolved", "cancelled", name="marketstatus"
            ),
            server_default="open",
        ),
        sa.Column("resolution_outcome", sa.String(10)),
        sa.Column("amm_type", sa.String(20), server_default="lmsr"),
        sa.Column("q_yes", sa.Numeric(16, 6), server_default="0"),
        sa.Column("q_no", sa.Numeric(16, 6), server_default="0"),
        sa.Column("liquidity_b", sa.Numeric(12, 2), server_default="100"),
        sa.Column("total_volume", sa.Numeric(14, 2), server_default="0"),
        sa.Column("total_traders", sa.Integer(), server_default="0"),
        sa.Column("closes_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("created_by", UUID(as_uuid=True)),
        sa.Column("is_featured", sa.Boolean(), server_default="false"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index("ix_markets_category", "markets", ["category"])
    op.create_index("ix_markets_status", "markets", ["status"])
    op.create_index("ix_markets_status_closes_at", "markets", ["status", "closes_at"])
    op.create_index("ix_markets_featured", "markets", ["is_featured", "status"])

    # Positions
    op.create_table(
        "positions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("market_id", UUID(as_uuid=True), nullable=False),
        sa.Column("outcome", sa.String(10), nullable=False),
        sa.Column("shares", sa.Numeric(16, 6), server_default="0"),
        sa.Column("total_cost", sa.Numeric(12, 2), server_default="0"),
        sa.Column("avg_price", sa.Numeric(8, 4), server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.UniqueConstraint(
            "user_id", "market_id", "outcome", name="uq_user_market_outcome"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["market_id"], ["markets.id"]),
    )
    op.create_index("ix_positions_user_id", "positions", ["user_id"])
    op.create_index("ix_positions_market_id", "positions", ["market_id"])
    op.create_index("ix_positions_user_market", "positions", ["user_id", "market_id"])

    # Transactions
    op.create_table(
        "transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("market_id", UUID(as_uuid=True)),
        sa.Column(
            "type",
            sa.Enum(
                "buy",
                "sell",
                "payout",
                "bonus",
                "referral",
                "daily",
                name="transactiontype",
            ),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("shares", sa.Numeric(16, 6), server_default="0"),
        sa.Column("outcome", sa.String(10)),
        sa.Column("price_at_trade", sa.Numeric(8, 4), server_default="0"),
        sa.Column("description", sa.Text(), server_default=""),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_user_type", "transactions", ["user_id", "type"])
    op.create_index("ix_transactions_market", "transactions", ["market_id"])

    # Price History
    op.create_table(
        "price_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("market_id", UUID(as_uuid=True), nullable=False),
        sa.Column("price_yes", sa.Numeric(8, 4), nullable=False),
        sa.Column("price_no", sa.Numeric(8, 4), nullable=False),
        sa.Column("q_yes", sa.Numeric(16, 6), nullable=False),
        sa.Column("q_no", sa.Numeric(16, 6), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["market_id"], ["markets.id"]),
    )
    op.create_index("ix_price_history_market_id", "price_history", ["market_id"])
    op.create_index(
        "ix_price_history_market_time", "price_history", ["market_id", "created_at"]
    )


def downgrade() -> None:
    op.drop_table("price_history")
    op.drop_table("transactions")
    op.drop_table("positions")
    op.drop_table("markets")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS marketstatus")
    op.execute("DROP TYPE IF EXISTS transactiontype")

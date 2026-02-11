"""Add missing columns and tables

Revision ID: 003
Revises: 002
Create Date: 2026-02-11 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Users: add reserved_balance ---
    op.add_column(
        "users",
        sa.Column("reserved_balance", sa.Numeric(12, 2), server_default="0.00"),
    )

    # --- Markets: add missing columns ---
    op.add_column(
        "markets",
        sa.Column("resolution_source", sa.Text(), server_default=""),
    )
    op.add_column(
        "markets",
        sa.Column("min_bet", sa.Numeric(12, 2), server_default="1.00"),
    )
    op.add_column(
        "markets",
        sa.Column("max_bet", sa.Numeric(12, 2), server_default="10000.00"),
    )
    op.add_column(
        "markets",
        sa.Column("last_trade_price_yes", sa.Numeric(5, 2)),
    )

    # --- Positions: add reserved_shares ---
    op.add_column(
        "positions",
        sa.Column("reserved_shares", sa.Numeric(16, 6), server_default="0"),
    )

    # --- Transactions: add FK to markets, extend enum ---
    # Add missing FK (market_id -> markets.id)
    op.create_foreign_key(
        "fk_transactions_market_id",
        "transactions",
        "markets",
        ["market_id"],
        ["id"],
    )

    # --- Orders table ---
    orderside = sa.Enum("buy", "sell", name="orderside")
    orderstatus = sa.Enum(
        "open", "partially_filled", "filled", "cancelled", name="orderstatus"
    )
    orderintent = sa.Enum(
        "buy_yes", "buy_no", "sell_yes", "sell_no", name="orderintent"
    )

    op.create_table(
        "orders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "market_id",
            UUID(as_uuid=True),
            sa.ForeignKey("markets.id"),
            nullable=False,
        ),
        sa.Column("side", orderside, nullable=False),
        sa.Column("price", sa.Numeric(5, 2), nullable=False),
        sa.Column("quantity", sa.Numeric(16, 6), nullable=False),
        sa.Column("filled_quantity", sa.Numeric(16, 6), server_default="0"),
        sa.Column("status", orderstatus, server_default="open"),
        sa.Column("original_intent", orderintent, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_orders_book",
        "orders",
        ["market_id", "side", "status", "price", "created_at"],
    )
    op.create_index("ix_orders_user_status", "orders", ["user_id", "status"])
    op.create_index("ix_orders_market_status", "orders", ["market_id", "status"])

    # --- TradeFills table ---
    settlementtype = sa.Enum("transfer", "mint", "burn", name="settlementtype")

    op.create_table(
        "trade_fills",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "market_id",
            UUID(as_uuid=True),
            sa.ForeignKey("markets.id"),
            nullable=False,
        ),
        sa.Column(
            "buy_order_id",
            UUID(as_uuid=True),
            sa.ForeignKey("orders.id"),
            nullable=False,
        ),
        sa.Column(
            "sell_order_id",
            UUID(as_uuid=True),
            sa.ForeignKey("orders.id"),
            nullable=False,
        ),
        sa.Column(
            "buyer_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "seller_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("price", sa.Numeric(5, 2), nullable=False),
        sa.Column("quantity", sa.Numeric(16, 6), nullable=False),
        sa.Column("fee", sa.Numeric(12, 2), server_default="0"),
        sa.Column("settlement_type", settlementtype, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index("ix_trade_fills_market", "trade_fills", ["market_id", "created_at"])

    # Extend transactiontype enum with new values
    # NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction
    # so we commit first and then run them outside the transaction
    op.execute("COMMIT")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'fee'")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'deposit'")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'withdraw'")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'order_fill'")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'order_cancel'")
    op.execute("BEGIN")


def downgrade() -> None:
    op.drop_table("trade_fills")
    op.drop_table("orders")
    op.execute("DROP TYPE IF EXISTS settlementtype")
    op.execute("DROP TYPE IF EXISTS orderintent")
    op.execute("DROP TYPE IF EXISTS orderstatus")
    op.execute("DROP TYPE IF EXISTS orderside")

    op.drop_constraint("fk_transactions_market_id", "transactions", type_="foreignkey")
    op.drop_column("positions", "reserved_shares")
    op.drop_column("markets", "last_trade_price_yes")
    op.drop_column("markets", "max_bet")
    op.drop_column("markets", "min_bet")
    op.drop_column("markets", "resolution_source")
    op.drop_column("users", "reserved_balance")

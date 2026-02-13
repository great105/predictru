"""Add closed bets columns

Revision ID: 005
Revises: 004
Create Date: 2026-02-13 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "private_bets",
        sa.Column("is_closed", sa.Boolean(), server_default="false"),
    )
    op.add_column(
        "private_bets",
        sa.Column("allowed_usernames", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("private_bets", "allowed_usernames")
    op.drop_column("private_bets", "is_closed")

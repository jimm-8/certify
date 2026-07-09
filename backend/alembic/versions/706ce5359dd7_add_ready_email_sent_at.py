"""add ready email sent at

Revision ID: 706ce5359dd7
Revises: 90454557311c
Create Date: 2026-04-09 14:34:06.921574

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '706ce5359dd7'
down_revision: Union[str, None] = '90454557311c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS ready_email_sent_at TIMESTAMP;"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE certificate_requests DROP COLUMN IF EXISTS ready_email_sent_at;"
    )

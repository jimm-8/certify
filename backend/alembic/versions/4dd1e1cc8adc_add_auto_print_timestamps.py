"""add auto print timestamps

Revision ID: 4dd1e1cc8adc
Revises: 004b3b4c44d1
Create Date: 2026-04-13 19:00:33.992897

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4dd1e1cc8adc'
down_revision: Union[str, None] = '004b3b4c44d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS auto_print_requested_at TIMESTAMP;"
    )
    op.execute(
        "ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS auto_printed_at TIMESTAMP;"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE certificate_requests DROP COLUMN IF EXISTS auto_printed_at;"
    )
    op.execute(
        "ALTER TABLE certificate_requests DROP COLUMN IF EXISTS auto_print_requested_at;"
    )

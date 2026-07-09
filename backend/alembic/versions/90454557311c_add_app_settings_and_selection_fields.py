"""add app settings and selection fields

Revision ID: 90454557311c
Revises: d4c5e6f7a8b9
Create Date: 2026-04-09 14:12:46.639136

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '90454557311c'
down_revision: Union[str, None] = 'd4c5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS app_settings (
            key VARCHAR(100) PRIMARY KEY,
            value VARCHAR(500),
            updated_at TIMESTAMP NULL
        );
        """
    )
    op.execute(
        "ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS course_description_selection TEXT;"
    )
    op.execute(
        "ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS grade_selection TEXT;"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE certificate_requests DROP COLUMN IF EXISTS grade_selection;"
    )
    op.execute(
        "ALTER TABLE certificate_requests DROP COLUMN IF EXISTS course_description_selection;"
    )
    op.execute("DROP TABLE IF EXISTS app_settings;")

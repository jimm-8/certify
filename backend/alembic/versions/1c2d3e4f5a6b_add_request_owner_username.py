"""add request owner username

Revision ID: 1c2d3e4f5a6b
Revises: 6f8a9b0c1d2e, 6b7c8d9e0f1a
Create Date: 2026-05-12 15:20:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "1c2d3e4f5a6b"
down_revision: Union[str, tuple[str, str], None] = (
    "6f8a9b0c1d2e",
    "6b7c8d9e0f1a",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS owner_username VARCHAR(255);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_certificate_requests_owner_username "
        "ON certificate_requests (owner_username);"
    )


def downgrade() -> None:
    op.execute(
        "DROP INDEX IF EXISTS ix_certificate_requests_owner_username;"
    )
    op.execute(
        "ALTER TABLE certificate_requests DROP COLUMN IF EXISTS owner_username;"
    )

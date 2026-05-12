"""add processing hold tracking

Revision ID: 2d3e4f5a6b7c
Revises: 1c2d3e4f5a6b
Create Date: 2026-05-13 11:40:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "2d3e4f5a6b7c"
down_revision: Union[str, None] = "1c2d3e4f5a6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE certificate_requests "
        "ADD COLUMN IF NOT EXISTS processing_hold_active BOOLEAN DEFAULT false NOT NULL;"
    )
    op.execute(
        "ALTER TABLE certificate_requests "
        "ADD COLUMN IF NOT EXISTS processing_hold_started_at TIMESTAMP WITH TIME ZONE;"
    )
    op.execute(
        "ALTER TABLE certificate_requests "
        "ADD COLUMN IF NOT EXISTS processing_hold_total_seconds INTEGER DEFAULT 0 NOT NULL;"
    )
    op.execute(
        "ALTER TABLE certificate_requests "
        "ADD COLUMN IF NOT EXISTS processing_hold_reason TEXT;"
    )
    op.execute(
        "ALTER TABLE certificate_requests "
        "ADD COLUMN IF NOT EXISTS processing_hold_source VARCHAR(32);"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE certificate_requests "
        "DROP COLUMN IF EXISTS processing_hold_source;"
    )
    op.execute(
        "ALTER TABLE certificate_requests "
        "DROP COLUMN IF EXISTS processing_hold_reason;"
    )
    op.execute(
        "ALTER TABLE certificate_requests "
        "DROP COLUMN IF EXISTS processing_hold_total_seconds;"
    )
    op.execute(
        "ALTER TABLE certificate_requests "
        "DROP COLUMN IF EXISTS processing_hold_started_at;"
    )
    op.execute(
        "ALTER TABLE certificate_requests "
        "DROP COLUMN IF EXISTS processing_hold_active;"
    )

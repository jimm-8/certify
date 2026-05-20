"""add processing queue settings to users

Revision ID: c1d2e3f4a5b6
Revises: d4c5e6f7a8b9
Create Date: 2026-05-21 11:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c1d2e3f4a5b6"
down_revision = "d4c5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "can_process_certificates",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "processing_queue_limit",
            sa.Integer(),
            nullable=False,
            server_default="5",
        ),
    )
    op.alter_column("users", "can_process_certificates", server_default=None)
    op.alter_column("users", "processing_queue_limit", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "processing_queue_limit")
    op.drop_column("users", "can_process_certificates")

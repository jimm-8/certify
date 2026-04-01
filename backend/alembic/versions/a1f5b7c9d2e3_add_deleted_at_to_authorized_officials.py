"""add deleted_at to authorized_officials

Revision ID: a1f5b7c9d2e3
Revises: b2c3d4e5f6a7
Create Date: 2026-04-01 00:10:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1f5b7c9d2e3"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "authorized_officials",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("authorized_officials", "deleted_at")

"""add latin_honor to graduation_records

Revision ID: a8b7c6d5e4f3
Revises: f1a9cdb3342b
Create Date: 2026-04-09 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "a8b7c6d5e4f3"
down_revision = "f1a9cdb3342b"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("graduation_records")}
    if "latin_honor" not in columns:
        op.add_column(
            "graduation_records",
            sa.Column("latin_honor", sa.String(length=50), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("graduation_records")}
    if "latin_honor" in columns:
        op.drop_column("graduation_records", "latin_honor")

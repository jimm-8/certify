"""add campus contact fields

Revision ID: e3f7b3c9b7a1
Revises: cfa7a2c1bcb1
Create Date: 2026-03-23 19:05:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "e3f7b3c9b7a1"
down_revision = "cfa7a2c1bcb1"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("campuses")}
    if "campus_address" not in columns:
        op.add_column("campuses", sa.Column("campus_address", sa.Text(), nullable=True))
    if "campus_telNo" not in columns:
        op.add_column(
            "campuses",
            sa.Column("campus_telNo", sa.String(length=50), nullable=True),
        )
    if "campus_email" not in columns:
        op.add_column(
            "campuses",
            sa.Column("campus_email", sa.String(length=255), nullable=True),
        )
    if "campus_certCode" not in columns:
        op.add_column(
            "campuses",
            sa.Column("campus_certCode", sa.String(length=50), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("campuses")}
    if "campus_certCode" in columns:
        op.drop_column("campuses", "campus_certCode")
    if "campus_email" in columns:
        op.drop_column("campuses", "campus_email")
    if "campus_telNo" in columns:
        op.drop_column("campuses", "campus_telNo")
    if "campus_address" in columns:
        op.drop_column("campuses", "campus_address")

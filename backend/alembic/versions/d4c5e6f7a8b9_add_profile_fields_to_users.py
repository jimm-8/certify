"""add profile fields to users

Revision ID: d4c5e6f7a8b9
Revises: a1f5b7c9d2e3
Create Date: 2026-04-01 12:05:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "d4c5e6f7a8b9"
down_revision = "a1f5b7c9d2e3"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "full_name" not in columns:
        op.add_column("users", sa.Column("full_name", sa.String(length=255), nullable=True))
    if "contact_number" not in columns:
        op.add_column("users", sa.Column("contact_number", sa.String(length=50), nullable=True))
    if "department" not in columns:
        op.add_column("users", sa.Column("department", sa.String(length=255), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "department" in columns:
        op.drop_column("users", "department")
    if "contact_number" in columns:
        op.drop_column("users", "contact_number")
    if "full_name" in columns:
        op.drop_column("users", "full_name")

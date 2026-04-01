"""add or_number to certificate_requests

Revision ID: f1a9cdb3342b
Revises: e3f7b3c9b7a1
Create Date: 2026-03-23 20:05:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "f1a9cdb3342b"
down_revision = "e3f7b3c9b7a1"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}
    if "or_number" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("or_number", sa.String(length=20), nullable=True),
        )
    indexes = {idx["name"] for idx in inspector.get_indexes("certificate_requests")}
    if "ix_certificate_requests_or_number" not in indexes:
        op.create_index(
            "ix_certificate_requests_or_number",
            "certificate_requests",
            ["or_number"],
            unique=False,
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("certificate_requests")}
    if "ix_certificate_requests_or_number" in indexes:
        op.drop_index(
            "ix_certificate_requests_or_number",
            table_name="certificate_requests",
        )
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}
    if "or_number" in columns:
        op.drop_column("certificate_requests", "or_number")

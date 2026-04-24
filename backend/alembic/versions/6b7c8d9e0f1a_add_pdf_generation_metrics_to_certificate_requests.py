"""add pdf generation metrics to certificate requests

Revision ID: 6b7c8d9e0f1a
Revises: 5e2f8a1c7b4d, abcdef123456
Create Date: 2026-04-21 19:15:00

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "6b7c8d9e0f1a"
down_revision = ("5e2f8a1c7b4d", "abcdef123456")
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}

    if "pdf_generated_at" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("pdf_generated_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "pdf_generation_time_ms" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("pdf_generation_time_ms", sa.Integer(), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}

    if "pdf_generation_time_ms" in columns:
        op.drop_column("certificate_requests", "pdf_generation_time_ms")

    if "pdf_generated_at" in columns:
        op.drop_column("certificate_requests", "pdf_generated_at")

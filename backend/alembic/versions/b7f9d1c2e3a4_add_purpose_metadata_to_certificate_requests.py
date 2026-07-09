"""add purpose metadata to certificate requests

Revision ID: b7f9d1c2e3a4
Revises: 6b7c8d9e0f1a
Create Date: 2026-04-22 15:40:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "b7f9d1c2e3a4"
down_revision = "6b7c8d9e0f1a"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}

    if "purpose_normalized" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("purpose_normalized", sa.Text(), nullable=True),
        )

    if "purpose_category" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column(
                "purpose_category",
                sa.String(length=50),
                nullable=False,
                server_default="OTHER",
            ),
        )

    if "purpose_extracted_notes" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("purpose_extracted_notes", sa.Text(), nullable=True),
        )

    if "needs_instruction_review" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column(
                "needs_instruction_review",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}

    if "needs_instruction_review" in columns:
        op.drop_column("certificate_requests", "needs_instruction_review")

    if "purpose_extracted_notes" in columns:
        op.drop_column("certificate_requests", "purpose_extracted_notes")

    if "purpose_category" in columns:
        op.drop_column("certificate_requests", "purpose_category")

    if "purpose_normalized" in columns:
        op.drop_column("certificate_requests", "purpose_normalized")

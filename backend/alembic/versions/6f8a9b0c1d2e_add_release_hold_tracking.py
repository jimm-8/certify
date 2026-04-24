"""add release hold tracking

Revision ID: 6f8a9b0c1d2e
Revises: b7f9d1c2e3a4
Create Date: 2026-04-24 13:40:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "6f8a9b0c1d2e"
down_revision: Union[str, None] = "b7f9d1c2e3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("certificate_requests")}

    if "for_releasing_started_at" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("for_releasing_started_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "release_hold_active" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column(
                "release_hold_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if "release_hold_started_at" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("release_hold_started_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "release_hold_total_seconds" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column(
                "release_hold_total_seconds",
                sa.Integer(),
                nullable=False,
                server_default="0",
            ),
        )

    if "release_hold_reason" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("release_hold_reason", sa.Text(), nullable=True),
        )

    if "release_hold_source" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("release_hold_source", sa.String(length=32), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("certificate_requests")}

    for column_name in [
        "release_hold_source",
        "release_hold_reason",
        "release_hold_total_seconds",
        "release_hold_started_at",
        "release_hold_active",
        "for_releasing_started_at",
    ]:
        if column_name in columns:
            op.drop_column("certificate_requests", column_name)

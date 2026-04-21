"""add auto print job tracking

Revision ID: 5e2f8a1c7b4d
Revises: 7f2c1b8e9d4a
Create Date: 2026-04-21 18:25:00

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "5e2f8a1c7b4d"
down_revision = "7f2c1b8e9d4a"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}
    indexes = {idx["name"] for idx in inspector.get_indexes("certificate_requests")}

    if "print_job_status" in columns and "auto_print_status" not in columns:
        op.alter_column(
            "certificate_requests",
            "print_job_status",
            new_column_name="auto_print_status",
            existing_type=sa.String(length=120),
            existing_nullable=True,
        )
        columns.remove("print_job_status")
        columns.add("auto_print_status")
    elif "auto_print_status" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("auto_print_status", sa.String(length=32), nullable=True),
        )

    if "print_job_id" in columns and "auto_print_job_id" not in columns:
        op.alter_column(
            "certificate_requests",
            "print_job_id",
            new_column_name="auto_print_job_id",
            existing_type=sa.String(length=120),
            existing_nullable=True,
        )
        columns.remove("print_job_id")
        columns.add("auto_print_job_id")
    elif "auto_print_job_id" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("auto_print_job_id", sa.String(length=120), nullable=True),
        )

    if "print_job_message" in columns and "auto_print_error" not in columns:
        op.alter_column(
            "certificate_requests",
            "print_job_message",
            new_column_name="auto_print_error",
            existing_type=sa.Text(),
            existing_nullable=True,
        )
        columns.remove("print_job_message")
        columns.add("auto_print_error")
    elif "auto_print_error" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("auto_print_error", sa.Text(), nullable=True),
        )

    if "print_job_updated_at" in columns and "auto_print_confirmed_at" not in columns:
        op.alter_column(
            "certificate_requests",
            "print_job_updated_at",
            new_column_name="auto_print_confirmed_at",
            existing_type=sa.DateTime(),
            existing_nullable=True,
        )
        columns.remove("print_job_updated_at")
        columns.add("auto_print_confirmed_at")
    elif "auto_print_confirmed_at" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("auto_print_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        )

    if (
        "ix_certificate_requests_print_job_id" in indexes
        and "ix_certificate_requests_auto_print_job_id" not in indexes
    ):
        op.execute(
            "ALTER INDEX ix_certificate_requests_print_job_id "
            "RENAME TO ix_certificate_requests_auto_print_job_id"
        )
        indexes.remove("ix_certificate_requests_print_job_id")
        indexes.add("ix_certificate_requests_auto_print_job_id")
    if "ix_certificate_requests_auto_print_job_id" not in indexes:
        op.create_index(
            "ix_certificate_requests_auto_print_job_id",
            "certificate_requests",
            ["auto_print_job_id"],
            unique=False,
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("certificate_requests")}
    if "ix_certificate_requests_auto_print_job_id" in indexes:
        op.drop_index(
            "ix_certificate_requests_auto_print_job_id",
            table_name="certificate_requests",
        )

    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}
    if "auto_print_confirmed_at" in columns:
        op.drop_column("certificate_requests", "auto_print_confirmed_at")
    if "auto_print_error" in columns:
        op.drop_column("certificate_requests", "auto_print_error")
    if "auto_print_job_id" in columns:
        op.drop_column("certificate_requests", "auto_print_job_id")
    if "auto_print_status" in columns:
        op.drop_column("certificate_requests", "auto_print_status")

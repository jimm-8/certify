"""add request type and document fields

Revision ID: 7f2c1b8e9d4a
Revises: 4dd1e1cc8adc
Create Date: 2026-04-20 07:35:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "7f2c1b8e9d4a"
down_revision = "4dd1e1cc8adc"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}
    indexes = {idx["name"] for idx in inspector.get_indexes("certificate_requests")}

    if "request_type" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column(
                "request_type",
                sa.String(length=50),
                nullable=False,
                server_default="certificate",
            ),
        )

    if "requested_document_name" not in columns:
        op.add_column(
            "certificate_requests",
            sa.Column("requested_document_name", sa.String(length=255), nullable=True),
        )

    if "ix_certificate_requests_request_type" not in indexes:
        op.create_index(
            "ix_certificate_requests_request_type",
            "certificate_requests",
            ["request_type"],
            unique=False,
        )

    op.execute(
        """
        UPDATE certificate_requests
        SET request_type = 'certificate'
        WHERE request_type IS NULL OR request_type = '';
        """
    )

    op.alter_column(
        "certificate_requests",
        "certificate_type_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.alter_column(
        "certificate_requests",
        "certificate_type_name",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("certificate_requests")}
    columns = {col["name"] for col in inspector.get_columns("certificate_requests")}

    if "ix_certificate_requests_request_type" in indexes:
        op.drop_index(
            "ix_certificate_requests_request_type",
            table_name="certificate_requests",
        )

    if "requested_document_name" in columns:
        op.drop_column("certificate_requests", "requested_document_name")

    if "request_type" in columns:
        op.drop_column("certificate_requests", "request_type")

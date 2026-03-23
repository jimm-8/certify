"""add or_number to certificate_requests

Revision ID: f1a9cdb3342b
Revises: e3f7b3c9b7a1
Create Date: 2026-03-23 20:05:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f1a9cdb3342b"
down_revision = "e3f7b3c9b7a1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("certificate_requests", sa.Column("or_number", sa.String(length=20), nullable=True))
    op.create_index("ix_certificate_requests_or_number", "certificate_requests", ["or_number"], unique=False)


def downgrade():
    op.drop_index("ix_certificate_requests_or_number", table_name="certificate_requests")
    op.drop_column("certificate_requests", "or_number")

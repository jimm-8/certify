"""rename or_number to control_num

Revision ID: 1234567890ab
Revises: 004b3b4c44d1
Create Date: 2026-04-21 12:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "1234567890ab"
down_revision = "004b3b4c44d1"
branch_labels = None
depends_on = None


def upgrade():
    # Rename column or_number to control_num
    op.alter_column(
        "certificate_requests",
        "or_number",
        new_column_name="control_num",
        existing_type=sa.String(length=20),
        existing_nullable=True,
    )
    # Rename index
    op.execute(
        "ALTER INDEX ix_certificate_requests_or_number RENAME TO ix_certificate_requests_control_num"
    )


def downgrade():
    # Rename back
    op.alter_column(
        "certificate_requests",
        "control_num",
        new_column_name="or_number",
        existing_type=sa.String(length=20),
        existing_nullable=True,
    )
    # Rename index back
    op.execute(
        "ALTER INDEX ix_certificate_requests_control_num RENAME TO ix_certificate_requests_or_number"
    )

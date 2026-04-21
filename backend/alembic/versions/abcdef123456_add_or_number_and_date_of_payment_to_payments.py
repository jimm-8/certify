"""add or_number and date_of_payment to payments

Revision ID: abcdef123456
Revises: 1234567890ab
Create Date: 2026-04-21 12:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "abcdef123456"
down_revision = "1234567890ab"
branch_labels = None
depends_on = None


def upgrade():
    # Add or_number column
    op.add_column(
        "payments",
        sa.Column("or_number", sa.String(length=20), nullable=True),
    )
    # Add date_of_payment column
    op.add_column(
        "payments",
        sa.Column("date_of_payment", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    # Drop columns
    op.drop_column("payments", "date_of_payment")
    op.drop_column("payments", "or_number")

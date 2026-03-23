"""add campus contact fields

Revision ID: e3f7b3c9b7a1
Revises: cfa7a2c1bcb1
Create Date: 2026-03-23 19:05:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e3f7b3c9b7a1"
down_revision = "cfa7a2c1bcb1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("campuses", sa.Column("campus_address", sa.Text(), nullable=True))
    op.add_column("campuses", sa.Column("campus_telNo", sa.String(length=50), nullable=True))
    op.add_column("campuses", sa.Column("campus_email", sa.String(length=255), nullable=True))
    op.add_column("campuses", sa.Column("campus_certCode", sa.String(length=50), nullable=True))


def downgrade():
    op.drop_column("campuses", "campus_certCode")
    op.drop_column("campuses", "campus_email")
    op.drop_column("campuses", "campus_telNo")
    op.drop_column("campuses", "campus_address")

"""create authorized_officials table

Revision ID: b2c3d4e5f6a7
Revises: f1a9cdb3342b
Create Date: 2026-04-01 00:35:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a7"
down_revision = "f1a9cdb3342b"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if "authorized_officials" not in inspector.get_table_names():
        op.create_table(
            "authorized_officials",
            sa.Column("id", sa.Integer, primary_key=True, index=True),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column(
                "campus_id",
                sa.Integer,
                sa.ForeignKey("campuses.id"),
                nullable=True,
            ),
            sa.Column("signature_path", sa.String(length=500), nullable=True),
            sa.Column(
                "is_active",
                sa.Boolean,
                nullable=False,
                server_default=sa.text("true"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if "authorized_officials" in inspector.get_table_names():
        op.drop_table("authorized_officials")

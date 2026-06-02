"""merge processing queue and request heads

Revision ID: e5f6a7b8c9d0
Revises: 2d3e4f5a6b7c, c1d2e3f4a5b6
Create Date: 2026-05-21 14:30:00.000000
"""

from typing import Sequence, Union


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = (
    "2d3e4f5a6b7c",
    "c1d2e3f4a5b6",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

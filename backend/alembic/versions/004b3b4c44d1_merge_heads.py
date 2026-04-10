"""merge heads

Revision ID: 004b3b4c44d1
Revises: 706ce5359dd7, a8b7c6d5e4f3
Create Date: 2026-04-09 23:33:01.050719

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004b3b4c44d1'
down_revision: Union[str, None] = ('706ce5359dd7', 'a8b7c6d5e4f3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

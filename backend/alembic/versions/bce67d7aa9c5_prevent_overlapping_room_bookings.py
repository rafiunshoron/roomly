"""prevent overlapping room bookings

Revision ID: bce67d7aa9c5
Revises: 73efba4a43a6
Create Date: 2026-10-10 19:34:32.351057

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bce67d7aa9c5'
down_revision: Union[str, Sequence[str], None] = '73efba4a43a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.execute("""
        ALTER TABLE bookings
        ADD CONSTRAINT no_overlapping_bookings
        EXCLUDE USING gist (
            room_id WITH =,
            tstzrange(start_at, end_at, '[)') WITH &&
        )
        WHERE (status = 'confirmed');
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE bookings
        DROP CONSTRAINT no_overlapping_bookings;
    """)

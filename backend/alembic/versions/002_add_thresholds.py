"""Add min_threshold and max_threshold to topics

Revision ID: 002_add_thresholds
Revises: 001_initial_schema
Create Date: 2026-11-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_add_thresholds'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('topics', sa.Column('min_threshold', sa.Float(), nullable=True))
    op.add_column('topics', sa.Column('max_threshold', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('topics', 'max_threshold')
    op.drop_column('topics', 'min_threshold')


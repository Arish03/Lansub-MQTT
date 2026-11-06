"""Add rules and rule_execution_logs tables

Revision ID: 003_add_rules
Revises: 002_add_thresholds
Create Date: 2026-11-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_rules'
down_revision = '002_add_thresholds'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('condition_topic', sa.String(255), nullable=False),
        sa.Column('operator', sa.String(10), nullable=False),
        sa.Column('threshold_value', sa.Float(), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), default=0, nullable=False),
        sa.Column('action_type', sa.String(50), default='both', nullable=False),
        sa.Column('target_broker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('brokers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('target_topic', sa.String(255), nullable=True),
        sa.Column('target_payload', sa.String(255), nullable=True),
        sa.Column('severity', sa.String(20), default='danger', nullable=False),
        sa.Column('enable_toast', sa.Boolean(), default=True, nullable=False),
        sa.Column('enable_browser_push', sa.Boolean(), default=True, nullable=False),
        sa.Column('cooldown_seconds', sa.Integer(), default=60, nullable=False),
        sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_rules_user_id', 'rules', ['user_id'])

    op.create_table(
        'rule_execution_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('rules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rule_name', sa.String(100), nullable=False),
        sa.Column('triggered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('trigger_value', sa.Float(), nullable=True),
        sa.Column('action_taken', sa.String(500), nullable=True),
    )
    op.create_index('ix_rule_execution_logs_rule_id', 'rule_execution_logs', ['rule_id'])
    op.create_index('ix_rule_execution_logs_user_id', 'rule_execution_logs', ['user_id'])


def downgrade() -> None:
    op.drop_table('rule_execution_logs')
    op.drop_table('rules')


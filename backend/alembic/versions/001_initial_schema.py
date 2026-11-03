"""Initial schema for users, brokers, topics, messages, dashboards, widgets

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Brokers
    op.create_table(
        'brokers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('host', sa.String(length=255), nullable=False),
        sa.Column('port', sa.Integer(), nullable=False, server_default='1883'),
        sa.Column('username', sa.String(length=255), nullable=True),
        sa.Column('password_enc', sa.String(length=512), nullable=True),
        sa.Column('tls', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('client_id', sa.String(length=100), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
    )
    op.create_index('ix_brokers_user_id', 'brokers', ['user_id'])

    # Topics
    op.create_table(
        'topics',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('broker_id', UUID(as_uuid=True), sa.ForeignKey('brokers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pattern', sa.String(length=255), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=True),
        sa.Column('qos', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('payload_format', sa.String(length=20), nullable=False, server_default='json'),
        sa.Column('value_path', sa.String(length=100), nullable=True),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('retain_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_topics_user_id', 'topics', ['user_id'])
    op.create_index('ix_topics_broker_id', 'topics', ['broker_id'])

    # Messages
    op.create_table(
        'messages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('topic_id', UUID(as_uuid=True), sa.ForeignKey('topics.id', ondelete='CASCADE'), nullable=False),
        sa.Column('topic', sa.String(length=255), nullable=False),
        sa.Column('ts', sa.DateTime(timezone=True), nullable=False),
        sa.Column('payload', JSONB(), nullable=True),
        sa.Column('value', sa.Float(), nullable=True),
    )
    op.create_index('ix_messages_topic_id', 'messages', ['topic_id'])
    op.create_index('ix_messages_ts', 'messages', ['ts'])
    op.create_index('idx_messages_topic_id_ts_desc', 'messages', ['topic_id', sa.text('ts DESC')])

    # Dashboards
    op.create_table(
        'dashboards',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('layout', JSONB(), nullable=True),
    )
    op.create_index('ix_dashboards_user_id', 'dashboards', ['user_id'])

    # Widgets
    op.create_table(
        'widgets',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('dashboard_id', UUID(as_uuid=True), sa.ForeignKey('dashboards.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('topic_id', UUID(as_uuid=True), sa.ForeignKey('topics.id', ondelete='SET NULL'), nullable=True),
        sa.Column('config', JSONB(), nullable=True),
        sa.Column('position', JSONB(), nullable=True),
    )
    op.create_index('ix_widgets_dashboard_id', 'widgets', ['dashboard_id'])


def downgrade() -> None:
    op.drop_table('widgets')
    op.drop_table('dashboards')
    op.drop_table('messages')
    op.drop_table('topics')
    op.drop_table('brokers')
    op.drop_table('users')

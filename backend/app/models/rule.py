import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db import Base


class Rule(Base):
    __tablename__ = "rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)

    # Condition
    condition_topic = Column(String(255), nullable=False)  # e.g. "sensor/temperature"
    operator = Column(String(10), nullable=False)          # ">", "<", ">=", "<=", "==", "!="
    threshold_value = Column(Float, nullable=False)        # e.g. 35.0
    duration_seconds = Column(Integer, default=0, nullable=False)  # 0 for immediate, 120 for 2 min

    # Automated Fail-Safe Action
    action_type = Column(String(50), default="both", nullable=False)  # "publish_mqtt" | "notify_only" | "both"
    target_broker_id = Column(UUID(as_uuid=True), ForeignKey("brokers.id", ondelete="SET NULL"), nullable=True)
    target_topic = Column(String(255), nullable=True)      # e.g. "control/relay1"
    target_payload = Column(String(255), nullable=True)    # e.g. "OFF"

    # Notification settings
    severity = Column(String(20), default="danger", nullable=False)  # "info" | "warning" | "danger"
    enable_toast = Column(Boolean, default=True, nullable=False)
    enable_browser_push = Column(Boolean, default=True, nullable=False)

    # Cooldown anti-spam
    cooldown_seconds = Column(Integer, default=60, nullable=False)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="rules")
    logs = relationship("RuleExecutionLog", back_populates="rule", cascade="all, delete-orphan")


class RuleExecutionLog(Base):
    __tablename__ = "rule_execution_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("rules.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_name = Column(String(100), nullable=False)
    triggered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    trigger_value = Column(Float, nullable=True)
    action_taken = Column(String(500), nullable=True)

    rule = relationship("Rule", back_populates="logs")

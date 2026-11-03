import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db import Base


class Topic(Base):
    __tablename__ = "topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    broker_id = Column(UUID(as_uuid=True), ForeignKey("brokers.id", ondelete="CASCADE"), nullable=False, index=True)
    pattern = Column(String(255), nullable=False)  # supports + and #
    label = Column(String(100), nullable=True)
    qos = Column(Integer, default=0, nullable=False)
    payload_format = Column(String(20), default="json", nullable=False)  # json | text | number
    value_path = Column(String(100), nullable=True)  # e.g. "$.temp"
    unit = Column(String(50), nullable=True)  # e.g. "°C", "RPM"
    min_threshold = Column(Float, nullable=True)  # Low alert bound
    max_threshold = Column(Float, nullable=True)  # High alert bound
    retain_days = Column(Integer, default=7, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="topics")
    broker = relationship("Broker", back_populates="topics")
    messages = relationship("Message", back_populates="topic_rel", cascade="all, delete-orphan")
    widgets = relationship("Widget", back_populates="topic_rel")

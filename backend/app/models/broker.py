import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db import Base


class Broker(Base):
    __tablename__ = "brokers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=1883, nullable=False)
    username = Column(String(255), nullable=True)
    password_enc = Column(String(512), nullable=True)  # Fernet encrypted
    tls = Column(Boolean, default=False, nullable=False)
    client_id = Column(String(100), nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="brokers")
    topics = relationship("Topic", back_populates="broker", cascade="all, delete-orphan")

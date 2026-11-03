from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime


class TopicCreate(BaseModel):
    broker_id: UUID
    pattern: str = Field(..., min_length=1, max_length=255)
    label: Optional[str] = None
    qos: int = Field(default=0, ge=0, le=2)
    payload_format: Literal["json", "text", "number"] = "json"
    value_path: Optional[str] = None
    unit: Optional[str] = None
    min_threshold: Optional[float] = None
    max_threshold: Optional[float] = None
    retain_days: int = Field(default=7, ge=1, le=365)
    enabled: bool = True


class TopicUpdate(BaseModel):
    pattern: Optional[str] = None
    label: Optional[str] = None
    qos: Optional[int] = None
    payload_format: Optional[Literal["json", "text", "number"]] = None
    value_path: Optional[str] = None
    unit: Optional[str] = None
    min_threshold: Optional[float] = None
    max_threshold: Optional[float] = None
    retain_days: Optional[int] = None
    enabled: Optional[bool] = None


class TopicOut(BaseModel):
    id: UUID
    user_id: UUID
    broker_id: UUID
    pattern: str
    label: Optional[str] = None
    qos: int
    payload_format: str
    value_path: Optional[str] = None
    unit: Optional[str] = None
    min_threshold: Optional[float] = None
    max_threshold: Optional[float] = None
    retain_days: int
    enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

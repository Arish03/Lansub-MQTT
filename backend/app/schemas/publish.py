from pydantic import BaseModel, Field
from typing import Optional, Any
from uuid import UUID


class PublishRequest(BaseModel):
    broker_id: UUID
    topic: str = Field(..., min_length=1)
    payload: Any
    qos: int = Field(default=0, ge=0, le=2)
    retain: bool = False


class PublishResponse(BaseModel):
    success: bool
    message: str

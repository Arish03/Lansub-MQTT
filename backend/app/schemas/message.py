from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


class MessageOut(BaseModel):
    id: UUID
    topic_id: UUID
    topic: str
    ts: datetime
    payload: Any
    value: Optional[float] = None

    class Config:
        from_attributes = True

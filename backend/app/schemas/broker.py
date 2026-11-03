from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class BrokerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    host: str = Field(..., min_length=1)
    port: int = Field(default=1883, ge=1, le=65535)
    username: Optional[str] = None
    password: Optional[str] = None
    tls: bool = False
    client_id: Optional[str] = None
    enabled: bool = True


class BrokerUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    tls: Optional[bool] = None
    client_id: Optional[str] = None
    enabled: Optional[bool] = None


class BrokerOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    host: str
    port: int
    username: Optional[str] = None
    tls: bool
    client_id: Optional[str] = None
    enabled: bool
    status: Optional[str] = "disconnected"

    class Config:
        from_attributes = True


class BrokerTestRequest(BaseModel):
    host: str
    port: int = 1883
    username: Optional[str] = None
    password: Optional[str] = None
    tls: bool = False


class BrokerTestResponse(BaseModel):
    success: bool
    message: str

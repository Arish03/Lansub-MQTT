from datetime import datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field


class RuleBase(BaseModel):
    name: str = Field(..., max_length=100)
    enabled: bool = True
    condition_topic: str = Field(..., max_length=255)
    operator: Literal[">", "<", ">=", "<=", "==", "!="] = ">"
    threshold_value: float
    duration_seconds: int = Field(default=0, ge=0)
    action_type: Literal["publish_mqtt", "notify_only", "both"] = "both"
    target_broker_id: Optional[UUID] = None
    target_topic: Optional[str] = Field(default=None, max_length=255)
    target_payload: Optional[str] = Field(default=None, max_length=255)
    severity: Literal["info", "warning", "danger"] = "danger"
    enable_toast: bool = True
    enable_browser_push: bool = True
    cooldown_seconds: int = Field(default=60, ge=1)


class RuleCreate(RuleBase):
    pass


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    enabled: Optional[bool] = None
    condition_topic: Optional[str] = None
    operator: Optional[Literal[">", "<", ">=", "<=", "==", "!="]] = None
    threshold_value: Optional[float] = None
    duration_seconds: Optional[int] = None
    action_type: Optional[Literal["publish_mqtt", "notify_only", "both"]] = None
    target_broker_id: Optional[UUID] = None
    target_topic: Optional[str] = None
    target_payload: Optional[str] = None
    severity: Optional[Literal["info", "warning", "danger"]] = None
    enable_toast: Optional[bool] = None
    enable_browser_push: Optional[bool] = None
    cooldown_seconds: Optional[int] = None


class RuleOut(RuleBase):
    id: UUID
    user_id: UUID
    last_triggered_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RuleLogOut(BaseModel):
    id: UUID
    rule_id: UUID
    user_id: UUID
    rule_name: str
    triggered_at: datetime
    trigger_value: Optional[float] = None
    action_taken: Optional[str] = None

    class Config:
        from_attributes = True

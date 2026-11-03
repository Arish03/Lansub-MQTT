from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from uuid import UUID


class WidgetCreate(BaseModel):
    type: str = Field(..., description="line | gauge | stat | table | switch | button")
    topic_id: Optional[UUID] = None
    config: Optional[Dict[str, Any]] = None
    position: Optional[Dict[str, Any]] = None


class WidgetUpdate(BaseModel):
    type: Optional[str] = None
    topic_id: Optional[UUID] = None
    config: Optional[Dict[str, Any]] = None
    position: Optional[Dict[str, Any]] = None


class WidgetOut(BaseModel):
    id: UUID
    dashboard_id: UUID
    type: str
    topic_id: Optional[UUID] = None
    config: Optional[Dict[str, Any]] = None
    position: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class DashboardCreate(BaseModel):
    name: str = Field(default="Main Dashboard", min_length=1)
    layout: Optional[Dict[str, Any]] = None


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None


class DashboardOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    layout: Optional[Dict[str, Any]] = None
    widgets: List[WidgetOut] = []

    class Config:
        from_attributes = True

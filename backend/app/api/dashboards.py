from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.user import User
from app.models.dashboard import Dashboard, Widget
from app.schemas.dashboard import (
    DashboardOut, WidgetCreate, WidgetUpdate, WidgetOut
)
from app.services.security import get_current_user

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("", response_model=DashboardOut)
async def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.widgets))
        .where(Dashboard.user_id == current_user.id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        # Provision default dashboard
        dashboard = Dashboard(
            user_id=current_user.id,
            name="Main Dashboard",
            layout={"cols": 3}
        )
        db.add(dashboard)
        await db.commit()
        await db.refresh(dashboard)
        dashboard.widgets = []

    return dashboard


@router.post("/widgets", response_model=WidgetOut, status_code=status.HTTP_201_CREATED)
async def create_widget(
    req: WidgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res_d = await db.execute(
        select(Dashboard).where(Dashboard.user_id == current_user.id)
    )
    dashboard = res_d.scalar_one_or_none()
    if not dashboard:
        dashboard = Dashboard(user_id=current_user.id, name="Main Dashboard", layout={"cols": 3})
        db.add(dashboard)
        await db.commit()
        await db.refresh(dashboard)

    widget = Widget(
        dashboard_id=dashboard.id,
        type=req.type,
        topic_id=req.topic_id,
        config=req.config or {},
        position=req.position or {},
    )
    db.add(widget)
    await db.commit()
    await db.refresh(widget)
    return widget


@router.patch("/widgets/{widget_id}", response_model=WidgetOut)
async def update_widget(
    widget_id: UUID,
    req: WidgetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Widget)
        .join(Dashboard)
        .where(Widget.id == widget_id, Dashboard.user_id == current_user.id)
    )
    widget = result.scalar_one_or_none()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if req.type is not None:
        widget.type = req.type
    if req.topic_id is not None:
        widget.topic_id = req.topic_id
    if req.config is not None:
        widget.config = req.config
    if req.position is not None:
        widget.position = req.position

    await db.commit()
    await db.refresh(widget)
    return widget


@router.delete("/widgets/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_widget(
    widget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Widget)
        .join(Dashboard)
        .where(Widget.id == widget_id, Dashboard.user_id == current_user.id)
    )
    widget = result.scalar_one_or_none()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    await db.delete(widget)
    await db.commit()
    return None

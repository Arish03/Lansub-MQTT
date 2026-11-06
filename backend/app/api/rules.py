from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db import get_db
from app.models.user import User
from app.models.rule import Rule, RuleExecutionLog
from app.schemas.rule import RuleCreate, RuleUpdate, RuleOut, RuleLogOut
from app.services.security import get_current_user

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("", response_model=List[RuleOut])
async def list_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Rule).where(Rule.user_id == current_user.id).order_by(Rule.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(
    req: RuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rule = Rule(
        user_id=current_user.id,
        name=req.name,
        enabled=req.enabled,
        condition_topic=req.condition_topic,
        operator=req.operator,
        threshold_value=req.threshold_value,
        duration_seconds=req.duration_seconds,
        action_type=req.action_type,
        target_broker_id=req.target_broker_id,
        target_topic=req.target_topic,
        target_payload=req.target_payload,
        severity=req.severity,
        enable_toast=req.enable_toast,
        enable_browser_push=req.enable_browser_push,
        cooldown_seconds=req.cooldown_seconds,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.get("/logs", response_model=List[RuleLogOut])
async def list_rule_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RuleExecutionLog)
        .where(RuleExecutionLog.user_id == current_user.id)
        .order_by(desc(RuleExecutionLog.triggered_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{rule_id}", response_model=RuleOut)
async def get_rule(
    rule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Rule).where(Rule.id == rule_id, Rule.user_id == current_user.id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/{rule_id}", response_model=RuleOut)
async def update_rule(
    rule_id: UUID,
    req: RuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Rule).where(Rule.id == rule_id, Rule.user_id == current_user.id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    await db.commit()
    await db.refresh(rule)
    return rule


@router.post("/{rule_id}/toggle", response_model=RuleOut)
async def toggle_rule(
    rule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Rule).where(Rule.id == rule_id, Rule.user_id == current_user.id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.enabled = not rule.enabled
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Rule).where(Rule.id == rule_id, Rule.user_id == current_user.id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    await db.delete(rule)
    await db.commit()
    return None

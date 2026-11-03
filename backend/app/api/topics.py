from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.user import User
from app.models.broker import Broker
from app.models.topic import Topic
from app.schemas.topic import TopicCreate, TopicUpdate, TopicOut
from app.services.security import get_current_user
from app.mqtt.manager import mqtt_manager

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("", response_model=List[TopicOut])
async def list_topics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Topic).where(Topic.user_id == current_user.id))
    return result.scalars().all()


@router.post("", response_model=TopicOut, status_code=status.HTTP_201_CREATED)
async def create_topic(
    req: TopicCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user owns the broker
    res_b = await db.execute(
        select(Broker).where(Broker.id == req.broker_id, Broker.user_id == current_user.id)
    )
    broker = res_b.scalar_one_or_none()
    if not broker:
        raise HTTPException(status_code=400, detail="Broker not found or not owned by user")

    topic = Topic(
        user_id=current_user.id,
        broker_id=req.broker_id,
        pattern=req.pattern,
        label=req.label,
        qos=req.qos,
        payload_format=req.payload_format,
        value_path=req.value_path,
        unit=req.unit,
        min_threshold=req.min_threshold,
        max_threshold=req.max_threshold,
        retain_days=req.retain_days,
        enabled=req.enabled,
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)

    # Dynamically notify MQTT manager to update subscriptions
    await mqtt_manager.refresh_topics_for_broker(topic.broker_id)

    return topic


@router.get("/{topic_id}", response_model=TopicOut)
async def get_topic(
    topic_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Topic).where(Topic.id == topic_id, Topic.user_id == current_user.id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.patch("/{topic_id}", response_model=TopicOut)
async def update_topic(
    topic_id: UUID,
    req: TopicUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Topic).where(Topic.id == topic_id, Topic.user_id == current_user.id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    if req.pattern is not None:
        topic.pattern = req.pattern
    if req.label is not None:
        topic.label = req.label
    if req.qos is not None:
        topic.qos = req.qos
    if req.payload_format is not None:
        topic.payload_format = req.payload_format
    if req.value_path is not None:
        topic.value_path = req.value_path
    if req.unit is not None:
        topic.unit = req.unit
    if req.min_threshold is not None:
        topic.min_threshold = req.min_threshold
    if req.max_threshold is not None:
        topic.max_threshold = req.max_threshold
    if req.retain_days is not None:
        topic.retain_days = req.retain_days
    if req.enabled is not None:
        topic.enabled = req.enabled

    await db.commit()
    await db.refresh(topic)

    await mqtt_manager.refresh_topics_for_broker(topic.broker_id)
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Topic).where(Topic.id == topic_id, Topic.user_id == current_user.id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    broker_id = topic.broker_id
    await db.delete(topic)
    await db.commit()

    await mqtt_manager.refresh_topics_for_broker(broker_id)
    return None

import csv
import io
import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.user import User
from app.models.topic import Topic
from app.models.message import Message
from app.schemas.message import MessageOut
from app.services.security import get_current_user

router = APIRouter(prefix="/topics", tags=["history"])


@router.get("/{topic_id}/history", response_model=List[MessageOut])
async def get_topic_history(
    topic_id: UUID,
    range: Optional[str] = Query(default="1h", description="1h | 24h | 7d | all"),
    limit: int = Query(default=500, ge=1, le=2000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user owns the topic
    res_t = await db.execute(
        select(Topic).where(Topic.id == topic_id, Topic.user_id == current_user.id)
    )
    topic = res_t.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found or access denied")

    query = select(Message).where(Message.topic_id == topic_id)

    now = datetime.now(timezone.utc)
    if range == "1h":
        query = query.where(Message.ts >= now - timedelta(hours=1))
    elif range == "24h":
        query = query.where(Message.ts >= now - timedelta(hours=24))
    elif range == "7d":
        query = query.where(Message.ts >= now - timedelta(days=7))

    query = query.order_by(Message.ts.desc()).limit(limit)

    result = await db.execute(query)
    messages = list(reversed(result.scalars().all()))
    return messages


@router.get("/{topic_id}/export-csv")
async def export_topic_csv(
    topic_id: UUID,
    range: Optional[str] = Query(default="24h", description="1h | 24h | 7d | all"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user owns the topic
    res_t = await db.execute(
        select(Topic).where(Topic.id == topic_id, Topic.user_id == current_user.id)
    )
    topic = res_t.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found or access denied")

    query = select(Message).where(Message.topic_id == topic_id)
    now = datetime.now(timezone.utc)
    if range == "1h":
        query = query.where(Message.ts >= now - timedelta(hours=1))
    elif range == "24h":
        query = query.where(Message.ts >= now - timedelta(hours=24))
    elif range == "7d":
        query = query.where(Message.ts >= now - timedelta(days=7))

    query = query.order_by(Message.ts.asc())
    result = await db.execute(query)
    messages = result.scalars().all()

    # Generate CSV stream
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp (UTC)", "Topic", "Extracted Value", "Raw Payload"])

    for m in messages:
        payload_str = json.dumps(m.payload) if isinstance(m.payload, (dict, list)) else str(m.payload)
        writer.writerow([
            m.ts.isoformat(),
            m.topic,
            m.value if m.value is not None else "",
            payload_str
        ])

    clean_name = topic.pattern.replace("/", "_").replace("#", "wildcard").replace("+", "plus")
    filename = f"{clean_name}_{range}_export.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

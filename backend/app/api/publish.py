import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.user import User
from app.models.broker import Broker
from app.schemas.publish import PublishRequest, PublishResponse
from app.services.security import get_current_user
from app.mqtt.manager import mqtt_manager

router = APIRouter(prefix="/publish", tags=["publish"])


@router.post("", response_model=PublishResponse)
async def publish_message(
    req: PublishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify the user owns the broker
    result = await db.execute(
        select(Broker).where(Broker.id == req.broker_id, Broker.user_id == current_user.id)
    )
    broker = result.scalar_one_or_none()
    if not broker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Broker not found or not owned by user."
        )

    # Format payload string
    if isinstance(req.payload, (dict, list)):
        payload_str = json.dumps(req.payload)
    elif isinstance(req.payload, bool):
        payload_str = "ON" if req.payload else "OFF"
    else:
        payload_str = str(req.payload)

    try:
        await mqtt_manager.publish(
            broker_id=broker.id,
            topic=req.topic,
            payload=payload_str,
            qos=req.qos,
            retain=req.retain
        )
        return PublishResponse(
            success=True,
            message=f"Published to '{req.topic}' on broker '{broker.name}' successfully."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish message: {str(e)}"
        )

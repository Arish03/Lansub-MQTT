import ssl
from typing import List
from uuid import UUID
import importlib
try:
    aiomqtt = importlib.import_module("aiomqtt")
except Exception:
    aiomqtt = None
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.user import User
from app.models.broker import Broker
from app.schemas.broker import (
    BrokerCreate, BrokerUpdate, BrokerOut, BrokerTestRequest, BrokerTestResponse
)
from app.services.security import get_current_user, encrypt_secret
from app.mqtt.manager import mqtt_manager

router = APIRouter(prefix="/brokers", tags=["brokers"])


@router.get("", response_model=List[BrokerOut])
async def list_brokers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Broker).where(Broker.user_id == current_user.id))
    brokers = result.scalars().all()
    out = []
    for b in brokers:
        item = BrokerOut.model_validate(b)
        item.status = mqtt_manager.get_status(b.id)
        out.append(item)
    return out


@router.post("", response_model=BrokerOut, status_code=status.HTTP_201_CREATED)
async def create_broker(
    req: BrokerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    broker = Broker(
        user_id=current_user.id,
        name=req.name,
        host=req.host,
        port=req.port,
        username=req.username,
        password_enc=encrypt_secret(req.password) if req.password else None,
        tls=req.tls,
        client_id=req.client_id,
        enabled=req.enabled,
    )
    db.add(broker)
    await db.commit()
    await db.refresh(broker)

    if broker.enabled:
        await mqtt_manager.start_or_update_broker(broker)

    out = BrokerOut.model_validate(broker)
    out.status = mqtt_manager.get_status(broker.id)
    return out


@router.get("/{broker_id}", response_model=BrokerOut)
async def get_broker(
    broker_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Broker).where(Broker.id == broker_id, Broker.user_id == current_user.id)
    )
    broker = result.scalar_one_or_none()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")

    out = BrokerOut.model_validate(broker)
    out.status = mqtt_manager.get_status(broker.id)
    return out


@router.patch("/{broker_id}", response_model=BrokerOut)
async def update_broker(
    broker_id: UUID,
    req: BrokerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Broker).where(Broker.id == broker_id, Broker.user_id == current_user.id)
    )
    broker = result.scalar_one_or_none()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")

    if req.name is not None:
        broker.name = req.name
    if req.host is not None:
        broker.host = req.host
    if req.port is not None:
        broker.port = req.port
    if req.username is not None:
        broker.username = req.username
    if req.password is not None:
        broker.password_enc = encrypt_secret(req.password)
    if req.tls is not None:
        broker.tls = req.tls
    if req.client_id is not None:
        broker.client_id = req.client_id
    if req.enabled is not None:
        broker.enabled = req.enabled

    await db.commit()
    await db.refresh(broker)

    if broker.enabled:
        await mqtt_manager.start_or_update_broker(broker)
    else:
        await mqtt_manager.remove_broker(broker.id)

    out = BrokerOut.model_validate(broker)
    out.status = mqtt_manager.get_status(broker.id)
    return out


@router.delete("/{broker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_broker(
    broker_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Broker).where(Broker.id == broker_id, Broker.user_id == current_user.id)
    )
    broker = result.scalar_one_or_none()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")

    await mqtt_manager.remove_broker(broker.id)
    await db.delete(broker)
    await db.commit()
    return None


@router.post("/test", response_model=BrokerTestResponse)
async def test_broker_connection(
    req: BrokerTestRequest,
    current_user: User = Depends(get_current_user)
):
    if aiomqtt is None:
        return BrokerTestResponse(success=False, message="aiomqtt is not installed in the environment.")

    tls_ctx = None
    if req.tls:
        tls_ctx = ssl.create_default_context()
        tls_ctx.check_hostname = False
        tls_ctx.verify_mode = ssl.CERT_NONE

    try:
        async with aiomqtt.Client(
            hostname=req.host,
            port=req.port,
            username=req.username or None,
            password=req.password or None,
            tls_context=tls_ctx,
            timeout=5,
        ) as client:
            pass
        return BrokerTestResponse(success=True, message=f"Successfully connected to {req.host}:{req.port}")
    except Exception as e:
        msg = f"Connection failed: {str(e)}"
        if req.host.lower() in ("localhost", "127.0.0.1"):
            msg += ". Note: Inside Docker, use 'mosquitto' for the bundled broker (port 1883, TLS off) or 'host.docker.internal' for host machine."
        return BrokerTestResponse(success=False, message=msg)

import logging
from contextlib import asynccontextmanager
from uuid import UUID
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import init_db
from app.api import api_router
from app.services.ingest import ingest_service
from app.services.retention import retention_worker
from app.mqtt.manager import mqtt_manager
from app.ws.hub import ws_hub
from app.services.security import decode_token
from app.services.seed import seed_initial_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables...")
    try:
        await init_db()
    except Exception as e:
        logger.warning(f"Database init check: {e}")

    logger.info("Seeding initial administrator and default broker/topics...")
    try:
        await seed_initial_data()
    except Exception as e:
        logger.warning(f"Data seeding check: {e}")

    logger.info("Starting ingest service queue...")
    await ingest_service.start()

    logger.info("Starting MQTT Manager workers...")
    try:
        await mqtt_manager.start()
    except Exception as e:
        logger.error(f"Error starting MQTT manager: {e}")

    logger.info("Starting Data Retention cleanup worker...")
    await retention_worker.start()

    yield

    logger.info("Shutting down retention worker...")
    await retention_worker.stop()

    logger.info("Shutting down MQTT manager...")
    await mqtt_manager.stop()

    logger.info("Flushing ingest queue...")
    await ingest_service.stop()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title="Realtime MQTT Dashboard API",
    description="Backend service providing MQTT multi-broker ingestion, WebSocket streaming, and REST APIs.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(api_router)


@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "active_mqtt_workers": len(mqtt_manager.workers),
        "ws_connections": len(ws_hub.connections),
    }


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_uuid = UUID(payload["sub"])
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    conn = await ws_hub.connect(websocket, user_uuid)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            if action == "subscribe":
                topics = data.get("topics", [])
                ws_hub.subscribe(websocket, topics)
                await websocket.send_json({"type": "subscribed", "topics": list(conn.subscriptions)})
            elif action == "unsubscribe":
                topics = data.get("topics", [])
                ws_hub.unsubscribe(websocket, topics)
                await websocket.send_json({"type": "unsubscribed", "topics": topics})
            elif action == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket client error: {e}")
        ws_hub.disconnect(websocket)

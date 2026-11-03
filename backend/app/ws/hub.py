import json
import logging
from typing import Dict, Set, Optional, Any
from uuid import UUID
from fastapi import WebSocket
from app.mqtt.matcher import topic_matches

logger = logging.getLogger("ws_hub")


class ClientConnection:
    def __init__(self, websocket: WebSocket, user_id: UUID):
        self.websocket = websocket
        self.user_id = user_id
        self.subscriptions: Set[str] = set()


class WebSocketHub:
    def __init__(self):
        # Maps WebSocket connection to ClientConnection object
        self.connections: Dict[WebSocket, ClientConnection] = {}

    async def connect(self, websocket: WebSocket, user_id: UUID) -> ClientConnection:
        await websocket.accept()
        conn = ClientConnection(websocket, user_id)
        self.connections[websocket] = conn
        logger.info(f"WebSocket client connected: user_id={user_id}")
        return conn

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            conn = self.connections.pop(websocket)
            logger.info(f"WebSocket client disconnected: user_id={conn.user_id}")

    def subscribe(self, websocket: WebSocket, patterns: list[str]):
        conn = self.connections.get(websocket)
        if conn:
            for pat in patterns:
                conn.subscriptions.add(pat)

    def unsubscribe(self, websocket: WebSocket, patterns: list[str]):
        conn = self.connections.get(websocket)
        if conn:
            for pat in patterns:
                conn.subscriptions.discard(pat)

    async def broadcast_message(
        self,
        owner_user_id: UUID,
        topic: str,
        payload: Any,
        value: Optional[float],
        ts_iso: str,
        alert: Optional[str] = None
    ):
        """
        Fan-out message strictly to connected clients belonging to owner_user_id
        whose subscriptions match the published topic.
        """
        message_data = {
            "type": "message",
            "topic": topic,
            "payload": payload,
            "value": value,
            "ts": ts_iso,
            "alert": alert,
        }
        raw_msg = json.dumps(message_data)

        stale_clients = []
        for ws, conn in list(self.connections.items()):
            # Strictly verify user isolation
            if conn.user_id != owner_user_id:
                continue

            # If user subscribed to this topic or pattern (or all topics if subscriptions empty)
            matches = any(topic_matches(pat, topic) for pat in conn.subscriptions) if conn.subscriptions else True
            if matches:
                try:
                    await ws.send_text(raw_msg)
                except Exception as e:
                    logger.debug(f"Failed to send to WS client: {e}")
                    stale_clients.append(ws)

        for ws in stale_clients:
            self.disconnect(ws)

    async def broadcast_broker_status(self, owner_user_id: UUID, broker_id: str, status: str):
        status_msg = json.dumps({
            "type": "broker_status",
            "broker_id": broker_id,
            "status": status,
        })
        for ws, conn in list(self.connections.items()):
            if conn.user_id == owner_user_id:
                try:
                    await ws.send_text(status_msg)
                except Exception:
                    pass


ws_hub = WebSocketHub()

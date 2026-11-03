import asyncio
import json
import logging
import ssl
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Set
from uuid import UUID
import importlib
try:
    aiomqtt = importlib.import_module("aiomqtt")
except Exception:
    aiomqtt = None
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models.broker import Broker
from app.models.topic import Topic
from app.services.security import decrypt_secret
from app.services.ingest import ingest_service
from app.ws.hub import ws_hub
from app.mqtt.matcher import topic_matches

logger = logging.getLogger("mqtt_manager")


class BrokerClientWorker:
    """
    Manages a single persistent MQTT connection to a broker with automatic
    reconnect, dynamic subscription updates, message ingestion, and fan-out.
    """
    def __init__(
        self,
        broker_id: UUID,
        user_id: UUID,
        host: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None,
        use_tls: bool = False,
        client_id: Optional[str] = None,
    ):
        self.broker_id = broker_id
        self.user_id = user_id
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.client_id = client_id or f"lansub_{broker_id.hex[:8]}"

        self.subscribed_topics: Set[str] = set()
        self.status = "disconnected"
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._client: Optional[aiomqtt.Client] = None
        self._publish_queue: asyncio.Queue = asyncio.Queue()

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.status = "disconnected"

    async def update_subscriptions(self, patterns: Set[str]):
        """Update active subscriptions at runtime."""
        self.subscribed_topics = patterns
        if self._client and self.status == "connected":
            for pat in patterns:
                try:
                    await self._client.subscribe(pat)
                except Exception as e:
                    logger.error(f"Error subscribing to {pat} on broker {self.broker_id}: {e}")

    async def enqueue_publish(self, topic: str, payload: str, qos: int = 0, retain: bool = False):
        await self._publish_queue.put({
            "topic": topic,
            "payload": payload,
            "qos": qos,
            "retain": retain
        })

    def _create_tls_context(self) -> Optional[ssl.SSLContext]:
        if not self.use_tls:
            return None
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        return context

    async def _run_loop(self):
        if aiomqtt is None:
            logger.warning("aiomqtt is not installed in the current environment.")
            self.status = "disconnected"
            return

        backoff = 1
        while self._running:
            try:
                self.status = "connecting"
                await ws_hub.broadcast_broker_status(self.user_id, str(self.broker_id), "connecting")
                tls_ctx = self._create_tls_context()

                async with aiomqtt.Client(
                    hostname=self.host,
                    port=self.port,
                    username=self.username or None,
                    password=self.password or None,
                    identifier=self.client_id,
                    tls_context=tls_ctx,
                    timeout=10,
                ) as client:
                    self._client = client
                    self.status = "connected"
                    backoff = 1  # reset backoff on successful connect
                    logger.info(f"Connected to broker {self.host}:{self.port} (ID: {self.broker_id})")
                    await ws_hub.broadcast_broker_status(self.user_id, str(self.broker_id), "connected")

                    # Subscribe to all current topic patterns
                    for pattern in self.subscribed_topics:
                        try:
                            await client.subscribe(pattern)
                            logger.info(f"Subscribed to {pattern} on {self.host}")
                        except Exception as e:
                            logger.error(f"Failed to subscribe to {pattern}: {e}")

                    # Spawn publisher drain task
                    pub_task = asyncio.create_task(self._drain_publisher(client))

                    # Process incoming messages
                    try:
                        async for message in client.messages:
                            await self._handle_incoming_message(message)
                    finally:
                        pub_task.cancel()

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.status = "disconnected"
                logger.warning(f"Broker connection {self.broker_id} ({self.host}) failed: {e}. Retrying in {backoff}s...")
                await ws_hub.broadcast_broker_status(self.user_id, str(self.broker_id), "disconnected")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)
            finally:
                self._client = None

    async def _drain_publisher(self, client: Any):
        while self._running:
            try:
                msg = await self._publish_queue.get()
                await client.publish(
                    topic=msg["topic"],
                    payload=msg["payload"],
                    qos=msg.get("qos", 0),
                    retain=msg.get("retain", False)
                )
                self._publish_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error publishing to {msg.get('topic')}: {e}")

    async def _handle_incoming_message(self, message: Any):
        topic_str = str(message.topic)
        payload_bytes = message.payload if isinstance(message.payload, bytes) else bytes(str(message.payload), "utf-8")
        logger.info(f"Incoming MQTT packet: broker={self.broker_id} topic={topic_str} size={len(payload_bytes)}B")

        # Query configured topics for this broker to apply value extraction
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Topic).where(Topic.broker_id == self.broker_id, Topic.enabled == True)
            )
            configured_topics = result.scalars().all()
            matching_topics = [
                t for t in configured_topics
                if topic_matches(t.pattern, topic_str)
            ]

        if matching_topics:
            for topic_entity in matching_topics:
                item = await ingest_service.push(
                    topic_id=topic_entity.id,
                    topic=topic_str,
                    payload_raw=payload_bytes,
                    payload_format=topic_entity.payload_format,
                    value_path=topic_entity.value_path
                )
                # Compute threshold alert state
                alert_status = None
                val = item.get("value")
                if val is not None:
                    if getattr(topic_entity, "max_threshold", None) is not None and val > topic_entity.max_threshold:
                        alert_status = "high"
                    elif getattr(topic_entity, "min_threshold", None) is not None and val < topic_entity.min_threshold:
                        alert_status = "low"

                # Fan-out to connected user WebSocket clients
                await ws_hub.broadcast_message(
                    owner_user_id=self.user_id,
                    topic=topic_str,
                    payload=item["payload"],
                    value=item["value"],
                    ts_iso=item["ts"].isoformat(),
                    alert=alert_status
                )
        else:
            # Resilient fallback: Broadcast raw packet to WebSocket so user sees it in Live Stream!
            raw_str = payload_bytes.decode("utf-8", errors="replace").strip()
            parsed_payload: Any = None
            extracted_val: Optional[float] = None
            try:
                parsed_payload = json.loads(raw_str)
                if isinstance(parsed_payload, dict):
                    for k in ("value", "val", "temp", "temperature", "reading", "metric", "data"):
                        if k in parsed_payload and isinstance(parsed_payload[k], (int, float)):
                            extracted_val = float(parsed_payload[k])
                            break
            except Exception:
                parsed_payload = raw_str

            if extracted_val is None:
                try:
                    extracted_val = float(raw_str)
                except Exception:
                    pass

            await ws_hub.broadcast_message(
                owner_user_id=self.user_id,
                topic=topic_str,
                payload=parsed_payload if isinstance(parsed_payload, (dict, list)) else {"value": parsed_payload},
                value=extracted_val,
                ts_iso=datetime.now(timezone.utc).isoformat()
            )


class MQTTManager:
    def __init__(self):
        self.workers: Dict[UUID, BrokerClientWorker] = {}

    async def start(self):
        logger.info("Starting MQTTManager and initializing active brokers...")
        await self.reload_all_brokers()

    async def stop(self):
        logger.info("Stopping all MQTT workers...")
        for worker in list(self.workers.values()):
            await worker.stop()
        self.workers.clear()

    async def reload_all_brokers(self):
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Broker).where(Broker.enabled == True))
            brokers = result.scalars().all()

            for broker in brokers:
                await self.start_or_update_broker(broker)

    async def start_or_update_broker(self, broker: Broker):
        decrypted_pass = decrypt_secret(broker.password_enc) if broker.password_enc else None

        # Fetch active topic patterns
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Topic.pattern).where(Topic.broker_id == broker.id, Topic.enabled == True)
            )
            patterns = set(result.scalars().all())

        if broker.id in self.workers:
            worker = self.workers[broker.id]
            worker.host = broker.host
            worker.port = broker.port
            worker.username = broker.username
            worker.password = decrypted_pass
            worker.use_tls = broker.tls
            await worker.update_subscriptions(patterns)
        else:
            worker = BrokerClientWorker(
                broker_id=broker.id,
                user_id=broker.user_id,
                host=broker.host,
                port=broker.port,
                username=broker.username,
                password=decrypted_pass,
                use_tls=broker.tls,
                client_id=broker.client_id,
            )
            worker.subscribed_topics = patterns
            self.workers[broker.id] = worker
            worker.start()

    async def remove_broker(self, broker_id: UUID):
        if broker_id in self.workers:
            worker = self.workers.pop(broker_id)
            await worker.stop()

    async def refresh_topics_for_broker(self, broker_id: UUID):
        if broker_id in self.workers:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Topic.pattern).where(Topic.broker_id == broker_id, Topic.enabled == True)
                )
                patterns = set(result.scalars().all())
            await self.workers[broker_id].update_subscriptions(patterns)

    async def publish(self, broker_id: UUID, topic: str, payload: str, qos: int = 0, retain: bool = False):
        if broker_id not in self.workers:
            raise ValueError(f"Broker {broker_id} is not active or connected.")
        await self.workers[broker_id].enqueue_publish(topic, payload, qos, retain)

    def get_status(self, broker_id: UUID) -> str:
        worker = self.workers.get(broker_id)
        return worker.status if worker else "inactive"


mqtt_manager = MQTTManager()

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import UUID
import importlib

parse = None
try:
    _jsonpath = importlib.import_module("jsonpath_ng")
    parse = getattr(_jsonpath, "parse", None)
except Exception:
    parse = None
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import AsyncSessionLocal
from app.models.message import Message

logger = logging.getLogger("ingest")


def extract_payload_and_value(
    payload_raw: bytes,
    payload_format: str,
    value_path: Optional[str] = None
) -> tuple:
    """
    Extracts structured payload and numeric metric from raw packet bytes.
    Pure synchronous function supporting JSON, JSONPath, numeric, and text.
    """
    raw_str = ""
    try:
        raw_str = payload_raw.decode("utf-8", errors="replace").strip()
    except Exception:
        raw_str = str(payload_raw)

    payload_obj: Any = None
    extracted_value: Optional[float] = None

    if payload_format == "json":
        try:
            payload_obj = json.loads(raw_str)
            if value_path and isinstance(payload_obj, dict):
                if parse is not None:
                    try:
                        expr = parse(value_path)
                        matches = expr.find(payload_obj)
                        if matches:
                            extracted_value = float(matches[0].value)
                    except Exception:
                        pass
                else:
                    clean_path = value_path.lstrip("$.").strip()
                    parts = clean_path.split(".")
                    curr = payload_obj
                    for p in parts:
                        if isinstance(curr, dict) and p in curr:
                            curr = curr[p]
                        else:
                            curr = None
                            break
                    if curr is not None:
                        try:
                            extracted_value = float(curr)
                        except Exception:
                            pass
            elif isinstance(payload_obj, (int, float)):
                extracted_value = float(payload_obj)
        except Exception:
            payload_obj = {"raw": raw_str}
    elif payload_format == "number":
        try:
            extracted_value = float(raw_str)
            payload_obj = extracted_value
        except Exception:
            payload_obj = {"raw": raw_str}
    else:  # text
        payload_obj = {"text": raw_str}

    final_payload = payload_obj if isinstance(payload_obj, (dict, list)) else {"value": payload_obj}
    return final_payload, extracted_value


class IngestService:
    def __init__(self, batch_size: int = 200, flush_interval: float = 0.5):
        self._queue: Optional[asyncio.Queue] = None
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self._task: Optional[asyncio.Task] = None
        self._running = False

    @property
    def queue(self) -> asyncio.Queue:
        if self._queue is None:
            self._queue = asyncio.Queue(maxsize=10000)
        return self._queue

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._worker())
        logger.info("IngestService background worker started.")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        # Flush any remaining items
        await self._flush_remaining()
        logger.info("IngestService stopped.")

    async def push(
        self,
        topic_id: UUID,
        topic: str,
        payload_raw: bytes,
        payload_format: str,
        value_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parse the message payload, extract numeric value if applicable,
        and enqueue for batch persistence.
        Returns parsed dict for immediate WebSocket broadcast.
        """
        payload_obj, extracted_value = extract_payload_and_value(payload_raw, payload_format, value_path)
        item = {
            "topic_id": topic_id,
            "topic": topic,
            "ts": datetime.now(timezone.utc),
            "payload": payload_obj,
            "value": extracted_value,
        }

        try:
            self.queue.put_nowait(item)
        except (asyncio.QueueFull, Exception):
            pass

        return item

    async def _worker(self):
        batch: List[Dict[str, Any]] = []
        last_flush = asyncio.get_event_loop().time()

        while self._running:
            try:
                # Wait for items or timeout for flush
                timeout = max(0.05, self.flush_interval - (asyncio.get_event_loop().time() - last_flush))
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout=timeout)
                    batch.append(item)
                    self.queue.task_done()
                except asyncio.TimeoutError:
                    pass

                now = asyncio.get_event_loop().time()
                if (len(batch) >= self.batch_size) or (batch and (now - last_flush >= self.flush_interval)):
                    await self._save_batch(batch)
                    batch = []
                    last_flush = now
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in ingest worker loop: {e}", exc_info=True)
                await asyncio.sleep(1)

        if batch:
            await self._save_batch(batch)

    async def _save_batch(self, batch: List[Dict[str, Any]]):
        if not batch:
            return
        async with AsyncSessionLocal() as session:
            try:
                messages = [
                    Message(
                        topic_id=b["topic_id"],
                        topic=b["topic"],
                        ts=b["ts"],
                        payload=b["payload"],
                        value=b["value"],
                    )
                    for b in batch
                ]
                session.add_all(messages)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Failed to batch insert {len(batch)} messages into DB: {e}")

    async def _flush_remaining(self):
        batch = []
        while not self.queue.empty():
            batch.append(self.queue.get_nowait())
            self.queue.task_done()
        if batch:
            await self._save_batch(batch)


ingest_service = IngestService()

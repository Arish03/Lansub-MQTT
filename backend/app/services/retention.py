import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, delete

from app.db import AsyncSessionLocal
from app.models.topic import Topic
from app.models.message import Message

logger = logging.getLogger("retention")


class RetentionWorker:
    """
    Background worker that periodically purges messages older than
    each topic's configured `retain_days`.
    """
    def __init__(self, check_interval_seconds: int = 3600):
        self.check_interval_seconds = check_interval_seconds
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            logger.info(f"Data retention worker started (interval: {self.check_interval_seconds}s).")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("Data retention worker stopped.")

    async def purge_once(self) -> int:
        """
        Executes a single cleanup run across all topics.
        Returns total number of deleted rows.
        """
        total_deleted = 0
        now = datetime.now(timezone.utc)

        async with AsyncSessionLocal() as session:
            try:
                # Query all topics with retention policies
                result = await session.execute(
                    select(Topic).where(Topic.retain_days > 0, Topic.enabled == True)
                )
                topics = result.scalars().all()

                for t in topics:
                    cutoff = now - timedelta(days=t.retain_days)
                    del_stmt = (
                        delete(Message)
                        .where(Message.topic_id == t.id, Message.ts < cutoff)
                    )
                    del_res = await session.execute(del_stmt)
                    deleted_count = del_res.rowcount or 0
                    if deleted_count > 0:
                        total_deleted += deleted_count
                        logger.info(f"Purged {deleted_count} messages older than {t.retain_days}d for topic {t.pattern} ({t.id})")

                if total_deleted > 0:
                    await session.commit()
                    logger.info(f"Data retention run completed: {total_deleted} total expired messages purged.")
            except Exception as e:
                await session.rollback()
                logger.error(f"Error during retention purge cycle: {e}")

        return total_deleted

    async def _loop(self):
        while self._running:
            try:
                # Run cleanup
                await self.purge_once()
                # Wait for next interval
                await asyncio.sleep(self.check_interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in retention loop: {e}")
                await asyncio.sleep(60)


retention_worker = RetentionWorker()


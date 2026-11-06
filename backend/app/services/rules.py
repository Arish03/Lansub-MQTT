import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from uuid import UUID

from sqlalchemy import select
from app.db import AsyncSessionLocal
from app.models.rule import Rule, RuleExecutionLog
from app.mqtt.matcher import topic_matches
from app.ws.hub import ws_hub

logger = logging.getLogger("rules_engine")


class RuleEngine:
    def __init__(self):
        # Maps rule_id -> timestamp (float) when condition first became true
        self._breach_start: Dict[UUID, float] = {}

    def _eval_condition(self, value: float, op: str, threshold: float) -> bool:
        if op == ">":
            return value > threshold
        if op == "<":
            return value < threshold
        if op == ">=":
            return value >= threshold
        if op == "<=":
            return value <= threshold
        if op == "==":
            return abs(value - threshold) < 1e-6
        if op == "!=":
            return abs(value - threshold) >= 1e-6
        return False

    async def evaluate(
        self,
        user_id: UUID,
        topic: str,
        value: Optional[float],
        mqtt_manager: Any
    ):
        if value is None or not isinstance(value, (int, float)):
            return

        numeric_val = float(value)
        now_epoch = time.time()
        now_dt = datetime.now(timezone.utc)

        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Rule).where(Rule.user_id == user_id, Rule.enabled == True)
                )
                user_rules = result.scalars().all()

                for rule in user_rules:
                    if not topic_matches(rule.condition_topic, topic):
                        continue

                    is_breached = self._eval_condition(numeric_val, rule.operator, rule.threshold_value)

                    if not is_breached:
                        # Reset duration timer if condition went back to normal
                        self._breach_start.pop(rule.id, None)
                        continue

                    # Condition is true! Check duration
                    if rule.duration_seconds > 0:
                        if rule.id not in self._breach_start:
                            self._breach_start[rule.id] = now_epoch

                        elapsed = now_epoch - self._breach_start[rule.id]
                        if elapsed < rule.duration_seconds:
                            # Not sustained long enough yet
                            continue

                    # Check cooldown
                    if rule.last_triggered_at:
                        diff_sec = (now_dt - rule.last_triggered_at).total_seconds()
                        if diff_sec < rule.cooldown_seconds:
                            continue

                    # TRIGGER ACTION!
                    rule.last_triggered_at = now_dt
                    action_summary = "Notification sent"

                    # 1. Automated MQTT Fail-Safe Action
                    if rule.action_type in ("publish_mqtt", "both") and rule.target_topic:
                        payload_to_send = rule.target_payload or "OFF"
                        broker_client = None

                        if rule.target_broker_id and rule.target_broker_id in mqtt_manager.brokers:
                            broker_client = mqtt_manager.brokers[rule.target_broker_id]
                        elif mqtt_manager.brokers:
                            # Default to first available broker
                            broker_client = next(iter(mqtt_manager.brokers.values()))

                        if broker_client:
                            await broker_client.enqueue_publish(
                                topic=rule.target_topic,
                                payload=payload_to_send,
                                qos=0,
                                retain=False
                            )
                            action_summary = f"Published '{payload_to_send}' to {rule.target_topic}"
                            logger.info(
                                f"Rule '{rule.name}' triggered: published fail-safe '{payload_to_send}' to {rule.target_topic}"
                            )

                    # 2. Record execution log
                    log_entry = RuleExecutionLog(
                        rule_id=rule.id,
                        user_id=user_id,
                        rule_name=rule.name,
                        triggered_at=now_dt,
                        trigger_value=numeric_val,
                        action_taken=action_summary
                    )
                    session.add(log_entry)
                    await session.commit()

                    # 3. Broadcast real-time In-App Toaster notification over WebSocket
                    if rule.enable_toast:
                        toast_title = f"🚨 {rule.name}"
                        toast_msg = (
                            f"{topic} ({numeric_val}) {rule.operator} {rule.threshold_value}. {action_summary}."
                        )
                        await ws_hub.broadcast_rule_triggered(
                            owner_user_id=user_id,
                            title=toast_title,
                            message=toast_msg,
                            severity=rule.severity,
                            rule_id=str(rule.id),
                            trigger_value=numeric_val
                        )

        except Exception as e:
            logger.error(f"Error in rule evaluation: {e}", exc_info=True)


rule_engine = RuleEngine()

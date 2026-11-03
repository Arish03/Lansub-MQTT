import logging
import uuid
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.config import settings
from app.models.user import User
from app.models.broker import Broker
from app.models.topic import Topic
from app.models.dashboard import Dashboard, Widget
from app.services.security import hash_password, verify_password

logger = logging.getLogger("seed")


async def seed_initial_data():
    """
    Ensures that default admin account, starter broker connection,
    default topics, and initial dashboard widgets exist on startup.
    """
    async with AsyncSessionLocal() as session:
        try:
            # 1. Admin User
            admin_email = settings.ADMIN_EMAIL.lower().strip()
            result = await session.execute(select(User).where(User.email == admin_email))
            admin = result.scalar_one_or_none()

            if not admin:
                logger.info(f"Seeding default administrator account ({admin_email})...")
                admin = User(
                    email=admin_email,
                    password_hash=hash_password(settings.ADMIN_PASSWORD)
                )
                session.add(admin)
                await session.commit()
                await session.refresh(admin)
                logger.info(f"Admin user seeded successfully with ID: {admin.id}")
            else:
                # Synchronize password with .env if different
                if not verify_password(settings.ADMIN_PASSWORD, admin.password_hash):
                    logger.info("Synchronizing admin password with environment configuration...")
                    admin.password_hash = hash_password(settings.ADMIN_PASSWORD)
                    await session.commit()

            # 2. Main Dashboard
            dash_res = await session.execute(select(Dashboard).where(Dashboard.user_id == admin.id))
            dashboard = dash_res.scalar_one_or_none()
            if not dashboard:
                logger.info("Creating default 'Main Dashboard' for administrator...")
                dashboard = Dashboard(
                    user_id=admin.id,
                    name="Main Dashboard",
                    layout={"cols": 3}
                )
                session.add(dashboard)
                await session.commit()
                await session.refresh(dashboard)

            # 3. Default Mosquitto Broker
            broker_res = await session.execute(select(Broker).where(Broker.user_id == admin.id))
            broker = broker_res.scalar_one_or_none()
            if not broker:
                logger.info("Creating default Local Mosquitto broker...")
                broker = Broker(
                    user_id=admin.id,
                    name="Local Mosquitto",
                    host=settings.MQTT_DEFAULT_HOST,
                    port=settings.MQTT_DEFAULT_PORT,
                    tls=False,
                    client_id=f"lansub_admin_{uuid.uuid4().hex[:6]}",
                    enabled=True,
                )
                session.add(broker)
                await session.commit()
                await session.refresh(broker)

            # 4. Default Topics
            topic_res = await session.execute(select(Topic).where(Topic.broker_id == broker.id))
            topics = topic_res.scalars().all()
            if not topics:
                logger.info("Configuring initial topics for Local Mosquitto...")
                telemetry_topic = Topic(
                    user_id=admin.id,
                    broker_id=broker.id,
                    pattern="sensor/temperature",
                    label="Temperature Sensor",
                    qos=0,
                    payload_format="json",
                    value_path="$.value",
                    unit="°C",
                    retain_days=7,
                    enabled=True,
                )
                wildcard_topic = Topic(
                    user_id=admin.id,
                    broker_id=broker.id,
                    pattern="test/#",
                    label="Test Wildcard Stream",
                    qos=0,
                    payload_format="json",
                    value_path="$.value",
                    unit="units",
                    retain_days=7,
                    enabled=True,
                )
                session.add_all([telemetry_topic, wildcard_topic])
                await session.commit()
                await session.refresh(telemetry_topic)
                await session.refresh(wildcard_topic)

                # 5. Default Dashboard Widgets
                widget_res = await session.execute(select(Widget).where(Widget.dashboard_id == dashboard.id))
                widgets = widget_res.scalars().all()
                if not widgets:
                    logger.info("Configuring default starter widgets...")
                    w_stat = Widget(
                        dashboard_id=dashboard.id,
                        type="stat",
                        topic_id=telemetry_topic.id,
                        config={
                            "title": "Temperature Telemetry",
                            "topic": telemetry_topic.pattern,
                            "unit": telemetry_topic.unit,
                        },
                        position={"x": 0, "y": 0, "w": 1, "h": 1}
                    )
                    w_switch = Widget(
                        dashboard_id=dashboard.id,
                        type="switch",
                        topic_id=None,
                        config={
                            "title": "Main Relay Switch",
                            "broker_id": str(broker.id),
                            "topic": "control/relay1",
                        },
                        position={"x": 1, "y": 0, "w": 1, "h": 1}
                    )
                    w_line = Widget(
                        dashboard_id=dashboard.id,
                        type="line",
                        topic_id=telemetry_topic.id,
                        config={
                            "title": "Temperature Trend (Live)",
                            "topic": telemetry_topic.pattern,
                            "unit": telemetry_topic.unit,
                        },
                        position={"x": 2, "y": 0, "w": 1, "h": 1}
                    )
                    session.add_all([w_stat, w_switch, w_line])
                    await session.commit()

            logger.info("Initialization seed completed.")
        except Exception as e:
            logger.error(f"Error during initial data seeding: {e}", exc_info=True)
            await session.rollback()

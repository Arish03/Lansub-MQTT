import os
import sys
import unittest
import uuid
from pydantic import ValidationError

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.schemas.auth import UserRegister, UserLogin
from app.schemas.broker import BrokerCreate, BrokerOut
from app.schemas.topic import TopicCreate, TopicOut
from app.schemas.publish import PublishRequest
from app.schemas.dashboard import WidgetCreate, DashboardOut


class TestSchemaValidation(unittest.TestCase):
    def test_auth_schemas(self):
        reg = UserRegister(email="test@example.com", password="SecurePassword123!")
        self.assertEqual(reg.email, "test@example.com")

        # Invalid email should raise ValidationError
        with self.assertRaises(ValidationError):
            UserRegister(email="invalid-email", password="123")

    def test_broker_schemas(self):
        broker = BrokerCreate(
            name="Production Broker",
            host="broker.hivemq.com",
            port=8883,
            tls=True
        )
        self.assertEqual(broker.port, 8883)
        self.assertTrue(broker.tls)

    def test_topic_schemas(self):
        topic = TopicCreate(
            broker_id=uuid.uuid4(),
            pattern="factory/line1/temp",
            payload_format="json",
            value_path="$.temperature",
            unit="°C",
            qos=1,
            retain_days=14
        )
        self.assertEqual(topic.pattern, "factory/line1/temp")
        self.assertEqual(topic.retain_days, 14)

    def test_publish_schema(self):
        broker_id = uuid.uuid4()
        req = PublishRequest(
            broker_id=broker_id,
            topic="control/relay1",
            payload="ON",
            qos=0,
            retain=False
        )
        self.assertEqual(req.payload, "ON")

    def test_widget_schema(self):
        widget = WidgetCreate(
            type="gauge",
            topic_id=uuid.uuid4(),
            config={"title": "Main Boiler Pressure", "min": 0, "max": 100, "unit": "psi"}
        )
        self.assertEqual(widget.type, "gauge")
        self.assertEqual(widget.config["min"], 0)


if __name__ == "__main__":
    unittest.main()

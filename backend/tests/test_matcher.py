import os
import sys
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.mqtt.matcher import topic_matches


class TestTopicMatcher(unittest.TestCase):
    def test_exact_matches(self):
        self.assertTrue(topic_matches("sensor/temperature", "sensor/temperature"))
        self.assertTrue(topic_matches("a/b/c", "a/b/c"))
        self.assertTrue(topic_matches("home", "home"))
        self.assertFalse(topic_matches("sensor/temp", "sensor/temperature"))
        self.assertFalse(topic_matches("sensor/temperature", "sensor/temp"))

    def test_multi_level_wildcard(self):
        self.assertTrue(topic_matches("#", "sensor/temperature"))
        self.assertTrue(topic_matches("#", "any/arbitrary/nested/topic"))
        self.assertTrue(topic_matches("sensor/#", "sensor/temperature"))
        self.assertTrue(topic_matches("sensor/#", "sensor/room1/temperature"))
        self.assertTrue(topic_matches("factory/+/machine/#", "factory/a/machine/1/status"))
        self.assertFalse(topic_matches("sensor/#", "other/temperature"))

    def test_single_level_wildcard(self):
        self.assertTrue(topic_matches("sensor/+/temperature", "sensor/room1/temperature"))
        self.assertTrue(topic_matches("sensor/+/temperature", "sensor/room2/temperature"))
        self.assertFalse(topic_matches("sensor/+/temperature", "sensor/room1/closet/temperature"))
        self.assertTrue(topic_matches("+/+", "sensor/temperature"))
        self.assertFalse(topic_matches("+/+", "sensor/room1/temperature"))

    def test_empty_and_edge_cases(self):
        self.assertFalse(topic_matches("", "sensor/temp"))
        self.assertFalse(topic_matches("sensor/temp", ""))
        self.assertFalse(topic_matches("", ""))


if __name__ == "__main__":
    unittest.main()

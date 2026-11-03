import os
import sys
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.ingest import extract_payload_and_value


class TestIngestValueExtraction(unittest.TestCase):
    def test_extract_json_direct_key(self):
        payload = b'{"temp": 24.5, "status": "ok"}'
        parsed, value = extract_payload_and_value(payload, "json", "temp")
        self.assertEqual(value, 24.5)
        self.assertEqual(parsed["temp"], 24.5)
        self.assertEqual(parsed["status"], "ok")

    def test_extract_json_dot_syntax(self):
        payload = b'{"metrics": {"temperature": {"reading": 31.8}}}'
        parsed, value = extract_payload_and_value(payload, "json", "$.metrics.temperature.reading")
        self.assertEqual(value, 31.8)

    def test_extract_numeric_format(self):
        payload = b"42.75"
        parsed, value = extract_payload_and_value(payload, "number")
        self.assertEqual(value, 42.75)
        self.assertEqual(parsed, {"value": 42.75})

    def test_extract_text_format(self):
        payload = b"DEVICE_READY"
        parsed, value = extract_payload_and_value(payload, "text")
        self.assertIsNone(value)
        self.assertEqual(parsed, {"text": "DEVICE_READY"})

    def test_fallback_invalid_json(self):
        payload = b"not a json object"
        parsed, value = extract_payload_and_value(payload, "json", "$.value")
        self.assertIsNone(value)
        self.assertEqual(parsed, {"raw": "not a json object"})


if __name__ == "__main__":
    unittest.main()

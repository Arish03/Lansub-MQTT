import os
import sys
import unittest
import uuid
from pydantic import ValidationError

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.schemas.rule import RuleCreate, RuleUpdate
from app.schemas.auth import ProfileUpdate
from app.services.rules import RuleEngine


class TestRuleEngineAndSchemas(unittest.TestCase):
    def setUp(self):
        self.engine = RuleEngine()

    def test_condition_evaluation(self):
        # Greater Than (>)
        self.assertTrue(self.engine._eval_condition(35.5, ">", 35.0))
        self.assertFalse(self.engine._eval_condition(34.9, ">", 35.0))
        self.assertFalse(self.engine._eval_condition(35.0, ">", 35.0))

        # Less Than (<)
        self.assertTrue(self.engine._eval_condition(14.2, "<", 15.0))
        self.assertFalse(self.engine._eval_condition(15.5, "<", 15.0))

        # Greater or Equal (>=)
        self.assertTrue(self.engine._eval_condition(35.0, ">=", 35.0))
        self.assertTrue(self.engine._eval_condition(36.0, ">=", 35.0))
        self.assertFalse(self.engine._eval_condition(34.9, ">=", 35.0))

        # Less or Equal (<=)
        self.assertTrue(self.engine._eval_condition(20.0, "<=", 20.0))
        self.assertTrue(self.engine._eval_condition(19.9, "<=", 20.0))
        self.assertFalse(self.engine._eval_condition(20.1, "<=", 20.0))

        # Equal (==)
        self.assertTrue(self.engine._eval_condition(100.0, "==", 100.0))
        self.assertFalse(self.engine._eval_condition(100.1, "==", 100.0))

        # Not Equal (!=)
        self.assertTrue(self.engine._eval_condition(100.1, "!=", 100.0))
        self.assertFalse(self.engine._eval_condition(100.0, "!=", 100.0))

    def test_rule_schemas(self):
        rule = RuleCreate(
            name="Emergency Overheat Cutoff",
            condition_topic="sensor/temperature",
            operator=">",
            threshold_value=35.0,
            duration_seconds=120,
            action_type="both",
            target_topic="control/relay1",
            target_payload="OFF",
            severity="danger",
            enable_toast=True,
            cooldown_seconds=60
        )
        self.assertEqual(rule.name, "Emergency Overheat Cutoff")
        self.assertEqual(rule.threshold_value, 35.0)
        self.assertEqual(rule.operator, ">")
        self.assertEqual(rule.duration_seconds, 120)

    def test_profile_update_schema(self):
        profile = ProfileUpdate(
            current_password="OldPassword123!",
            new_password="NewSecurePassword456!"
        )
        self.assertEqual(profile.current_password, "OldPassword123!")
        self.assertEqual(profile.new_password, "NewSecurePassword456!")


if __name__ == "__main__":
    unittest.main()


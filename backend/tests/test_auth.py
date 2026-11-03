import os
import sys
import unittest
from uuid import uuid4

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    encrypt_secret,
    decrypt_secret,
)


class TestSecurityAndAuth(unittest.TestCase):
    def test_password_hashing_and_verification(self):
        password = "SuperSecretPassword123!"
        hashed = hash_password(password)

        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("WrongPassword!", hashed))

    def test_jwt_token_creation_and_decoding(self):
        user_id = str(uuid4())
        token = create_access_token({"sub": user_id})
        self.assertIsInstance(token, str)

        payload = decode_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload.get("sub"), user_id)

    def test_jwt_invalid_token(self):
        self.assertIsNone(decode_token("invalid.token.structure"))
        self.assertIsNone(decode_token(""))

    def test_fernet_secret_encryption_and_decryption(self):
        secret = "broker_mqtt_pass_#9981"
        encrypted = encrypt_secret(secret)

        self.assertNotEqual(secret, encrypted)
        decrypted = decrypt_secret(encrypted)
        self.assertEqual(secret, decrypted)

    def test_fernet_empty_or_none(self):
        self.assertIsNone(encrypt_secret(None))
        self.assertIsNone(decrypt_secret(None))
        self.assertIsNone(encrypt_secret(""))
        self.assertIsNone(decrypt_secret(""))


if __name__ == "__main__":
    unittest.main()

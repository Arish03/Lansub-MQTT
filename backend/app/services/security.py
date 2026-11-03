from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import importlib

try:
    _argon2 = importlib.import_module("argon2")
    _argon2_exceptions = importlib.import_module("argon2.exceptions")
    PasswordHasher = getattr(_argon2, "PasswordHasher")
    VerifyMismatchError = getattr(_argon2_exceptions, "VerifyMismatchError")
    _has_argon2 = True
    ph = PasswordHasher()
except Exception:
    _has_argon2 = False
    ph = None

    class VerifyMismatchError(Exception):
        pass

from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.config import settings
from app.db import get_db
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)

# Fernet cipher for broker passwords
try:
    fernet = Fernet(settings.FERNET_KEY.encode())
except Exception:
    # Fallback to key derivation if key isn't formatted properly
    import base64
    import hashlib
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.FERNET_KEY.encode()).digest())
    fernet = Fernet(key)


def hash_password(password: str) -> str:
    if _has_argon2 and ph is not None:
        return ph.hash(password)
    import hashlib, secrets
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return f"pbkdf2:{salt}:{h}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if _has_argon2 and ph is not None and not hashed_password.startswith("pbkdf2:"):
        try:
            return ph.verify(hashed_password, plain_password)
        except VerifyMismatchError:
            return False
    if hashed_password.startswith("pbkdf2:"):
        parts = hashed_password.split(":")
        if len(parts) == 3:
            _, salt, expected_hash = parts
            import hashlib
            h = hashlib.pbkdf2_hmac("sha256", plain_password.encode(), salt.encode(), 100000).hex()
            return h == expected_hash
    return False


def encrypt_secret(secret: Optional[str]) -> Optional[str]:
    if not secret:
        return None
    return fernet.encrypt(secret.encode()).decode()


def decrypt_secret(encrypted_secret: Optional[str]) -> Optional[str]:
    if not encrypted_secret:
        return None
    try:
        return fernet.decrypt(encrypted_secret.encode()).decode()
    except Exception:
        return None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth or not auth.credentials:
        raise credentials_exception

    payload = decode_token(auth.credentials)
    if payload is None:
        raise credentials_exception

    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_uuid = UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

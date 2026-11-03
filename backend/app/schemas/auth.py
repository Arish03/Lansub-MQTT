from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

import importlib

try:
    importlib.import_module("email_validator")
    from pydantic import EmailStr
except Exception:
    from typing import Annotated
    from pydantic import StringConstraints
    # Resilient email regex constraint fallback when email-validator is not installed
    EmailStr = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")]  # type: ignore


class UserRegister(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

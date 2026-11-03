from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://app:app_secret@db:5432/mqtt"
    JWT_SECRET: str = "c28f3a8b417e923e5a7b1892019c8f61539281a7d6e4b3c2a10987654321abcd"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # 32 url-safe base64-encoded bytes for Fernet encryption
    FERNET_KEY: str = "vX1K4-z8_hYQ3mK6_2j8b1n3P9q7xW4_k5M8r0T2y1A="

    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "AdminSecurePassword123!"

    MQTT_DEFAULT_HOST: str = "mosquitto"
    MQTT_DEFAULT_PORT: int = 1883

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


settings = Settings()

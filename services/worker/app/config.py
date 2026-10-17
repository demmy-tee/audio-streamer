from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/commitments_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # S3 / MinIO Object Storage
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin123"
    S3_BUCKET_NAME: str = "audio-streamer-records"
    S3_REGION: str = "us-east-1"

    # AI API Keys
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    @property
    def has_ai_credentials(self) -> bool:
        """Returns True if any supported AI provider key is configured."""
        return bool(self.GROQ_API_KEY or self.OPENAI_API_KEY or self.GEMINI_API_KEY)

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

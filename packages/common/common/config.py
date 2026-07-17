"""Typed application settings, loaded from environment variables / `.env`.

Single cached accessor ``get_settings()`` used everywhere so config is
consistent across crawlers, API, and ML jobs.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    environment: str = Field(default="local")
    log_level: str = Field(default="INFO")

    # --- Database ---
    database_url: str = Field(default="postgresql+psycopg://twin:twin@localhost:5432/twin")

    # --- Object storage (raw cache tier) ---
    object_storage_endpoint_url: str | None = Field(default="http://localhost:9000")
    object_storage_access_key: str = Field(default="minioadmin")
    object_storage_secret_key: str = Field(default="minioadmin")
    object_storage_bucket: str = Field(default="twin-raw-cache")
    object_storage_region: str = Field(default="us-east-1")

    # --- LLM / RAG ---
    llm_provider: str = Field(default="openai")
    llm_api_key: str = Field(default="changeme")
    llm_model: str = Field(default="gpt-4o-mini")
    llm_embedding_model: str = Field(default="text-embedding-3-small")
    llm_embedding_dim: int = Field(default=1536)

    # --- HTTP crawler defaults ---
    http_user_agent: str = Field(default="PropertyDigitalTwinBot/1.0 (+https://example.com/bot)")
    http_default_rate_limit_per_sec: float = Field(default=1.0)
    http_max_retries: int = Field(default=5)
    http_backoff_base_seconds: float = Field(default=0.5)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings singleton."""
    return Settings()

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

    # --- xAI Grok (social analysis + enhanced copilot) ---
    # OpenAI-compatible endpoint — drop-in for the existing LLMClient.
    # When xai_api_key is set, Grok is used for copilot and social analysis;
    # the OpenAI key is kept as embedding fallback (Grok doesn't embed yet).
    xai_api_key: str = Field(default="")
    xai_model: str = Field(default="grok-3")
    xai_base_url: str = Field(default="https://api.x.ai/v1")

    # --- HTTP crawler defaults ---
    http_user_agent: str = Field(default="PropertyDigitalTwinBot/1.0 (+https://example.com/bot)")
    http_default_rate_limit_per_sec: float = Field(default=1.0)
    http_max_retries: int = Field(default=5)
    http_backoff_base_seconds: float = Field(default=0.5)

    # --- Phase 5: feature flags for the expensive/optional line items (§9, §13) ---
    # Default posture: X/social OFF; satellite + GPU batch gated behind explicit enablement.
    enable_x_social: bool = Field(default=False)
    enable_satellite: bool = Field(default=False)
    enable_gpu_batch: bool = Field(default=False)

    # --- Phase 5: monthly cost caps (USD) — hitting a cap fails safe (§13) ---
    budget_x_social_usd: float = Field(default=0.0)
    budget_satellite_usd: float = Field(default=200.0)
    budget_gpu_usd: float = Field(default=300.0)

    # --- API CORS (which web origins may call the API from a browser) ---
    # Comma-separated in env, e.g. CORS_ALLOW_ORIGINS="https://app.example.com".
    cors_allow_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings singleton."""
    return Settings()

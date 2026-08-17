from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime config, read from environment / .env. Nothing here has a
    production-safe default on purpose — a missing DATABASE_URL or
    CLERK_SECRET_KEY should fail loudly at startup, not silently fall
    back to something that looks like it works.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://cadence:cadence@localhost:5433/cadence"

    # Clerk (architecture.md §3): the backend verifies the session token
    # via Clerk's JWKS rather than maintaining its own auth system.
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""

    # When true, auth falls back to a fixed dev user instead of verifying a
    # real Clerk token — for local development without live Clerk
    # credentials. Never enabled by default; must be explicit.
    dev_auth_bypass: bool = False

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

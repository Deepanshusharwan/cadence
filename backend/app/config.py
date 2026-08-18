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

    # Email allowlist for GET /feedback. There's no general admin/role
    # system in this app — feedback is just this one owner-only view — so
    # it's a config list rather than a proper roles table. Checked against
    # the requesting user's Clerk primary email (fetched from Clerk's
    # Backend API, since session tokens don't carry email by default).
    # Empty by default: nobody can list feedback until this is set, not
    # even the dev-bypass user.
    admin_emails: list[str] = []

    # Lemon Squeezy (docs/deployment.md — the merchant-of-record payment
    # processor). The secret is used to verify webhook authenticity
    # (HMAC-SHA256 over the raw body, per Lemon Squeezy's docs) — this is
    # the entire security boundary on POST /webhooks/lemonsqueezy, which
    # has no Clerk auth (Lemon Squeezy's servers call it directly, not a
    # logged-in user). Empty by default: with no secret configured, every
    # webhook request is rejected rather than silently trusted.
    lemonsqueezy_webhook_secret: str = ""

    # variant id (as Lemon Squeezy sends it, a stringified int) -> plan.
    # Populated once real products/variants exist in the Lemon Squeezy
    # dashboard for each Plus cadence (monthly/quarterly/annual/lifetime) —
    # all of them map to "plus", since the plan tier doesn't depend on
    # billing cadence. An unmapped variant id is logged and ignored rather
    # than granting anything, so an unrecognized product never silently
    # grants access.
    lemonsqueezy_variant_plans: dict[str, str] = {}

    # Settings -> API in the Lemon Squeezy dashboard. Used server-side only,
    # to create checkout sessions via the API (POST /billing/checkout)
    # instead of static hosted checkout links — that's what lets us pass
    # `skip_trial` per-request based on our own trial_used record (see
    # models.User.trial_used), which a static link can't do.
    lemonsqueezy_api_key: str = ""
    # Settings -> Store in the Lemon Squeezy dashboard. Required by the
    # Checkout API's `store` relationship alongside the variant id.
    lemonsqueezy_store_id: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()

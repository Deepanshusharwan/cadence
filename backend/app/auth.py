"""Clerk session-token verification (architecture.md §3).

The backend never maintains its own auth system — every request carries the
Clerk-issued session token, and this module verifies it against Clerk's
published JWKS rather than trusting the client. `DEV_AUTH_BYPASS=true`
exists purely so the rest of the API can be built and tested locally
against a fixed dev user without real Clerk credentials — it must stay
opt-in and off by default, never enabled against a real deployment.
"""

from functools import lru_cache

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from .config import get_settings

_bearer = HTTPBearer(auto_error=False)

DEV_USER_ID = "dev-user"


@lru_cache
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)


def verify_session_token(token: str) -> str:
    """Verify a Clerk session token and return the Clerk user id (the `sub` claim)."""
    settings = get_settings()
    if not settings.clerk_jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLERK_JWKS_URL is not configured",
        )
    signing_key = _jwks_client(settings.clerk_jwks_url).get_signing_key_from_jwt(token)
    options = {"verify_aud": False}
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=settings.clerk_issuer or None,
        options=options,
    )

    # `azp` (authorized party) is the origin the token was issued to. Clerk
    # sets it whenever more than one frontend can talk to the same Clerk
    # instance; checking it stops a token minted for a different app on the
    # same Clerk project from being replayed against this API. Per Clerk's
    # own guidance, skip the check entirely when the claim is absent (single
    # first-party frontend, or an older token shape).
    azp = claims.get("azp")
    if azp is not None and azp not in settings.cors_origins:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token origin")

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")
    return sub


def get_clerk_primary_email(user_id: str) -> str | None:
    """Look up a Clerk user's primary email via Clerk's Backend API.

    Session tokens don't carry email by default, so the GET /feedback
    admin-allowlist check (config.admin_emails) needs a live lookup rather
    than reading it off the token. Only called on that one rarely-used
    route, not the hot path. Any failure (network, unknown user, no
    primary email set) fails closed — returns None rather than raising —
    so a Clerk API hiccup denies access instead of accidentally granting it.
    """
    settings = get_settings()
    if not settings.clerk_secret_key:
        return None
    try:
        resp = httpx.get(
            f"https://api.clerk.com/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    primary_id = data.get("primary_email_address_id")
    for entry in data.get("email_addresses", []):
        if entry.get("id") == primary_id:
            return entry.get("email_address")
    return None


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    settings = get_settings()
    if settings.dev_auth_bypass:
        return DEV_USER_ID

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    try:
        return verify_session_token(credentials.credentials)
    except HTTPException:
        raise
    except Exception as exc:  # jwt/JWKS errors — treat all as unauthorized
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

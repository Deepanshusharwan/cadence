"""Clerk session-token verification (architecture.md §3).

The backend never maintains its own auth system — every request carries the
Clerk-issued session token, and this module verifies it against Clerk's
published JWKS rather than trusting the client. There's no live Clerk
project wired up in this environment, so this can't be end-to-end tested
here; `DEV_AUTH_BYPASS=true` exists purely so the rest of the API can be
built and tested locally against a fixed dev user without real Clerk
credentials. It must stay opt-in and off by default — never enable it
against a real deployment.
"""

from functools import lru_cache

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
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")
    return sub


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

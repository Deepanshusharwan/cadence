"""Lemon Squeezy Checkout API client (docs/deployment.md — the
merchant-of-record payment processor).

Checkout sessions are created server-side via this API rather than linking
to Lemon Squeezy's static hosted "buy" URLs, because a static link always
honors a variant's default free trial. Creating the checkout ourselves lets
us pass `skip_trial` per-request based on our own trial_used record (see
models.User.trial_used and routers/billing.py) — a static link has no way
to know a given customer already spent their trial on a different variant.
"""

import httpx

from .config import get_settings


def create_checkout(variant_id: str, user_id: str, skip_trial: bool) -> str | None:
    """Create a checkout for `variant_id` and return its URL, or None on any
    failure (missing config, network error, unexpected response) — callers
    turn a None into a 500 rather than proceeding with nothing to redirect
    the customer to.
    """
    settings = get_settings()
    if not settings.lemonsqueezy_api_key or not settings.lemonsqueezy_store_id:
        return None

    try:
        resp = httpx.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            headers={
                "Authorization": f"Bearer {settings.lemonsqueezy_api_key}",
                "Content-Type": "application/vnd.api+json",
                "Accept": "application/vnd.api+json",
            },
            json={
                "data": {
                    "type": "checkouts",
                    "attributes": {
                        # Echoed back in every webhook event for this
                        # purchase as meta.custom_data.user_id — see
                        # routers/webhooks.py.
                        "checkout_data": {"custom": {"user_id": user_id}},
                        "checkout_options": {"skip_trial": skip_trial},
                    },
                    "relationships": {
                        "store": {
                            "data": {"type": "stores", "id": settings.lemonsqueezy_store_id}
                        },
                        "variant": {"data": {"type": "variants", "id": variant_id}},
                    },
                }
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    return data.get("data", {}).get("attributes", {}).get("url")

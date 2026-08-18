"""Lemon Squeezy webhook receiver (docs/deployment.md — the merchant-of-record
payment processor). No Clerk auth here — Lemon Squeezy's servers call this
directly, not a logged-in user — so the HMAC signature check below is the
entire security boundary, not a secondary check on top of something else.
"""

import hashlib
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import models
from ..config import get_settings
from ..db import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Events that indicate active/paid access -> grant the mapped plan.
_GRANT_EVENTS = {
    "order_created",
    "subscription_created",
    "subscription_updated",
    "subscription_payment_success",
    "subscription_resumed",
    "subscription_unpaused",
}

# The one event that unambiguously means the paid period has actually
# ended, not just "won't renew" -> revert to free. subscription_cancelled
# is deliberately excluded: it means "won't auto-renew," and Lemon Squeezy
# fires subscription_expired separately once the already-paid-for period is
# actually over. Reverting on "cancelled" would cut someone off before the
# time they already paid for.
_REVOKE_EVENTS = {"subscription_expired"}

# subscription_updated fires for status transitions that aren't a grant
# (paused, past_due, etc.) as well as ones that are — only treat it as a
# grant when the status is genuinely active.
_ACTIVE_STATUSES = {"active", "on_trial"}


def _verify_signature(secret: str, raw_body: bytes, signature_header: str | None) -> bool:
    if not signature_header:
        return False
    digest = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature_header)


@router.post("/lemonsqueezy")
async def lemonsqueezy_webhook(request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    if not settings.lemonsqueezy_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LEMONSQUEEZY_WEBHOOK_SECRET is not configured",
        )

    raw_body = await request.body()
    signature = request.headers.get("x-signature")
    if not _verify_signature(settings.lemonsqueezy_webhook_secret, raw_body, signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    try:
        payload = await request.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed payload") from exc

    meta = payload.get("meta") or {}
    event_name = meta.get("event_name")
    user_id = (meta.get("custom_data") or {}).get("user_id")
    attributes = (payload.get("data") or {}).get("attributes") or {}
    variant_id = str(attributes.get("variant_id", ""))
    status_field = attributes.get("status")

    # Every branch below acknowledges with 200 even when it does nothing —
    # Lemon Squeezy retries on non-2xx, and none of these cases (unknown
    # user, unmapped variant, an event we don't act on) are things retrying
    # would fix.
    if not user_id:
        logger.warning("Lemon Squeezy webhook %s had no custom_data.user_id", event_name)
        return {"ok": True}

    user = db.get(models.User, user_id)
    if user is None:
        logger.warning("Lemon Squeezy webhook %s referenced unknown user %s", event_name, user_id)
        return {"ok": True}

    # Marks that this user has ever started a subscription, regardless of
    # variant/cadence -- POST /billing/checkout reads this to force
    # skip_trial on any future checkout, so a cancel-and-resubscribe on a
    # different variant can't harvest a second free trial.
    if event_name == "subscription_created" and not user.trial_used:
        user.trial_used = True
        db.commit()

    if event_name in _REVOKE_EVENTS:
        user.plan = "free"
        db.commit()
    elif event_name in _GRANT_EVENTS:
        if event_name == "subscription_updated" and status_field not in _ACTIVE_STATUSES:
            return {"ok": True}
        plan = settings.lemonsqueezy_variant_plans.get(variant_id)
        if plan is None:
            logger.warning(
                "Lemon Squeezy webhook %s had unmapped variant_id %s", event_name, variant_id
            )
            return {"ok": True}
        user.plan = plan
        db.commit()
    # Anything else (subscription_cancelled, subscription_paused,
    # order_refunded, etc.) is acknowledged but not acted on yet — see the
    # _GRANT_EVENTS / _REVOKE_EVENTS comments above for why.

    return {"ok": True}

"""Checkout creation for Lemon Squeezy Plus purchases (docs/deployment.md).

Server-side rather than static hosted checkout links — see
app/lemonsqueezy.py's docstring for why (skip_trial enforcement).
"""

from fastapi import APIRouter, Depends, HTTPException, status

from .. import models, schemas
from ..deps import get_current_user
from ..lemonsqueezy import create_checkout

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/checkout", response_model=schemas.CheckoutOut)
def create_checkout_session(
    body: schemas.CheckoutCreate,
    user: models.User = Depends(get_current_user),
):
    url = create_checkout(body.variant_id, user.id, skip_trial=user.trial_used)
    if url is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Checkout is not available right now",
        )
    return schemas.CheckoutOut(url=url)

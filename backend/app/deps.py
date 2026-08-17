from fastapi import Depends
from sqlalchemy.orm import Session

from . import models
from .auth import get_current_user_id
from .db import get_db

# A reasonable starting template (spec §18) — the setup wizard's Schedule
# step lets the user replace or delete these immediately, but a brand new
# account shouldn't land on a completely empty Today page just because
# onboarding was skipped.
_STARTER_ANCHORS = [
    {"label": "Fixed commitment", "start": "10:00", "end": "18:00", "is_focus_block": False},
    {"label": "Evening focus", "start": "19:00", "end": "21:00", "is_focus_block": True},
    {"label": "Evening focus", "start": "21:30", "end": "23:30", "is_focus_block": True},
]


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> models.User:
    """Fetch (or lazily create) the row for the authenticated Clerk user.

    Clerk owns signup/login; the first authenticated request from a new
    Clerk user is what creates their Cadence profile row here, rather than
    a separate provisioning step.
    """
    user = db.get(models.User, user_id)
    if user is None:
        user = models.User(id=user_id)
        db.add(user)
        for starter in _STARTER_ANCHORS:
            db.add(
                models.ScheduleAnchor(
                    user_id=user_id,
                    recurrence="daily",
                    days_of_week=[],
                    date=None,
                    category_ids=[],
                    **starter,
                )
            )
        db.commit()
        db.refresh(user)
    return user

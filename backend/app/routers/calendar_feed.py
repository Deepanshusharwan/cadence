"""One-way ICS "subscribe" feed (Plus-only to create, public to fetch).

Scoped deliberately narrow: read-only, one-off CadenceEvent rows only (not
recurring ScheduleAnchors -- those would need RRULE generation, a
fast-follow not worth the complexity for v1), no OAuth, no external
provider integration. Any calendar app's "subscribe by URL" feature can
pull this. See docs/deployment.md-adjacent pricing-plan notes on why this
replaces full two-way Google Calendar sync for now.

Same public-token pattern as routers/sharing.py: GET /calendar-feed/{token}.ics
has no Depends(get_current_user) at all.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import require_plus

router = APIRouter(tags=["calendar"])


def _ics_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def _build_ics(events: list[models.CadenceEvent]) -> str:
    now_stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Cadence//Calendar Feed//EN",
        "CALSCALE:GREGORIAN",
    ]
    for event in events:
        date_str = event.date.strftime("%Y%m%d")
        start = event.start.replace(":", "")
        end = event.end.replace(":", "")
        lines += [
            "BEGIN:VEVENT",
            f"UID:{event.id}@cadence.app",
            f"DTSTAMP:{now_stamp}",
            # Floating local time (no Z, no TZID) -- simplest correct
            # choice given events are stored as local wall-clock strings
            # with no per-event timezone; most calendar apps render a
            # floating time in the viewer's own local zone.
            f"DTSTART:{date_str}T{start}00",
            f"DTEND:{date_str}T{end}00",
            f"SUMMARY:{_ics_escape(event.title)}",
        ]
        if event.notes:
            lines.append(f"DESCRIPTION:{_ics_escape(event.notes)}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


@router.get("/calendar-feed", response_model=schemas.CalendarFeedOut | None)
def get_my_calendar_feed(user: models.User = Depends(require_plus), db: Session = Depends(get_db)):
    token = (
        db.query(models.CalendarFeedToken)
        .filter(models.CalendarFeedToken.user_id == user.id, models.CalendarFeedToken.revoked.is_(False))
        .first()
    )
    if token is None:
        return None
    return schemas.CalendarFeedOut(token=token.id, created_at=token.created_at)


@router.post("/calendar-feed", response_model=schemas.CalendarFeedOut)
def create_calendar_feed(user: models.User = Depends(require_plus), db: Session = Depends(get_db)):
    db.query(models.CalendarFeedToken).filter(models.CalendarFeedToken.user_id == user.id).update(
        {"revoked": True}
    )
    token = models.CalendarFeedToken(user_id=user.id)
    db.add(token)
    db.commit()
    db.refresh(token)
    return schemas.CalendarFeedOut(token=token.id, created_at=token.created_at)


@router.delete("/calendar-feed/{token}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_calendar_feed(token: str, user: models.User = Depends(require_plus), db: Session = Depends(get_db)):
    row = db.get(models.CalendarFeedToken, token)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar feed not found")
    row.revoked = True
    db.commit()


@router.get("/calendar-feed/{token}.ics")
def get_ics_feed(token: str, db: Session = Depends(get_db)):
    row = db.get(models.CalendarFeedToken, token)
    # Same downgrade-revalidation rule as share links -- a lapsed-back-to-
    # free owner's feed goes dead immediately, not just at revoke time.
    if row is None or row.revoked or row.user.plan == "free":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar feed not found")

    events = db.query(models.CadenceEvent).filter(models.CadenceEvent.user_id == row.user_id).all()
    return PlainTextResponse(_build_ics(events), media_type="text/calendar")

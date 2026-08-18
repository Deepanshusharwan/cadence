"""Data export (Plus-only). A read-only projection of everything the user
has entered -- no aggregation, no derived numbers, just their raw data back
out in a portable format.
"""

import csv
import io
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import require_plus

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/json", response_model=schemas.ExportOut)
def export_json(user: models.User = Depends(require_plus), db: Session = Depends(get_db)):
    return {
        "exported_at": datetime.now(UTC),
        "sessions": db.query(models.StudySession)
        .filter(models.StudySession.user_id == user.id)
        .order_by(models.StudySession.date)
        .all(),
        "categories": db.query(models.Category).filter(models.Category.user_id == user.id).all(),
        "reviews": db.query(models.WeeklyReview)
        .filter(models.WeeklyReview.user_id == user.id)
        .order_by(models.WeeklyReview.week_start)
        .all(),
        "events": db.query(models.CadenceEvent)
        .filter(models.CadenceEvent.user_id == user.id)
        .order_by(models.CadenceEvent.date)
        .all(),
        "day_entries": db.query(models.DayEntry)
        .filter(models.DayEntry.user_id == user.id)
        .order_by(models.DayEntry.date)
        .all(),
    }


@router.get("/csv")
def export_csv(user: models.User = Depends(require_plus), db: Session = Depends(get_db)):
    # Sessions only -- the naturally tabular, highest-value data. The JSON
    # export above covers everything else.
    sessions = (
        db.query(models.StudySession)
        .filter(models.StudySession.user_id == user.id)
        .order_by(models.StudySession.date)
        .all()
    )
    category_names = {c.id: c.name for c in db.query(models.Category).filter(models.Category.user_id == user.id)}

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["date", "category", "duration_minutes", "tags"])
    for s in sessions:
        writer.writerow(
            [s.date.isoformat(), category_names.get(s.category_id, ""), s.duration_minutes, ";".join(s.tags)]
        )
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="cadence-sessions.csv"'},
    )

from datetime import date as Date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/day-types", tags=["day-types"])


@router.get("", response_model=list[schemas.DayEntryOut])
def list_day_types(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.DayEntry).filter(models.DayEntry.user_id == user.id).all()


@router.put("/{on_date}", response_model=schemas.DayEntryOut)
def set_day_type(
    on_date: Date,
    payload: schemas.DayEntrySet,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.get(models.DayEntry, (user.id, on_date))
    if entry is None:
        entry = models.DayEntry(user_id=user.id, date=on_date, day_type=payload.day_type)
        db.add(entry)
    else:
        entry.day_type = payload.day_type
    db.commit()
    db.refresh(entry)
    return entry

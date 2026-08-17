from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[schemas.EventOut])
def list_events(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.CadenceEvent).filter(models.CadenceEvent.user_id == user.id).all()


@router.post("", response_model=schemas.EventOut, status_code=201)
def create_event(
    payload: schemas.EventCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = models.CadenceEvent(user_id=user.id, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = (
        db.query(models.CadenceEvent)
        .filter(models.CadenceEvent.id == event_id, models.CadenceEvent.user_id == user.id)
        .first()
    )
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()

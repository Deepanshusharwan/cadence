from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/anchors", tags=["anchors"])


@router.get("", response_model=list[schemas.AnchorOut])
def list_anchors(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.ScheduleAnchor).filter(models.ScheduleAnchor.user_id == user.id).all()


@router.post("", response_model=schemas.AnchorOut, status_code=201)
def create_anchor(
    payload: schemas.AnchorCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    anchor = models.ScheduleAnchor(user_id=user.id, **payload.model_dump())
    db.add(anchor)
    db.commit()
    db.refresh(anchor)
    return anchor


@router.patch("/{anchor_id}", response_model=schemas.AnchorOut)
def update_anchor(
    anchor_id: str,
    payload: schemas.AnchorUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    anchor = (
        db.query(models.ScheduleAnchor)
        .filter(models.ScheduleAnchor.id == anchor_id, models.ScheduleAnchor.user_id == user.id)
        .first()
    )
    if anchor is None:
        raise HTTPException(status_code=404, detail="Anchor not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(anchor, field, value)
    db.commit()
    db.refresh(anchor)
    return anchor


@router.delete("/{anchor_id}", status_code=204)
def delete_anchor(
    anchor_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    anchor = (
        db.query(models.ScheduleAnchor)
        .filter(models.ScheduleAnchor.id == anchor_id, models.ScheduleAnchor.user_id == user.id)
        .first()
    )
    if anchor is None:
        raise HTTPException(status_code=404, detail="Anchor not found")
    db.delete(anchor)
    db.commit()

from datetime import date as Date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/weekly-review", tags=["weekly-review"])


@router.get("/{week_start}", response_model=schemas.ReviewOut)
def get_review(
    week_start: Date,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.get(models.WeeklyReview, (user.id, week_start))
    if review is None:
        return schemas.ReviewOut(week_start=week_start, wins="", problems="", next_week_changes="")
    return review


@router.put("/{week_start}", response_model=schemas.ReviewOut)
def upsert_review(
    week_start: Date,
    payload: schemas.ReviewUpsert,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.get(models.WeeklyReview, (user.id, week_start))
    if review is None:
        review = models.WeeklyReview(user_id=user.id, week_start=week_start)
        db.add(review)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(review, field, value)
    db.commit()
    db.refresh(review)
    return review

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=schemas.FeedbackOut, status_code=201)
def create_feedback(
    payload: schemas.FeedbackCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feedback = models.Feedback(user_id=user.id, **payload.model_dump())
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback

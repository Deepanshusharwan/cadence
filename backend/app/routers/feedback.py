from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_admin_email, get_current_user

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


@router.get("", response_model=list[schemas.FeedbackAdminOut])
def list_feedback(
    _admin_email: str = Depends(get_admin_email),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Feedback, models.User)
        .join(models.User, models.Feedback.user_id == models.User.id)
        .order_by(desc(models.Feedback.created_at))
        .all()
    )
    return [
        schemas.FeedbackAdminOut(
            id=f.id,
            type=f.type,
            message=f.message,
            created_at=f.created_at,
            user_id=u.id,
            user_name=u.name,
            user_avatar=u.avatar,
        )
        for f, u in rows
    ]

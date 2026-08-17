from datetime import date as Date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user
from ..services.analytics import compute_insights, compute_streak_info
from ..services.leave import compute_leave_balance
from ..services.planner import todays_schedule

router = APIRouter(tags=["computed"])


class ScheduleBlockOut(BaseModel):
    start: str
    time: str
    label: str
    dim: bool
    is_event: bool


@router.get("/today", response_model=list[ScheduleBlockOut])
def get_today(
    on_date: Date | None = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return todays_schedule(db, user.id, on_date)


@router.get("/leave", response_model=schemas.LeaveBalanceOut)
def get_leave(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return compute_leave_balance(db, user)


@router.get("/streaks", response_model=schemas.StreakInfoOut)
def get_streaks(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return compute_streak_info(db, user.id)


@router.get("/insights", response_model=list[schemas.InsightOut])
def get_insights(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return compute_insights(db, user.id)

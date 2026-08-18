"""Read-only progress sharing (Plus-only to create, public to view).

GET /share/{token} is the first unauthenticated data route in this
backend -- no Depends(get_current_user) anywhere on it. The token (a
ShareLink's own uuid primary key, not the Clerk user id) is the only
lookup key, so this can never be used to enumerate or resolve accounts.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import require_plus
from ..services.analytics import compute_consistency_pct, compute_streak_info

router = APIRouter(tags=["sharing"])


@router.get("/share-links", response_model=schemas.ShareLinkOut | None)
def get_my_share_link(user: models.User = Depends(require_plus), db: Session = Depends(get_db)):
    link = (
        db.query(models.ShareLink)
        .filter(models.ShareLink.user_id == user.id, models.ShareLink.revoked.is_(False))
        .first()
    )
    if link is None:
        return None
    return schemas.ShareLinkOut(token=link.id, created_at=link.created_at)


@router.post("/share-links", response_model=schemas.ShareLinkOut)
def create_share_link(user: models.User = Depends(require_plus), db: Session = Depends(get_db)):
    # Single active link per user -- creating a new one revokes any existing
    # ones rather than needing a list-management UI. Soft-revoke (not
    # delete) so old tokens keep a row -- matches get_shared_progress's own
    # revoked check below and get_my_share_link's revoked.is_(False) filter.
    db.query(models.ShareLink).filter(models.ShareLink.user_id == user.id).update({"revoked": True})
    link = models.ShareLink(user_id=user.id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return schemas.ShareLinkOut(token=link.id, created_at=link.created_at)


@router.delete("/share-links/{token}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share_link(token: str, user: models.User = Depends(require_plus), db: Session = Depends(get_db)):
    link = db.get(models.ShareLink, token)
    if link is None or link.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found")
    link.revoked = True
    db.commit()


@router.get("/share/{token}", response_model=schemas.SharedProgressOut)
def get_shared_progress(token: str, db: Session = Depends(get_db)):
    link = db.get(models.ShareLink, token)
    # 404 for missing, revoked, AND a lapsed-back-to-free owner (re-check
    # plan at view time, not just at link-creation time) -- a downgrade
    # should kill a stale link's visibility immediately, not leave it
    # readable forever off whatever plan the owner had when they made it.
    if link is None or link.revoked or link.user.plan == "free":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found")

    user = link.user
    streaks = compute_streak_info(db, user.id)
    consistency_pct = compute_consistency_pct(db, user.id)

    # This week's progress, same window as the dashboard's own "This week"
    # card -- an all-time total wouldn't mean anything next to a *weekly*
    # target.
    today = date.today()
    this_week_start = today - timedelta(days=today.weekday())

    categories = db.query(models.Category).filter(models.Category.user_id == user.id).all()
    category_progress = []
    for category in categories:
        sessions = (
            db.query(models.StudySession)
            .filter(
                models.StudySession.user_id == user.id,
                models.StudySession.category_id == category.id,
                models.StudySession.date >= this_week_start,
            )
            .all()
        )
        if category.tracking_mode == "hours":
            current = sum(s.duration_minutes for s in sessions) / 60
        else:
            current = float(len([s for s in sessions if s.duration_minutes >= 45]))
        category_progress.append(
            schemas.SharedCategoryProgressOut(
                name=category.name,
                color=category.color,
                tracking_mode=category.tracking_mode,
                weekly_target=category.weekly_target,
                current=current,
            )
        )

    return schemas.SharedProgressOut(
        user_name=user.name,
        user_avatar=user.avatar,
        current_streak=streaks.current.length,
        longest_streak=streaks.longest.length,
        consistency_pct=consistency_pct,
        categories=category_progress,
    )

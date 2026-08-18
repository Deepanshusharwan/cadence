from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])

ACCENT_CLASSES = [
    "bg-marigold",
    "bg-terracotta",
    "bg-signal-blue",
    "bg-sky-wash",
    "bg-orchid",
    "bg-midnight-ink",
]


@router.get("", response_model=list[schemas.CategoryOut])
def list_categories(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Category).filter(models.Category.user_id == user.id).all()


@router.post("", response_model=schemas.CategoryOut, status_code=201)
def create_category(
    payload: schemas.CategoryCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(models.Category).filter(models.Category.user_id == user.id).count()
    category = models.Category(
        user_id=user.id,
        color=ACCENT_CLASSES[count % len(ACCENT_CLASSES)],
        **payload.model_dump(),
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=schemas.CategoryOut)
def update_category(
    category_id: str,
    payload: schemas.CategoryUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = (
        db.query(models.Category)
        .filter(models.Category.id == category_id, models.Category.user_id == user.id)
        .first()
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    changes = payload.model_dump(exclude_unset=True)
    if "tracking_mode" in changes and changes["tracking_mode"] != category.tracking_mode:
        has_sessions = (
            db.query(models.StudySession).filter(models.StudySession.category_id == category_id).first()
            is not None
        )
        if has_sessions:
            raise HTTPException(
                status_code=400,
                detail="Can't change hours/sessions tracking on a category with logged sessions "
                "— it would re-interpret their existing history under a different rule. "
                "Create a new category instead.",
            )

    for field, value in changes.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = (
        db.query(models.Category)
        .filter(models.Category.id == category_id, models.Category.user_id == user.id)
        .first()
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()

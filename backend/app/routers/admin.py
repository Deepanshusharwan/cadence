from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import get_settings
from ..db import get_db
from ..deps import get_admin_email, get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[schemas.AdminUserOut])
def list_users(
    _admin_email: str = Depends(get_admin_email),
    db: Session = Depends(get_db),
):
    return db.query(models.User).order_by(desc(models.User.created_at)).all()


@router.get("/emails", response_model=list[schemas.AdminEmailOut])
def list_admin_emails(
    _admin_email: str = Depends(get_admin_email),
    db: Session = Depends(get_db),
):
    added = db.query(models.AdminEmail).order_by(models.AdminEmail.created_at).all()
    added_lower = {row.email.lower() for row in added}
    seed = [
        schemas.AdminEmailOut(id=None, email=e, source="seed")
        for e in get_settings().admin_emails
        if e.lower() not in added_lower
    ]
    return seed + [schemas.AdminEmailOut(id=row.id, email=row.email, source="added") for row in added]


@router.post("/emails", response_model=schemas.AdminEmailOut, status_code=201)
def add_admin_email(
    payload: schemas.AdminEmailCreate,
    _admin_email: str = Depends(get_admin_email),
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email")

    seed = {e.lower() for e in get_settings().admin_emails}
    existing = {row.email.lower() for row in db.query(models.AdminEmail).all()}
    if email in seed or email in existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already allowlisted")

    row = models.AdminEmail(email=email)
    db.add(row)
    db.commit()
    db.refresh(row)
    return schemas.AdminEmailOut(id=row.id, email=row.email, source="added")


@router.delete("/emails/{email_id}", status_code=204)
def remove_admin_email(
    email_id: str,
    admin_email: str = Depends(get_admin_email),
    db: Session = Depends(get_db),
):
    row = db.get(models.AdminEmail, email_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    if row.email.lower() == admin_email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can't remove your own access this way — edit ADMIN_EMAILS in .env instead",
        )
    db.delete(row)
    db.commit()


@router.patch("/users/{user_id}/plan", response_model=schemas.UserOut)
def set_user_plan(
    user_id: str,
    payload: schemas.PlanUpdate,
    _admin_email: str = Depends(get_admin_email),
    db: Session = Depends(get_db),
):
    """The only way plan ever changes right now — there's no billing
    integration, so this is a manual grant until one exists. Deliberately
    not exposed on PATCH /me (see schemas.UserUpdate).
    """
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.plan = payload.plan
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/banned", response_model=schemas.AdminUserOut)
def set_user_banned(
    user_id: str,
    payload: schemas.BannedUpdate,
    _admin_email: str = Depends(get_admin_email),
    acting_admin: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Banning is enforced centrally in deps.get_current_user (raises 403
    on every route, not just ones that check it themselves) and is fully
    reversible — this never deletes data, just blocks access.
    """
    if user_id == acting_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can't ban your own account — you'd lock yourself out with no way back in",
        )
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.banned = payload.banned
    db.commit()
    db.refresh(user)
    return user

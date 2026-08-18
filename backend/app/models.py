import uuid
from datetime import UTC, date as Date
from datetime import datetime

from sqlalchemy import Boolean, Date as SQLDate, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(UTC)


class User(Base):
    """Keyed off the Clerk user ID (architecture.md §3) rather than an
    internal auto-increment id — the token subject *is* the primary key.
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # Clerk user id
    name: Mapped[str] = mapped_column(String, default="")
    avatar: Mapped[str] = mapped_column(String, default="cat")
    # "free" | "plus" | "pro". No billing integration exists yet (see
    # docs/deployment.md / the pricing-plan work) — nothing sets this except
    # the admin-only PATCH /admin/users/{id}/plan, reusing the same
    # email-allowlist gate as GET /feedback. Deliberately absent from
    # UserUpdate (self-service PATCH /me) so a user can never grant
    # themselves a paid plan.
    plan: Mapped[str] = mapped_column(String, default="free")
    timezone: Mapped[str] = mapped_column(String, default="UTC")
    wake_start: Mapped[str] = mapped_column(String, default="06:00")
    wake_end: Mapped[str] = mapped_column(String, default="08:00")
    leave_monthly_allowance: Mapped[int] = mapped_column(Integer, default=7)
    leave_carry_cap: Mapped[int] = mapped_column(Integer, default=14)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    categories: Mapped[list["Category"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    anchors: Mapped[list["ScheduleAnchor"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["StudySession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    events: Mapped[list["CadenceEvent"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    day_entries: Mapped[list["DayEntry"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reviews: Mapped[list["WeeklyReview"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    tracking_mode: Mapped[str] = mapped_column(String)  # "hours" | "sessions"
    weekly_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    priority_tier: Mapped[int] = mapped_column(Integer, default=1)
    weekend_preferred: Mapped[bool] = mapped_column(Boolean, default=False)
    color: Mapped[str] = mapped_column(String, default="bg-marigold")

    user: Mapped[User] = relationship(back_populates="categories")


class ScheduleAnchor(Base):
    __tablename__ = "anchors"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    label: Mapped[str] = mapped_column(String)
    start: Mapped[str] = mapped_column(String)  # "HH:MM"
    end: Mapped[str] = mapped_column(String)
    recurrence: Mapped[str] = mapped_column(String)  # "daily" | "weekly" | "once"
    days_of_week: Mapped[list[int]] = mapped_column(JSON, default=list)
    date: Mapped[Date | None] = mapped_column(SQLDate, nullable=True)
    is_focus_block: Mapped[bool] = mapped_column(Boolean, default=True)
    category_ids: Mapped[list[str]] = mapped_column(JSON, default=list)

    user: Mapped[User] = relationship(back_populates="anchors")


class StudySession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    # SET NULL on category delete (not cascade-delete) — a logged session is a
    # historical fact (spec §105) and must survive its category being removed.
    category_id: Mapped[str | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    date: Mapped[Date] = mapped_column(SQLDate, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    user: Mapped[User] = relationship(back_populates="sessions")


class CadenceEvent(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    date: Mapped[Date] = mapped_column(SQLDate, index=True)
    start: Mapped[str] = mapped_column(String)
    end: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)  # EventType
    notes: Mapped[str] = mapped_column(String, default="")

    user: Mapped[User] = relationship(back_populates="events")


class DayEntry(Base):
    """One row per (user, date) that's been explicitly marked — unmarked
    days are implicitly NORMAL and never get a row (spec §8, DayStatus).
    """

    __tablename__ = "day_entries"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    date: Mapped[Date] = mapped_column(SQLDate, primary_key=True)
    day_type: Mapped[str] = mapped_column(String)  # NORMAL | REDUCED | LEAVE | MISSED

    user: Mapped[User] = relationship(back_populates="day_entries")


class Feedback(Base):
    """User-submitted improvement/feature requests (settings 'Send feedback').

    Deliberately no FK-cascade relationship back on User — feedback is meant
    to survive independently of the submitting account for review purposes,
    unlike e.g. sessions which are per-user history.
    """

    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String)  # "bug" | "idea" | "other"
    message: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class AdminEmail(Base):
    """Emails added to the GET /feedback allowlist from the admin UI, on top
    of the permanent baseline in config.admin_emails (env-only, not
    editable here — see deps.get_admin_email). Not tied to a Clerk/User
    row: an email can be allowlisted before that person has ever signed up.
    """

    __tablename__ = "admin_emails"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class WeeklyReview(Base):
    __tablename__ = "reviews"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    week_start: Mapped[Date] = mapped_column(SQLDate, primary_key=True)
    wins: Mapped[str] = mapped_column(String, default="")
    problems: Mapped[str] = mapped_column(String, default="")
    next_week_changes: Mapped[str] = mapped_column(String, default="")

    user: Mapped[User] = relationship(back_populates="reviews")

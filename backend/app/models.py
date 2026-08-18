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
    # One of the existing design-system accent tokens (e.g. "notion-blue",
    # "coral", "marigold") -- self-service like avatar, no Plus check at
    # the model/DB level (the picker UI itself is what's gated, same as
    # every other cosmetic Plus feature in this app).
    accent_color: Mapped[str] = mapped_column(String, default="notion-blue")
    # "free" | "plus" | "pro". No billing integration exists yet (see
    # docs/deployment.md / the pricing-plan work) — nothing sets this except
    # the admin-only PATCH /admin/users/{id}/plan, reusing the same
    # email-allowlist gate as GET /feedback. Deliberately absent from
    # UserUpdate (self-service PATCH /me) so a user can never grant
    # themselves a paid plan.
    plan: Mapped[str] = mapped_column(String, default="free")
    # Same admin-only story as `plan` — set only via PATCH /admin/users/{id}/banned,
    # never through PATCH /me. Enforced centrally in deps.get_current_user
    # (raises 403 there) so every endpoint is blocked uniformly, not just
    # ones that happen to check it themselves.
    banned: Mapped[bool] = mapped_column(Boolean, default=False)
    # True the first time a subscription_created webhook is ever seen for
    # this user, regardless of which variant/cadence — used to force
    # `skip_trial` on any later checkout (see app/lemonsqueezy.py,
    # POST /billing/checkout) so trialing Monthly, cancelling, then
    # trialing Quarterly doesn't grant a second free trial period.
    trial_used: Mapped[bool] = mapped_column(Boolean, default=False)
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
    share_links: Mapped[list["ShareLink"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    calendar_feed_tokens: Mapped[list["CalendarFeedToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class ShareLink(Base):
    """A read-only, unauthenticated view onto one user's progress (Plus-only,
    see routers/sharing.py). `id` doubles as the unguessable share token
    itself -- deliberately not the Clerk user id, so GET /share/{token}
    never resolves by account identity (see that route's own docstring).
    """

    __tablename__ = "share_links"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="share_links")


class CalendarFeedToken(Base):
    """Same shape and lifecycle as ShareLink above -- a separate model
    (rather than a `kind` discriminator on ShareLink) so a user can revoke
    their calendar feed without killing their progress share, or vice
    versa. See routers/calendar_feed.py.
    """

    __tablename__ = "calendar_feed_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="calendar_feed_tokens")


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

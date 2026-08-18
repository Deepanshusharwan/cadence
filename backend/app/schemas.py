from datetime import date as Date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

TrackingMode = Literal["hours", "sessions"]
AnchorRecurrence = Literal["daily", "weekly", "once"]
DayType = Literal["NORMAL", "REDUCED", "LEAVE", "MISSED"]
EventType = Literal["SCHOOL_OR_WORK", "SOCIAL", "PERSONAL", "TRAVEL", "OTHER"]
FeedbackType = Literal["bug", "idea", "review", "other"]
PlanType = Literal["free", "plus", "pro"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- User / settings ---------------------------------------------------


class UserOut(ORMModel):
    id: str
    name: str
    avatar: str
    timezone: str
    wake_start: str
    wake_end: str
    leave_monthly_allowance: int
    leave_carry_cap: int
    notifications_enabled: bool
    onboarded: bool
    plan: PlanType


class UserUpdate(BaseModel):
    # No `plan` here on purpose — see models.User.plan. Self-service updates
    # can never touch it.
    name: str | None = None
    avatar: str | None = None
    timezone: str | None = None
    wake_start: str | None = None
    wake_end: str | None = None
    leave_monthly_allowance: int | None = None
    leave_carry_cap: int | None = None
    notifications_enabled: bool | None = None
    onboarded: bool | None = None


class PlanUpdate(BaseModel):
    plan: PlanType


class BannedUpdate(BaseModel):
    banned: bool


class CheckoutCreate(BaseModel):
    variant_id: str


class CheckoutOut(BaseModel):
    url: str


# --- Category ------------------------------------------------------------


class CategoryCreate(BaseModel):
    name: str
    tracking_mode: TrackingMode
    weekly_target: float | None = None
    priority_tier: int = 1
    weekend_preferred: bool = False


class CategoryUpdate(BaseModel):
    name: str | None = None
    tracking_mode: TrackingMode | None = None
    weekly_target: float | None = None
    priority_tier: int | None = None
    weekend_preferred: bool | None = None


class CategoryOut(ORMModel):
    id: str
    name: str
    tracking_mode: TrackingMode
    weekly_target: float | None
    priority_tier: int
    weekend_preferred: bool
    color: str


# --- ScheduleAnchor --------------------------------------------------------


class AnchorCreate(BaseModel):
    label: str
    start: str
    end: str
    recurrence: AnchorRecurrence
    days_of_week: list[int] = []
    date: Date | None = None
    is_focus_block: bool = True
    category_ids: list[str] = []


class AnchorUpdate(BaseModel):
    label: str | None = None
    start: str | None = None
    end: str | None = None
    recurrence: AnchorRecurrence | None = None
    days_of_week: list[int] | None = None
    date: Date | None = None
    is_focus_block: bool | None = None
    category_ids: list[str] | None = None


class AnchorOut(ORMModel):
    id: str
    label: str
    start: str
    end: str
    recurrence: AnchorRecurrence
    days_of_week: list[int]
    date: Date | None
    is_focus_block: bool
    category_ids: list[str]


# --- StudySession ----------------------------------------------------------


class SessionCreate(BaseModel):
    category_id: str
    date: Date
    duration_minutes: int
    tags: list[str] = []


class SessionUpdate(BaseModel):
    category_id: str | None = None
    date: Date | None = None
    duration_minutes: int | None = None
    tags: list[str] | None = None


class SessionOut(ORMModel):
    id: str
    category_id: str | None
    date: Date
    duration_minutes: int
    tags: list[str]


# --- CadenceEvent ------------------------------------------------------------


class EventCreate(BaseModel):
    title: str
    date: Date
    start: str
    end: str
    type: EventType
    notes: str = ""


class EventOut(ORMModel):
    id: str
    title: str
    date: Date
    start: str
    end: str
    type: EventType
    notes: str


# --- DayEntry ----------------------------------------------------------------


class DayEntrySet(BaseModel):
    day_type: DayType


class DayEntryOut(BaseModel):
    date: Date
    day_type: DayType


# --- WeeklyReview --------------------------------------------------------------


class ReviewUpsert(BaseModel):
    wins: str | None = None
    problems: str | None = None
    next_week_changes: str | None = None


class ReviewOut(BaseModel):
    week_start: Date
    wins: str
    problems: str
    next_week_changes: str


# --- Feedback ------------------------------------------------------------------


class FeedbackCreate(BaseModel):
    type: FeedbackType
    message: str


class FeedbackOut(ORMModel):
    id: str
    type: FeedbackType
    message: str
    created_at: datetime


class FeedbackAdminOut(BaseModel):
    """GET /feedback (admin-only) — adds who sent it, joined from the User
    table rather than a stored relationship (see models.Feedback).
    """

    id: str
    type: FeedbackType
    message: str
    created_at: datetime
    user_id: str
    user_name: str
    user_avatar: str


# --- Admin allowlist -------------------------------------------------------------


class AdminEmailCreate(BaseModel):
    email: str


class AdminEmailOut(BaseModel):
    # None for the env-configured baseline — those have no DB row and can't
    # be removed via the API (see deps.get_admin_email / routers/admin.py).
    id: str | None
    email: str
    source: Literal["seed", "added"]


class AdminUserOut(ORMModel):
    """GET /admin/users — for manually granting plans (see models.User.plan)
    until real billing exists. No email here on purpose: resolving it per
    row would mean one live Clerk API call per user in the list, which
    doesn't belong on a list endpoint (see auth.get_clerk_primary_email's
    own docstring on why it's scoped to a single rarely-called route).
    """

    id: str
    name: str
    avatar: str
    plan: PlanType
    banned: bool
    onboarded: bool
    created_at: datetime


# --- Computed / read models -----------------------------------------------------


class LeaveBalanceOut(BaseModel):
    monthly_allowance: int
    carried: int
    total_available: int
    used: int
    remaining: int
    cap: int


class StreakRunOut(BaseModel):
    length: int
    dates: list[str]


class StreakInfoOut(BaseModel):
    current: StreakRunOut
    longest: StreakRunOut


class InsightOut(BaseModel):
    id: str
    text: str


# --- Long Term analytics (Plus-only, GET /analytics/long-term) -----------------


class MonthlyCategoryTotalOut(BaseModel):
    month: str  # "YYYY-MM"
    category_id: str
    minutes: int
    session_count: int


class MonthlyConsistencyOut(BaseModel):
    month: str  # "YYYY-MM"
    pct: int


class LongTermTrendOut(BaseModel):
    months: list[MonthlyCategoryTotalOut]
    monthly_consistency_pct: list[MonthlyConsistencyOut]


# --- Data export (Plus-only, GET /export/json, GET /export/csv) ---------------


class ShareLinkOut(BaseModel):
    token: str
    created_at: datetime


class SharedCategoryProgressOut(BaseModel):
    name: str
    color: str
    tracking_mode: TrackingMode
    weekly_target: float | None
    current: float


class SharedProgressOut(BaseModel):
    """GET /share/{token} — deliberately thin: no raw session history/tags,
    no category ids, nothing beyond what's needed to show someone else the
    shape of your progress. See routers/sharing.py.
    """

    user_name: str
    user_avatar: str
    current_streak: int
    longest_streak: int
    consistency_pct: int
    categories: list[SharedCategoryProgressOut]


class CalendarFeedOut(BaseModel):
    token: str
    created_at: datetime


class ExportOut(BaseModel):
    exported_at: datetime
    sessions: list[SessionOut]
    categories: list[CategoryOut]
    reviews: list[ReviewOut]
    events: list[EventOut]
    day_entries: list[DayEntryOut]

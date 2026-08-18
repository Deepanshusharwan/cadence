from datetime import date as Date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

TrackingMode = Literal["hours", "sessions"]
AnchorRecurrence = Literal["daily", "weekly", "once"]
DayType = Literal["NORMAL", "REDUCED", "LEAVE", "MISSED"]
EventType = Literal["SCHOOL_OR_WORK", "SOCIAL", "PERSONAL", "TRAVEL", "OTHER"]
FeedbackType = Literal["bug", "idea", "other"]


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


class UserUpdate(BaseModel):
    name: str | None = None
    avatar: str | None = None
    timezone: str | None = None
    wake_start: str | None = None
    wake_end: str | None = None
    leave_monthly_allowance: int | None = None
    leave_carry_cap: int | None = None
    notifications_enabled: bool | None = None
    onboarded: bool | None = None


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

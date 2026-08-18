"""Streaks (spec-adjacent, forgiving-streak product decision) and
descriptive trend insights (spec §92). Ported from the web client's
`streakInfo()`/`insights()` in lib/store.tsx.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from .. import models
from ..schemas import (
    InsightOut,
    LongTermTrendOut,
    MonthlyCategoryTotalOut,
    MonthlyConsistencyOut,
    StreakInfoOut,
    StreakRunOut,
)

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _add_month(d: date) -> date:
    return date(d.year + 1, 1, 1) if d.month == 12 else date(d.year, d.month + 1, 1)


def _sub_month(d: date) -> date:
    return date(d.year - 1, 12, 1) if d.month == 1 else date(d.year, d.month - 1, 1)


def compute_streak_info(db: Session, user_id: str, today: date | None = None) -> StreakInfoOut:
    today = today or date.today()

    logged_dates = {
        d for (d,) in db.query(models.StudySession.date).filter(models.StudySession.user_id == user_id).distinct()
    }
    day_types = {
        d: t
        for d, t in db.query(models.DayEntry.date, models.DayEntry.day_type).filter(
            models.DayEntry.user_id == user_id
        )
    }

    def is_kept(d: date) -> bool:
        return d in logged_dates or day_types.get(d) == "REDUCED"

    def is_leave(d: date) -> bool:
        return day_types.get(d) == "LEAVE"

    known_dates = logged_dates | set(day_types.keys())
    if not known_dates:
        empty = StreakRunOut(length=0, dates=[])
        return StreakInfoOut(current=empty, longest=empty)

    cursor = min(known_dates)
    last_date = today if (is_kept(today) or is_leave(today)) else today - timedelta(days=1)

    run_dates: list[date] = []
    run_kept = 0
    best_dates: list[date] = []
    best_kept = 0

    while cursor <= last_date:
        if is_leave(cursor):
            if run_dates:
                run_dates.append(cursor)
        elif is_kept(cursor):
            run_dates.append(cursor)
            run_kept += 1
        else:
            if run_kept > best_kept:
                best_kept = run_kept
                best_dates = run_dates
            run_dates = []
            run_kept = 0
        cursor += timedelta(days=1)

    if run_kept > best_kept:
        best_kept = run_kept
        best_dates = run_dates

    return StreakInfoOut(
        current=StreakRunOut(length=run_kept, dates=[d.isoformat() for d in run_dates]),
        longest=StreakRunOut(length=best_kept, dates=[d.isoformat() for d in best_dates]),
    )


def compute_insights(db: Session, user_id: str, today: date | None = None) -> list[InsightOut]:
    today = today or date.today()
    results: list[InsightOut] = []

    this_week_start = today - timedelta(days=today.weekday())  # Monday
    categories = db.query(models.Category).filter(models.Category.user_id == user_id).all()

    for category in categories:
        if category.weekly_target is None:
            continue
        behind_streak = True
        for weeks_ago in (1, 2, 3):
            week_start = this_week_start - timedelta(days=weeks_ago * 7)
            week_end = week_start + timedelta(days=7)
            week_sessions = (
                db.query(models.StudySession)
                .filter(
                    models.StudySession.user_id == user_id,
                    models.StudySession.category_id == category.id,
                    models.StudySession.date >= week_start,
                    models.StudySession.date < week_end,
                )
                .all()
            )
            if category.tracking_mode == "hours":
                total = sum(s.duration_minutes for s in week_sessions) / 60
            else:
                total = len([s for s in week_sessions if s.duration_minutes >= 45])
            if total >= category.weekly_target:
                behind_streak = False
                break
        if behind_streak:
            results.append(
                InsightOut(
                    id=f"behind-{category.id}",
                    text=f"{category.name} has been below target for 3 weeks running.",
                )
            )

    by_weekday = [{"total": 0, "missed": 0} for _ in range(7)]
    day_entries = db.query(models.DayEntry).filter(models.DayEntry.user_id == user_id).all()
    for entry in day_entries:
        weekday = entry.date.weekday()  # 0 = Monday
        by_weekday[weekday]["total"] += 1
        if entry.day_type == "MISSED":
            by_weekday[weekday]["missed"] += 1

    worst_day = -1
    worst_rate = 0.0
    for weekday in range(7):
        total = by_weekday[weekday]["total"]
        if total < 3:
            continue
        rate = by_weekday[weekday]["missed"] / total
        if rate > worst_rate:
            worst_rate = rate
            worst_day = weekday

    if worst_day != -1 and worst_rate >= 0.4:
        results.append(
            InsightOut(
                id=f"missed-weekday-{worst_day}",
                text=f"{WEEKDAY_NAMES[worst_day]}s have a high missed-day rate ({round(worst_rate * 100)}%).",
            )
        )

    # Month-over-month direction, comparing the last two *completed*
    # calendar months -- needs real history, unlike the two rules above.
    this_month_start = date(today.year, today.month, 1)
    last_month_start = _sub_month(this_month_start)
    prev_month_start = _sub_month(last_month_start)
    for category in categories:
        if category.weekly_target is None:
            continue

        def _month_total(start: date, end: date) -> float:
            sessions = (
                db.query(models.StudySession)
                .filter(
                    models.StudySession.user_id == user_id,
                    models.StudySession.category_id == category.id,
                    models.StudySession.date >= start,
                    models.StudySession.date < end,
                )
                .all()
            )
            if category.tracking_mode == "hours":
                return sum(s.duration_minutes for s in sessions) / 60
            return float(len([s for s in sessions if s.duration_minutes >= 45]))

        prev_total = _month_total(prev_month_start, last_month_start)
        last_total = _month_total(last_month_start, this_month_start)
        if prev_total <= 0:
            continue
        change = (last_total - prev_total) / prev_total
        if change >= 0.25:
            results.append(
                InsightOut(
                    id=f"trend-up-{category.id}",
                    text=f"{category.name} grew {round(change * 100)}% month-over-month.",
                )
            )
        elif change <= -0.25:
            results.append(
                InsightOut(
                    id=f"trend-down-{category.id}",
                    text=f"{category.name} dropped {round(abs(change) * 100)}% month-over-month.",
                )
            )

    return results


def compute_consistency_pct(db: Session, user_id: str, window_days: int = 30, today: date | None = None) -> int:
    """Same "kept vs. eligible" definition as the monthly consistency in
    compute_long_term_trend below (and the client's own duplicate of this
    for the always-visible free-tier 30-day card, lib/store.tsx-adjacent
    progress/page.tsx) -- used here for the read-only share view, which has
    no client state to compute from.
    """
    today = today or date.today()
    window_start = today - timedelta(days=window_days - 1)

    logged_dates = {
        d
        for (d,) in db.query(models.StudySession.date)
        .filter(models.StudySession.user_id == user_id, models.StudySession.date >= window_start)
        .distinct()
    }
    day_types = {
        d: t
        for d, t in db.query(models.DayEntry.date, models.DayEntry.day_type).filter(
            models.DayEntry.user_id == user_id, models.DayEntry.date >= window_start
        )
    }

    eligible = 0
    kept = 0
    d = window_start
    while d <= today:
        day_type = day_types.get(d, "NORMAL")
        if day_type != "LEAVE":
            eligible += 1
            if d in logged_dates or day_type == "REDUCED":
                kept += 1
        d += timedelta(days=1)

    return round((kept / eligible) * 100) if eligible else 0


def compute_long_term_trend(
    db: Session, user_id: str, months: int = 12, today: date | None = None
) -> LongTermTrendOut:
    """Monthly category totals + monthly consistency, for the Plus-only
    Long Term view (spec §91's named-but-unbuilt "Long-term" analytics
    bucket, distinct from the Weekly/Monthly views everyone already has).
    """
    today = today or date.today()

    bucket_starts: list[date] = []
    cursor = date(today.year, today.month, 1)
    for _ in range(months):
        bucket_starts.append(cursor)
        cursor = date(cursor.year - 1, 12, 1) if cursor.month == 1 else date(cursor.year, cursor.month - 1, 1)
    bucket_starts.reverse()
    earliest = bucket_starts[0]

    sessions = (
        db.query(models.StudySession)
        .filter(models.StudySession.user_id == user_id, models.StudySession.date >= earliest)
        .all()
    )
    totals: dict[tuple[str, str], dict[str, int]] = {}
    for s in sessions:
        if s.category_id is None:
            continue
        bucket = totals.setdefault((_month_key(s.date), s.category_id), {"minutes": 0, "count": 0})
        bucket["minutes"] += s.duration_minutes
        bucket["count"] += 1

    months_out = [
        MonthlyCategoryTotalOut(month=mk, category_id=cid, minutes=v["minutes"], session_count=v["count"])
        for (mk, cid), v in sorted(totals.items())
    ]

    logged_dates = {
        d
        for (d,) in db.query(models.StudySession.date)
        .filter(models.StudySession.user_id == user_id, models.StudySession.date >= earliest)
        .distinct()
    }
    day_types = {
        d: t
        for d, t in db.query(models.DayEntry.date, models.DayEntry.day_type).filter(
            models.DayEntry.user_id == user_id, models.DayEntry.date >= earliest
        )
    }

    def is_kept(d: date) -> bool:
        return d in logged_dates or day_types.get(d) == "REDUCED"

    def is_leave(d: date) -> bool:
        return day_types.get(d) == "LEAVE"

    consistency: list[MonthlyConsistencyOut] = []
    for start in bucket_starts:
        end = min(_add_month(start), today + timedelta(days=1))  # never count future days
        eligible = 0
        kept = 0
        d = start
        while d < end:
            if not is_leave(d):
                eligible += 1
                if is_kept(d):
                    kept += 1
            d += timedelta(days=1)
        pct = round((kept / eligible) * 100) if eligible else 0
        consistency.append(MonthlyConsistencyOut(month=_month_key(start), pct=pct))

    return LongTermTrendOut(months=months_out, monthly_consistency_pct=consistency)

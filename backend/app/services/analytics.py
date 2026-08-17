"""Streaks (spec-adjacent, forgiving-streak product decision) and
descriptive trend insights (spec §92). Ported from the web client's
`streakInfo()`/`insights()` in lib/store.tsx.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from .. import models
from ..schemas import InsightOut, StreakInfoOut, StreakRunOut

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


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

    return results

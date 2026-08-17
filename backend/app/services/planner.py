"""Deterministic deficit/priority scheduling (spec §74-76). Ported from the
web client's dashboard `progress`/`rankedForFocus`/`scheduleBlocks` logic —
this is the piece architecture.md §2 says must live only in the backend.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from .. import models


def _start_of_week(d: date) -> date:
    return d - timedelta(days=d.weekday())  # Monday


def _anchor_applies_on(anchor: models.ScheduleAnchor, on_date: date, weekday_sun0: int) -> bool:
    if anchor.recurrence == "once":
        return anchor.date == on_date
    if anchor.recurrence == "weekly":
        return weekday_sun0 in (anchor.days_of_week or [])
    return True  # daily


def category_progress(db: Session, user_id: str, on_date: date | None = None) -> list[dict]:
    """Per-category current/deficit for the week containing `on_date`."""
    on_date = on_date or date.today()
    week_start = _start_of_week(on_date)
    week_end = week_start + timedelta(days=7)

    categories = db.query(models.Category).filter(models.Category.user_id == user_id).all()
    sessions = (
        db.query(models.StudySession)
        .filter(
            models.StudySession.user_id == user_id,
            models.StudySession.date >= week_start,
            models.StudySession.date < week_end,
        )
        .all()
    )

    results = []
    for category in categories:
        cat_sessions = [s for s in sessions if s.category_id == category.id]
        minutes = sum(s.duration_minutes for s in cat_sessions)
        session_count = len([s for s in cat_sessions if s.duration_minutes >= 45])
        current = minutes / 60 if category.tracking_mode == "hours" else session_count
        deficit = (
            float("-inf") if category.weekly_target is None else category.weekly_target - current
        )
        results.append(
            {
                "category": category,
                "current": current,
                "minutes": minutes,
                "sessions": session_count,
                "deficit": deficit,
            }
        )
    return results


def _rank_categories(cats: list[models.Category], progress: list[dict]) -> list[models.Category]:
    deficit_by_id = {p["category"].id: p["deficit"] for p in progress}

    def sort_key(c: models.Category):
        return (c.priority_tier, -deficit_by_id.get(c.id, 0))

    return sorted(cats, key=sort_key)


def todays_schedule(db: Session, user_id: str, on_date: date | None = None) -> list[dict]:
    on_date = on_date or date.today()
    weekday_sun0 = (on_date.weekday() + 1) % 7  # Python Mon=0 -> JS Sun=0 convention

    progress = category_progress(db, user_id, on_date)
    ranked_for_focus = sorted(
        (p for p in progress if p["category"].weekly_target is not None),
        key=lambda p: (p["category"].priority_tier, -p["deficit"]),
    )

    categories_by_id = {p["category"].id: p["category"] for p in progress}

    anchors = (
        db.query(models.ScheduleAnchor)
        .filter(models.ScheduleAnchor.user_id == user_id)
        .all()
    )
    todays_anchors = sorted(
        (a for a in anchors if _anchor_applies_on(a, on_date, weekday_sun0)),
        key=lambda a: a.start,
    )
    unpinned_focus = [a for a in todays_anchors if a.is_focus_block and not a.category_ids]

    blocks: list[dict] = []
    for anchor in todays_anchors:
        pinned = [categories_by_id[cid] for cid in anchor.category_ids if cid in categories_by_id]

        if not anchor.is_focus_block:
            label = anchor.label
            if pinned:
                label = f"{anchor.label} ({', '.join(c.name for c in pinned)})"
            blocks.append({"start": anchor.start, "time": f"{anchor.start}–{anchor.end}", "label": label, "dim": True, "is_event": False})
            continue

        if pinned:
            top = _rank_categories(pinned, progress)[0]
            blocks.append({"start": anchor.start, "time": f"{anchor.start}–{anchor.end}", "label": top.name, "dim": False, "is_event": False})
            continue

        focus_index = next((i for i, a in enumerate(unpinned_focus) if a.id == anchor.id), 0)
        pick = ranked_for_focus[focus_index % len(ranked_for_focus)] if ranked_for_focus else None
        label = pick["category"].name if pick else "Add a category to plan this"
        blocks.append({"start": anchor.start, "time": f"{anchor.start}–{anchor.end}", "label": label, "dim": False, "is_event": False})

    events = (
        db.query(models.CadenceEvent)
        .filter(models.CadenceEvent.user_id == user_id, models.CadenceEvent.date == on_date)
        .all()
    )
    for event in events:
        blocks.append(
            {
                "start": event.start,
                "time": f"{event.start}–{event.end}",
                "label": event.title,
                "dim": False,
                "is_event": True,
            }
        )

    blocks.sort(key=lambda b: b["start"])
    return blocks

"""Leave balance with one-month carry-forward (spec §13-15).

Ported from the web client's `leaveBalance()` in lib/store.tsx — kept
numerically identical on purpose so migrating a user from the localStorage
prototype to this backend doesn't change their balance.
"""

from datetime import date

from sqlalchemy.orm import Session

from .. import models
from ..schemas import LeaveBalanceOut


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def _leave_used_in_month(db: Session, user_id: str, year: int, month: int) -> int:
    start, end = _month_bounds(year, month)
    rows = (
        db.query(models.DayEntry.day_type)
        .filter(
            models.DayEntry.user_id == user_id,
            models.DayEntry.date >= start,
            models.DayEntry.date < end,
        )
        .all()
    )
    used = 0
    for (day_type,) in rows:
        if day_type == "REDUCED":
            used += 1
        elif day_type == "LEAVE":
            used += 2
    return used


def compute_leave_balance(db: Session, user: models.User, today: date | None = None) -> LeaveBalanceOut:
    today = today or date.today()
    last_month_date = date(today.year, today.month, 1)
    last_month_date = (
        date(last_month_date.year - 1, 12, 1)
        if last_month_date.month == 1
        else date(last_month_date.year, last_month_date.month - 1, 1)
    )

    monthly_allowance = user.leave_monthly_allowance
    cap = user.leave_carry_cap

    used_last_month = _leave_used_in_month(db, user.id, last_month_date.year, last_month_date.month)
    raw_carry = max(0, monthly_allowance - used_last_month)
    max_carry = max(0, cap - monthly_allowance)
    carried = min(raw_carry, max_carry)
    total_available = monthly_allowance + carried
    used = _leave_used_in_month(db, user.id, today.year, today.month)

    return LeaveBalanceOut(
        monthly_allowance=monthly_allowance,
        carried=carried,
        total_available=total_available,
        used=used,
        remaining=total_available - used,
        cap=cap,
    )

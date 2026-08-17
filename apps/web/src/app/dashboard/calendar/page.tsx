"use client";

import { useState } from "react";
import Image from "next/image";
import { useStore, todayISO, type DayType, type Session, type Category } from "@/lib/store";
import { useToast } from "@/components/toast";

type ViewMode = "day" | "week" | "month";

const DAY_TYPE_META: Record<
  DayType,
  { label: string; cost: string; badgeClassName: string; activeClassName: string }
> = {
  NORMAL: {
    label: "Normal",
    cost: "0 units",
    badgeClassName: "bg-ink-black/5 text-ink-black/60",
    activeClassName: "bg-notion-blue text-pure-white",
  },
  REDUCED: {
    label: "Reduced",
    cost: "1 unit",
    badgeClassName: "bg-sky-tint text-notion-blue",
    activeClassName: "bg-notion-blue text-pure-white",
  },
  LEAVE: {
    label: "Full Leave",
    cost: "2 units",
    badgeClassName: "bg-marigold text-ink-black",
    activeClassName: "bg-notion-blue text-pure-white",
  },
  MISSED: {
    label: "Missed",
    cost: "0 units",
    badgeClassName: "bg-terracotta text-ink-black",
    activeClassName: "bg-notion-blue text-pure-white",
  },
};

const DAY_TYPE_ORDER: DayType[] = ["NORMAL", "REDUCED", "LEAVE", "MISSED"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function addMonths(d: Date, n: number) {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

function startOfWeekFor(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function monthGridDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const gridStart = addDays(first, -firstWeekday);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function sessionsFor(sessions: Session[], dateISO: string) {
  return sessions.filter((s) => s.date === dateISO);
}

function totalMinutesFor(sessions: Session[], dateISO: string) {
  return sessionsFor(sessions, dateISO).reduce((sum, s) => sum + s.durationMinutes, 0);
}

export default function CalendarPage() {
  const store = useStore();
  const { state } = store;
  const { show } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const today = todayISO();
  const balance = store.leaveBalance();

  function cycleDayType(dateISO: string, current: DayType, dateLabel: string) {
    const idx = DAY_TYPE_ORDER.indexOf(current);
    const next = DAY_TYPE_ORDER[(idx + 1) % DAY_TYPE_ORDER.length];
    store.setDayType(dateISO, next);
    show(`${dateLabel} marked ${DAY_TYPE_META[next].label}`);
  }

  function setDayTypeExplicit(dateISO: string, type: DayType, dateLabel: string) {
    store.setDayType(dateISO, type);
    show(`${dateLabel} marked ${DAY_TYPE_META[type].label} — ${DAY_TYPE_META[type].cost}`);
  }

  function goToDay(d: Date) {
    setAnchorDate(d);
    setViewMode("day");
  }

  function navigate(dir: 1 | -1) {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, dir));
    else if (viewMode === "week") setAnchorDate((d) => addDays(d, dir * 7));
    else setAnchorDate((d) => addMonths(d, dir));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-semibold text-ink-black">Calendar</h1>
          <p className="mt-1 text-body-sm text-ink-black/50">
            {balance.remaining} / {balance.totalAvailable} leave units left
            {balance.carried > 0 ? ` (${balance.carried} carried)` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-ink-black/5 p-1">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-body-sm font-medium capitalize transition-colors ${
                viewMode === mode
                  ? "bg-pure-white text-ink-black shadow-[0px_1px_3px_rgba(0,0,0,0.1)]"
                  : "text-ink-black/50 hover:text-ink-black"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "day" ? (
        <DayView
          date={anchorDate}
          today={today}
          dayTypes={state.dayTypes}
          sessions={state.sessions}
          categories={state.categories}
          onNavigate={navigate}
          onJumpToday={() => setAnchorDate(new Date())}
          onSetType={setDayTypeExplicit}
        />
      ) : viewMode === "week" ? (
        <WeekView
          date={anchorDate}
          today={today}
          dayTypes={state.dayTypes}
          sessions={state.sessions}
          categories={state.categories}
          onNavigate={navigate}
          onCycle={cycleDayType}
          onSelectDay={goToDay}
        />
      ) : (
        <MonthView
          date={anchorDate}
          today={today}
          dayTypes={state.dayTypes}
          sessions={state.sessions}
          onNavigate={navigate}
          onSelectDay={goToDay}
        />
      )}
    </div>
  );
}

interface SharedDayProps {
  today: string;
  dayTypes: Record<string, DayType>;
  sessions: Session[];
}

function DayView({
  date,
  today,
  dayTypes,
  sessions,
  categories,
  onNavigate,
  onJumpToday,
  onSetType,
}: SharedDayProps & {
  date: Date;
  categories: Category[];
  onNavigate: (dir: 1 | -1) => void;
  onJumpToday: () => void;
  onSetType: (dateISO: string, type: DayType, label: string) => void;
}) {
  const dateISO = toISO(date);
  const isToday = dateISO === today;
  const dayType = dayTypes[dateISO] ?? "NORMAL";
  const daySessions = sessionsFor(sessions, dateISO);
  const totalMinutes = totalMinutesFor(sessions, dateISO);
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(-1)}
          className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
        >
          ← Prev
        </button>
        <div className="text-center">
          <p className="text-body font-semibold text-ink-black">{dateLabel}</p>
          {!isToday ? (
            <button
              onClick={onJumpToday}
              className="mt-0.5 text-caption font-medium text-notion-blue hover:opacity-80"
            >
              Jump to today
            </button>
          ) : (
            <span className="mt-0.5 inline-block text-caption font-medium text-notion-blue">Today</span>
          )}
        </div>
        <button
          onClick={() => onNavigate(1)}
          className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
        >
          Next →
        </button>
      </div>

      <div className="mt-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">Day type</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAY_TYPE_ORDER.map((type) => (
            <button
              key={type}
              onClick={() => onSetType(dateISO, type, dateLabel)}
              className={`flex flex-col items-center rounded-lg px-3 py-2 text-center transition-opacity hover:opacity-90 ${
                dayType === type ? DAY_TYPE_META[type].activeClassName : DAY_TYPE_META[type].badgeClassName
              }`}
            >
              <span className="text-body-sm font-medium">{DAY_TYPE_META[type].label}</span>
              <span className="text-caption opacity-70">{DAY_TYPE_META[type].cost}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-ink-black/8 pt-5">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Sessions logged
        </p>
        {daySessions.length === 0 ? (
          <p className="mt-3 text-body-sm text-ink-black/40">Nothing logged for this day yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {daySessions.map((s) => {
              const category = categories.find((c) => c.id === s.categoryId);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-2.5"
                >
                  <span className="flex items-center gap-2 text-body-sm text-ink-black">
                    <span className={`h-2 w-2 rounded-full ${category?.color ?? "bg-ink-black/20"}`} />
                    {category?.name ?? "Deleted category"}
                  </span>
                  <span className="text-body-sm text-ink-black/50">{s.durationMinutes}m</span>
                </div>
              );
            })}
            <p className="pt-1 text-body-sm font-medium text-ink-black/60">
              {(totalMinutes / 60).toFixed(1)}h total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WeekView({
  date,
  today,
  dayTypes,
  sessions,
  categories,
  onNavigate,
  onCycle,
  onSelectDay,
}: SharedDayProps & {
  date: Date;
  categories: Category[];
  onNavigate: (dir: 1 | -1) => void;
  onCycle: (dateISO: string, current: DayType, label: string) => void;
  onSelectDay: (d: Date) => void;
}) {
  const weekStart = startOfWeekFor(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];
  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const hasAnySession = days.some((d) => sessionsFor(sessions, toISO(d)).length > 0);

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-body-sm text-ink-black/50">{rangeLabel}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate(-1)}
            className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
          >
            ← Prev
          </button>
          <button
            onClick={() => onNavigate(1)}
            className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
          >
            Next →
          </button>
        </div>
      </div>

      {!hasAnySession ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-ink-black/8 bg-pure-white py-10 text-center">
          <Image
            src="/illustrations/empty-week.png"
            alt=""
            width={340}
            height={234}
            className="h-auto w-full max-w-[220px]"
          />
          <p className="mt-4 text-body font-semibold text-ink-black">Nothing logged this week</p>
          <p className="mt-1 max-w-xs text-body-sm text-ink-black/50">
            Log a session from Today, or tap a day below to mark it retroactively.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 md:grid-cols-7">
        {days.map((d) => {
          const dateISO = toISO(d);
          const isToday = dateISO === today;
          const dayType = dayTypes[dateISO] ?? "NORMAL";
          const daySessions = sessionsFor(sessions, dateISO);
          const totalMinutes = totalMinutesFor(sessions, dateISO);
          const dateLabel = d.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={dateISO}
              className={`rounded-xl border bg-pure-white p-3 ${
                isToday ? "border-notion-blue ring-1 ring-notion-blue" : "border-ink-black/8"
              }`}
            >
              <button
                onClick={() => onSelectDay(d)}
                className="flex w-full items-center justify-between text-left hover:opacity-70"
              >
                <span className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                  {WEEKDAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]} {d.getDate()}
                </span>
                {isToday ? (
                  <span className="rounded-full bg-notion-blue px-1.5 py-0.5 text-[10px] font-semibold text-pure-white">
                    Today
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => onCycle(dateISO, dayType, dateLabel)}
                className={`mt-2 w-full rounded-full px-2 py-1 text-caption font-medium transition-opacity hover:opacity-80 ${DAY_TYPE_META[dayType].badgeClassName}`}
              >
                {DAY_TYPE_META[dayType].label}
              </button>

              <div className="mt-3 space-y-1.5">
                {daySessions.length === 0 ? (
                  <p className="text-caption text-ink-black/30">Nothing logged</p>
                ) : (
                  daySessions.map((s) => {
                    const category = categories.find((c) => c.id === s.categoryId);
                    return (
                      <div key={s.id} className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${category?.color ?? "bg-ink-black/20"}`}
                        />
                        <span className="min-w-0 flex-1 truncate text-caption text-ink-black">
                          {category?.name ?? "Deleted category"}
                        </span>
                        <span className="shrink-0 text-caption text-ink-black/40">
                          {s.durationMinutes}m
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {totalMinutes > 0 ? (
                <p className="mt-2 border-t border-ink-black/8 pt-2 text-caption font-medium text-ink-black/60">
                  {(totalMinutes / 60).toFixed(1)}h total
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

function MonthView({
  date,
  today,
  dayTypes,
  sessions,
  onNavigate,
  onSelectDay,
}: SharedDayProps & {
  date: Date;
  onNavigate: (dir: 1 | -1) => void;
  onSelectDay: (d: Date) => void;
}) {
  const cells = monthGridDays(date);
  const monthLabel = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-body-sm font-medium text-ink-black">{monthLabel}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate(-1)}
            className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
          >
            ← Prev
          </button>
          <button
            onClick={() => onNavigate(1)}
            className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <p key={w} className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
            {w}
          </p>
        ))}
        {cells.map((d) => {
          const dateISO = toISO(d);
          const inMonth = d.getMonth() === date.getMonth();
          const isToday = dateISO === today;
          const dayType = dayTypes[dateISO];
          const totalMinutes = totalMinutesFor(sessions, dateISO);

          return (
            <button
              key={dateISO}
              onClick={() => onSelectDay(d)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border p-1 transition-colors hover:bg-ink-black/5 ${
                isToday
                  ? "border-notion-blue ring-1 ring-notion-blue"
                  : inMonth
                    ? "border-ink-black/8 bg-pure-white"
                    : "border-transparent"
              } ${!inMonth ? "opacity-30" : ""}`}
            >
              <span className="text-caption text-ink-black">{d.getDate()}</span>
              {dayType ? (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${DAY_TYPE_META[dayType].badgeClassName.split(" ")[0]}`}
                />
              ) : totalMinutes > 0 ? (
                <span className="text-[9px] font-medium text-ink-black/40">
                  {(totalMinutes / 60).toFixed(1)}h
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import {
  useStore,
  todayISO,
  type DayType,
  type Session,
  type Category,
  type CadenceEvent,
  type EventType,
} from "@/lib/store";
import { useToast } from "@/components/toast";
import { FlameIcon, SparkleIcon, PencilIcon } from "@/components/icons";

type ViewMode = "day" | "week" | "month";

const DAY_TYPE_META: Record<
  DayType,
  { label: string; cost: string; badgeClassName: string; activeClassName: string }
> = {
  NORMAL: {
    label: "Normal",
    cost: "0 units",
    badgeClassName: "bg-ink-black/5 text-ink-black/60",
    activeClassName: "bg-accent text-white",
  },
  REDUCED: {
    label: "Reduced",
    cost: "1 unit",
    badgeClassName: "bg-sky-tint text-accent",
    activeClassName: "bg-accent text-white",
  },
  LEAVE: {
    label: "Full Leave",
    cost: "2 units",
    badgeClassName: "bg-marigold text-black",
    activeClassName: "bg-accent text-white",
  },
  MISSED: {
    label: "Missed",
    cost: "0 units",
    badgeClassName: "bg-terracotta text-black",
    activeClassName: "bg-accent text-white",
  },
};

const DAY_TYPE_ORDER: DayType[] = ["NORMAL", "REDUCED", "LEAVE", "MISSED"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  SCHOOL_OR_WORK: "School / Work",
  SOCIAL: "Social",
  PERSONAL: "Personal",
  TRAVEL: "Travel",
  OTHER: "Other",
};
const EVENT_TYPE_ORDER: EventType[] = ["SCHOOL_OR_WORK", "SOCIAL", "PERSONAL", "TRAVEL", "OTHER"];

const dayFormInputClass =
  "w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black outline-none transition-colors focus:border-accent";

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
  const streaks = store.streakInfo();
  const currentStreakDates = new Set(streaks.current.dates);
  const longestStreakDates = new Set(streaks.longest.dates);

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
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-ink-black/50">
            <span className="inline-flex items-center gap-1">
              <FlameIcon className="h-3.5 w-3.5 text-marigold" />
              {streaks.current.length}-day current streak
            </span>
            <span className="inline-flex items-center gap-1">
              <SparkleIcon className="h-3.5 w-3.5 text-orchid" />
              {streaks.longest.length}-day best streak
            </span>
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
          events={state.events}
          onNavigate={navigate}
          onJumpToday={() => setAnchorDate(new Date())}
          onSetType={setDayTypeExplicit}
          onUpdateSession={store.updateSession}
          onDeleteSession={store.removeSession}
          onAddEvent={store.addEvent}
          onDeleteEvent={store.removeEvent}
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
          currentStreakDates={currentStreakDates}
          longestStreakDates={longestStreakDates}
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
  events,
  onNavigate,
  onJumpToday,
  onSetType,
  onUpdateSession,
  onDeleteSession,
  onAddEvent,
  onDeleteEvent,
}: SharedDayProps & {
  date: Date;
  categories: Category[];
  events: CadenceEvent[];
  onNavigate: (dir: 1 | -1) => void;
  onJumpToday: () => void;
  onSetType: (dateISO: string, type: DayType, label: string) => void;
  onUpdateSession: (id: string, patch: Partial<Omit<Session, "id">>) => void;
  onDeleteSession: (id: string) => void;
  onAddEvent: (input: Omit<CadenceEvent, "id">) => void;
  onDeleteEvent: (id: string) => void;
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  function startEdit(s: Session) {
    setEditingId(s.id);
    setEditCategoryId(s.categoryId ?? "");
    setEditMinutes(String(s.durationMinutes));
    setEditTags(s.tags.join(", "));
  }

  function saveEdit(id: string) {
    const minutes = Number(editMinutes);
    onUpdateSession(id, {
      categoryId: editCategoryId,
      durationMinutes: minutes > 0 ? minutes : 1,
      tags: editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setEditingId(null);
  }

  const dayEvents = events
    .filter((e) => e.date === dateISO)
    .sort((a, b) => a.start.localeCompare(b.start));
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventStart, setNewEventStart] = useState("09:00");
  const [newEventEnd, setNewEventEnd] = useState("10:00");
  const [newEventType, setNewEventType] = useState<EventType>("PERSONAL");
  const [confirmingDeleteEventId, setConfirmingDeleteEventId] = useState<string | null>(null);

  function addEvent() {
    if (!newEventTitle.trim()) return;
    onAddEvent({
      title: newEventTitle.trim(),
      date: dateISO,
      start: newEventStart,
      end: newEventEnd,
      type: newEventType,
      notes: "",
    });
    setNewEventTitle("");
  }

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
              className="mt-0.5 text-caption font-medium text-accent hover:opacity-80"
            >
              Jump to today
            </button>
          ) : (
            <span className="mt-0.5 inline-block text-caption font-medium text-accent">Today</span>
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
              if (editingId === s.id) {
                return (
                  <div key={s.id} className="space-y-2 rounded-lg border border-accent/40 p-3">
                    <div className="flex gap-2">
                      <select
                        value={editCategoryId}
                        onChange={(e) => setEditCategoryId(e.target.value)}
                        className={`${dayFormInputClass} flex-1`}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(e.target.value)}
                        className={`${dayFormInputClass} w-20`}
                      />
                    </div>
                    <input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags — comma separated"
                      className={dayFormInputClass}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(s.id)}
                        className="rounded-lg bg-accent px-3 py-1.5 text-caption font-medium text-white hover:opacity-90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg px-3 py-1.5 text-caption font-medium text-ink-black/60 hover:bg-ink-black/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-ink-black/8 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <span className="flex items-center gap-2 text-body-sm text-ink-black">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${category?.color ?? "bg-ink-black/20"}`} />
                      {category?.name ?? "Deleted category"}
                    </span>
                    {s.tags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-ink-black/5 px-2 py-0.5 text-caption text-ink-black/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-body-sm text-ink-black/50">{s.durationMinutes}m</span>
                    {confirmingDeleteId === s.id ? (
                      <>
                        <button
                          onClick={() => {
                            onDeleteSession(s.id);
                            setConfirmingDeleteId(null);
                          }}
                          className="rounded-full bg-ink-black/15 px-2.5 py-1 text-caption font-semibold hover:bg-ink-black/25"
                        >
                          Yes, remove
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="rounded-full px-2.5 py-1 text-caption font-medium hover:bg-ink-black/10"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(s)}
                          aria-label="Edit session"
                          className="rounded-full p-1.5 text-ink-black/40 hover:bg-ink-black/5 hover:text-ink-black"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(s.id)}
                          aria-label="Delete session"
                          className="rounded-full px-2 py-1 text-body-sm text-ink-black/40 hover:bg-ink-black/5 hover:text-ink-black"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-body-sm font-medium text-ink-black/60">
              {(totalMinutes / 60).toFixed(1)}h total
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-ink-black/8 pt-5">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Events
        </p>
        {dayEvents.length === 0 ? (
          <p className="mt-3 text-body-sm text-ink-black/40">No events planned for this day.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {dayEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-ink-black/8 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-ink-black">{e.title}</p>
                  <p className="text-caption text-ink-black/40">
                    {e.start}–{e.end} · {EVENT_TYPE_LABELS[e.type]}
                  </p>
                </div>
                {confirmingDeleteEventId === e.id ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        onDeleteEvent(e.id);
                        setConfirmingDeleteEventId(null);
                      }}
                      className="rounded-full bg-ink-black/15 px-2.5 py-1 text-caption font-semibold hover:bg-ink-black/25"
                    >
                      Yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteEventId(null)}
                      className="rounded-full px-2.5 py-1 text-caption font-medium hover:bg-ink-black/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDeleteEventId(e.id)}
                    aria-label={`Remove ${e.title}`}
                    className="shrink-0 rounded-full px-2 py-1 text-body-sm text-ink-black/50 hover:bg-ink-black/10"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-2 rounded-xl border border-dashed border-ink-black/15 p-4">
          <input
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            placeholder="e.g. Dentist appointment"
            className={dayFormInputClass}
          />
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={newEventStart}
              onChange={(e) => setNewEventStart(e.target.value)}
              className={dayFormInputClass}
            />
            <span className="shrink-0 text-ink-black/40">–</span>
            <input
              type="time"
              value={newEventEnd}
              onChange={(e) => setNewEventEnd(e.target.value)}
              className={dayFormInputClass}
            />
          </div>
          <select
            value={newEventType}
            onChange={(e) => setNewEventType(e.target.value as EventType)}
            className={dayFormInputClass}
          >
            {EVENT_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <button
            onClick={addEvent}
            disabled={!newEventTitle.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-body-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            + Add event
          </button>
        </div>
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

      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
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
                isToday ? "border-accent ring-1 ring-accent" : "border-ink-black/8"
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
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
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
  currentStreakDates,
  longestStreakDates,
  onNavigate,
  onSelectDay,
}: SharedDayProps & {
  date: Date;
  currentStreakDates: Set<string>;
  longestStreakDates: Set<string>;
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
          const inCurrentStreak = currentStreakDates.has(dateISO);
          const inLongestStreak = longestStreakDates.has(dateISO);

          return (
            <button
              key={dateISO}
              onClick={() => onSelectDay(d)}
              className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border p-1 transition-colors hover:bg-ink-black/5 ${
                isToday
                  ? "border-accent ring-1 ring-accent"
                  : inMonth
                    ? "border-ink-black/8 bg-pure-white"
                    : "border-transparent"
              } ${!inMonth ? "opacity-30" : ""}`}
            >
              {inCurrentStreak ? (
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pure-white ring-1 ring-ink-black/8">
                  <FlameIcon className="h-2.5 w-2.5 text-marigold" />
                </span>
              ) : null}
              {inLongestStreak ? (
                <span className="absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pure-white ring-1 ring-ink-black/8">
                  <SparkleIcon className="h-2.5 w-2.5 text-orchid" />
                </span>
              ) : null}
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

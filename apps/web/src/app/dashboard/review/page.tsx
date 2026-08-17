"use client";

import { useState } from "react";
import { useStore, type DayType } from "@/lib/store";
import { useToast } from "@/components/toast";

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

function startOfWeekFor(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const DAY_TYPE_LABELS: Record<DayType, string> = {
  NORMAL: "Normal",
  REDUCED: "Reduced",
  LEAVE: "Full Leave",
  MISSED: "Missed",
};

export default function ReviewPage() {
  const store = useStore();
  const { state } = store;
  const { show } = useToast();

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeekFor(addDays(new Date(), weekOffset * 7));
  const weekEnd = addDays(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i)));
  const weekKey = toISO(weekStart);
  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  const categoryProgress = state.categories.map((c) => {
    const sessions = state.sessions.filter(
      (s) => s.categoryId === c.id && weekDates.includes(s.date)
    );
    const minutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const sessionCount = sessions.filter((s) => s.durationMinutes >= 45).length;
    const current = c.trackingMode === "hours" ? minutes / 60 : sessionCount;
    const hasTarget = c.weeklyTarget !== null;
    const met = hasTarget ? current >= (c.weeklyTarget as number) : true;
    return { category: c, current, minutes, sessionCount, hasTarget, met };
  });

  const dayTypeCounts: Record<DayType, number> = { NORMAL: 0, REDUCED: 0, LEAVE: 0, MISSED: 0 };
  for (const date of weekDates) {
    dayTypeCounts[state.dayTypes[date] ?? "NORMAL"]++;
  }

  const review = state.reviews[weekKey] ?? { wins: "", problems: "", nextWeekChanges: "" };

  function save() {
    show("Weekly review saved");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-semibold text-ink-black">Weekly Review</h1>
          <p className="mt-1 text-body-sm text-ink-black/50">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
          >
            ← Prev
          </button>
          {weekOffset !== 0 ? (
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
            >
              This week
            </button>
          ) : null}
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium hover:bg-ink-black/5"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Progress
        </p>
        {categoryProgress.length === 0 ? (
          <p className="mt-3 text-body-sm text-ink-black/40">No categories yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {categoryProgress.map(({ category, minutes, sessionCount, hasTarget, met }) => (
              <div key={category.id} className="flex items-center justify-between text-body-sm">
                <span className="flex items-center gap-2 text-ink-black">
                  <span className={`h-2 w-2 rounded-full ${category.color}`} />
                  {category.name}
                </span>
                <span className="flex items-center gap-1.5 text-ink-black/60">
                  {category.trackingMode === "hours"
                    ? `${(minutes / 60).toFixed(1)}h${hasTarget ? ` / ${category.weeklyTarget}h` : ""}`
                    : `${sessionCount}${hasTarget ? ` / ${category.weeklyTarget} sessions` : " sessions"}`}
                  {hasTarget ? <span>{met ? "✓" : "!"}</span> : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Behavior */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Behavior
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(DAY_TYPE_LABELS) as DayType[]).map((type) => (
            <div key={type}>
              <p className="text-caption text-ink-black/40">{DAY_TYPE_LABELS[type]}</p>
              <p className="text-body-sm font-medium text-ink-black">{dayTypeCounts[type]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reflection */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Reflection
        </p>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">What went well?</span>
            <textarea
              value={review.wins}
              onChange={(e) => store.saveReview(weekKey, { wins: e.target.value })}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black outline-none transition-colors focus:border-notion-blue"
            />
          </label>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">
              What got in the way? Was the schedule too aggressive, or did something fall behind?
            </span>
            <textarea
              value={review.problems}
              onChange={(e) => store.saveReview(weekKey, { problems: e.target.value })}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black outline-none transition-colors focus:border-notion-blue"
            />
          </label>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">
              What should change next week?
            </span>
            <textarea
              value={review.nextWeekChanges}
              onChange={(e) => store.saveReview(weekKey, { nextWeekChanges: e.target.value })}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black outline-none transition-colors focus:border-notion-blue"
            />
          </label>
        </div>
        <button
          onClick={save}
          className="mt-4 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
        >
          Save review
        </button>
      </div>
    </div>
  );
}

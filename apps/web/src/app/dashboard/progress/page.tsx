"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStore, type DayType } from "@/lib/store";

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-ink-black/8">
      <div
        className={`h-2 rounded-full transition-[width] duration-500 ease-out ${className}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

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

const CONSISTENCY_WINDOW_DAYS = 30;
const TREND_WEEKS = 6;

export default function ProgressPage() {
  const store = useStore();
  const { state } = store;

  const monthPrefix = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const monthSessions = useMemo(
    () => state.sessions.filter((s) => s.date.startsWith(monthPrefix)),
    [state.sessions, monthPrefix]
  );

  const monthlyTotals = useMemo(() => {
    return state.categories.map((c) => {
      const sessions = monthSessions.filter((s) => s.categoryId === c.id);
      const minutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      return { category: c, minutes, sessionCount: sessions.length };
    });
  }, [state.categories, monthSessions]);

  const dayTypeCounts = useMemo(() => {
    const counts: Record<DayType, number> = { NORMAL: 0, REDUCED: 0, LEAVE: 0, MISSED: 0 };
    for (const [date, type] of Object.entries(state.dayTypes)) {
      if (date.startsWith(monthPrefix)) counts[type]++;
    }
    return counts;
  }, [state.dayTypes, monthPrefix]);

  const consistency = useMemo(() => {
    const today = new Date();
    let active = 0;
    let completed = 0;
    for (let i = 0; i < CONSISTENCY_WINDOW_DAYS; i++) {
      const d = addDays(today, -i);
      const dateISO = toISO(d);
      const type = state.dayTypes[dateISO] ?? "NORMAL";
      if (type === "LEAVE") continue; // planned leave doesn't count against consistency
      active++;
      const hasSessions = state.sessions.some((s) => s.date === dateISO);
      if (hasSessions || type === "REDUCED") completed++;
    }
    return { active, completed, pct: active === 0 ? 0 : Math.round((completed / active) * 100) };
  }, [state.dayTypes, state.sessions]);

  const weeklyTrend = useMemo(() => {
    const today = new Date();
    const weeks: { label: string; hours: number }[] = [];
    for (let w = TREND_WEEKS - 1; w >= 0; w--) {
      const weekEnd = addDays(today, -7 * w);
      const weekStart = addDays(weekEnd, -6);
      let minutes = 0;
      for (const s of state.sessions) {
        const d = new Date(s.date + "T00:00:00");
        if (d >= weekStart && d <= weekEnd) minutes += s.durationMinutes;
      }
      weeks.push({
        label: w === 0 ? "This wk" : weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        hours: minutes / 60,
      });
    }
    return weeks;
  }, [state.sessions]);

  const maxTrendHours = Math.max(1, ...weeklyTrend.map((w) => w.hours));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-heading font-semibold text-ink-black">Progress</h1>
      <p className="mt-2 text-body-sm text-ink-black/50">This week, this month, and the trend behind it.</p>

      {/* This week */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          This week
        </p>
        {state.categories.length === 0 ? (
          <div className="mt-2 flex flex-col items-center py-6 text-center">
            <Image
              src="/illustrations/empty-progress.png"
              alt=""
              width={340}
              height={211}
              className="h-auto w-full max-w-[220px]"
            />
            <p className="mt-4 text-body font-semibold text-ink-black">Nothing to show yet</p>
            <p className="mt-1 max-w-xs text-body-sm text-ink-black/50">
              Complete a session or two to see your progress grow.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-4 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
            >
              Add a category
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {state.categories.map((c) => {
              const minutes = store.weeklyMinutes(c.id);
              const sessions = store.weeklySessionCount(c.id);
              const current = c.trackingMode === "hours" ? minutes / 60 : sessions;
              const hasTarget = c.weeklyTarget !== null;
              const pct = hasTarget ? (current / (c.weeklyTarget as number)) * 100 : 0;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-caption text-ink-black/60">
                    <span className="font-medium text-ink-black">{c.name}</span>
                    <span>
                      {c.trackingMode === "hours"
                        ? `${(minutes / 60).toFixed(1)}h${hasTarget ? ` / ${c.weeklyTarget}h` : ""}`
                        : `${sessions}${hasTarget ? ` / ${c.weeklyTarget} sessions` : " sessions"}`}
                    </span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar value={hasTarget ? pct : 0} className={c.color} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consistency */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Consistency — last {CONSISTENCY_WINDOW_DAYS} days
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-display-sm font-semibold text-ink-black">{consistency.pct}%</span>
          <span className="text-body-sm text-ink-black/50">
            {consistency.completed} / {consistency.active} active days
          </span>
        </div>
        <p className="mt-2 text-caption text-ink-black/40">
          Active days exclude planned Full Leave. A day counts as kept if you logged a session or
          marked it Reduced.
        </p>
      </div>

      {/* Monthly totals */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          This month
        </p>
        {monthlyTotals.length === 0 ? (
          <p className="mt-3 text-body-sm text-ink-black/40">No categories yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {monthlyTotals.map(({ category, minutes, sessionCount }) => (
              <div key={category.id} className="flex items-center justify-between text-body-sm">
                <span className="flex items-center gap-2 text-ink-black">
                  <span className={`h-2 w-2 rounded-full ${category.color}`} />
                  {category.name}
                </span>
                <span className="text-ink-black/50">
                  {(minutes / 60).toFixed(1)}h · {sessionCount} session{sessionCount === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink-black/8 pt-4 sm:grid-cols-4">
          <div>
            <p className="text-caption text-ink-black/40">Normal</p>
            <p className="text-body-sm font-medium text-ink-black">{dayTypeCounts.NORMAL}</p>
          </div>
          <div>
            <p className="text-caption text-ink-black/40">Reduced</p>
            <p className="text-body-sm font-medium text-ink-black">{dayTypeCounts.REDUCED}</p>
          </div>
          <div>
            <p className="text-caption text-ink-black/40">Full Leave</p>
            <p className="text-body-sm font-medium text-ink-black">{dayTypeCounts.LEAVE}</p>
          </div>
          <div>
            <p className="text-caption text-ink-black/40">Missed</p>
            <p className="text-body-sm font-medium text-ink-black">{dayTypeCounts.MISSED}</p>
          </div>
        </div>
      </div>

      {/* Long-term trend */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Last {TREND_WEEKS} weeks
        </p>
        <div className="mt-4 flex items-end gap-3" style={{ height: 96 }}>
          {weeklyTrend.map((w) => (
            <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-caption text-ink-black/40">{w.hours > 0 ? w.hours.toFixed(1) : ""}</span>
              <div
                className="w-full rounded-t-md bg-marigold transition-[height] duration-500 ease-out"
                style={{ height: `${Math.max(4, (w.hours / maxTrendHours) * 72)}px` }}
              />
              <span className="text-caption text-ink-black/40">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

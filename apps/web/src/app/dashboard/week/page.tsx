"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useStore, todayISO, type DayType } from "@/lib/store";
import { useToast } from "@/components/toast";

const DAY_TYPE_META: Record<DayType, { label: string; className: string }> = {
  NORMAL: { label: "Normal", className: "bg-ink-black/5 text-ink-black/60" },
  REDUCED: { label: "Reduced", className: "bg-sky-tint text-notion-blue" },
  LEAVE: { label: "Leave", className: "bg-marigold text-ink-black" },
  MISSED: { label: "Missed", className: "bg-terracotta text-ink-black" },
};

const DAY_TYPE_ORDER: DayType[] = ["NORMAL", "REDUCED", "LEAVE", "MISSED"];

function startOfWeek(offsetWeeks: number) {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekPage() {
  const store = useStore();
  const { state } = store;
  const { show } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => startOfWeek(weekOffset), [weekOffset]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const today = todayISO();
  const weekEnd = days[6];

  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  const hasAnySessionThisWeek = days.some((d) =>
    state.sessions.some((s) => s.date === toISO(d))
  );

  function cycleDayType(dateISO: string, current: DayType, dateLabel: string) {
    const idx = DAY_TYPE_ORDER.indexOf(current);
    const next = DAY_TYPE_ORDER[(idx + 1) % DAY_TYPE_ORDER.length];
    store.setDayType(dateISO, next);
    show(`${dateLabel} marked ${DAY_TYPE_META[next].label}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-semibold text-ink-black">Week</h1>
          <p className="mt-1 text-body-sm text-ink-black/50">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium text-ink-black hover:bg-ink-black/5"
          >
            ← Prev
          </button>
          {weekOffset !== 0 ? (
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium text-ink-black hover:bg-ink-black/5"
            >
              This week
            </button>
          ) : null}
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-lg border border-ink-black/10 px-3 py-1.5 text-body-sm font-medium text-ink-black hover:bg-ink-black/5"
          >
            Next →
          </button>
        </div>
      </div>

      {!hasAnySessionThisWeek ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-ink-black/8 bg-pure-white py-10 text-center">
          <Image
            src="/illustrations/empty-week.png"
            alt=""
            width={340}
            height={234}
            className="h-auto w-full max-w-[220px]"
          />
          <p className="mt-4 text-body font-semibold text-ink-black">
            {weekOffset === 0 ? "Your week is empty" : "Nothing logged this week"}
          </p>
          <p className="mt-1 max-w-xs text-body-sm text-ink-black/50">
            Log a session from Today, or tap a day type below to mark it retroactively.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const dateISO = toISO(d);
          const isToday = dateISO === today;
          const dayType = state.dayTypes[dateISO] ?? "NORMAL";
          const sessions = state.sessions.filter((s) => s.date === dateISO);
          const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
          const dateLabel = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

          return (
            <div
              key={dateISO}
              className={`rounded-xl border bg-pure-white p-3 ${
                isToday ? "border-notion-blue ring-1 ring-notion-blue" : "border-ink-black/8"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                  {WEEKDAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]} {d.getDate()}
                </span>
                {isToday ? (
                  <span className="rounded-full bg-notion-blue px-1.5 py-0.5 text-[10px] font-semibold text-pure-white">
                    Today
                  </span>
                ) : null}
              </div>

              <button
                onClick={() => cycleDayType(dateISO, dayType, dateLabel)}
                className={`mt-2 w-full rounded-full px-2 py-1 text-caption font-medium transition-opacity hover:opacity-80 ${DAY_TYPE_META[dayType].className}`}
              >
                {DAY_TYPE_META[dayType].label}
              </button>

              <div className="mt-3 space-y-1.5">
                {sessions.length === 0 ? (
                  <p className="text-caption text-ink-black/30">Nothing logged</p>
                ) : (
                  sessions.map((s) => {
                    const category = state.categories.find((c) => c.id === s.categoryId);
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
    </div>
  );
}

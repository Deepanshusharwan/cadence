"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mark, MARKS } from "@/components/marks";
import { PlayIcon } from "@/components/icons";
import { useStore, todayISO, type Category, type DayType } from "@/lib/store";

const DAY_TYPE_META: Record<DayType, { label: string; cost: string }> = {
  NORMAL: { label: "Normal", cost: "0 units" },
  REDUCED: { label: "Reduced", cost: "1 unit" },
  LEAVE: { label: "Full leave", cost: "2 units" },
  MISSED: { label: "Missed", cost: "0 units" },
};

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

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function DashboardPage() {
  const store = useStore();
  const { state } = store;
  const today = todayISO();
  const dayType = state.dayTypes[today] ?? "NORMAL";
  const balance = store.leaveBalance();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!state.timer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.timer]);

  const [manualCategoryId, setManualCategoryId] = useState("");
  const [manualMinutes, setManualMinutes] = useState("30");
  const [timerCategoryId, setTimerCategoryId] = useState("");

  const progress = useMemo(
    () =>
      state.categories.map((c) => {
        const minutes = store.weeklyMinutes(c.id);
        const sessions = store.weeklySessionCount(c.id);
        const current = c.trackingMode === "hours" ? minutes / 60 : sessions;
        const deficit = c.weeklyTarget === null ? -Infinity : c.weeklyTarget - current;
        return { category: c, current, minutes, sessions, deficit };
      }),
    [state.categories, store]
  );

  const rankedForFocus = useMemo(
    () =>
      [...progress]
        .filter((p) => p.category.weeklyTarget !== null)
        .sort((a, b) => a.category.priorityTier - b.category.priorityTier || b.deficit - a.deficit),
    [progress]
  );

  const upNext = rankedForFocus.find((p) => p.deficit > 0) ?? rankedForFocus[0];
  const upNextSecond = rankedForFocus.find((p) => p.category.id !== upNext?.category.id);

  const scheduleBlocks: { time: string; label: string; dim?: boolean }[] = [];
  if (state.anchors.morningAnchorEnabled) {
    const cat = state.categories.find((c) => c.id === state.anchors.morningAnchorCategoryId);
    scheduleBlocks.push({
      time: `${state.anchors.morningAnchorStart}–${state.anchors.morningAnchorEnd}`,
      label: cat?.name ?? upNext?.category.name ?? "Morning priority",
    });
  }
  scheduleBlocks.push({
    time: `${state.anchors.fixedStart}–${state.anchors.fixedEnd}`,
    label: "Fixed commitment",
    dim: true,
  });
  scheduleBlocks.push({
    time: `${state.anchors.eveningBlock1Start}–${state.anchors.eveningBlock1End}`,
    label: upNext?.category.name ?? "Add a category to plan this",
  });
  scheduleBlocks.push({
    time: `${state.anchors.eveningBlock2Start}–${state.anchors.eveningBlock2End}`,
    label: upNextSecond?.category.name ?? upNext?.category.name ?? "Add a category to plan this",
  });

  function startTimerFor(id: string) {
    if (!id) return;
    store.startTimer(id);
  }

  function logManual() {
    const minutes = Number(manualMinutes);
    if (!manualCategoryId || !minutes) return;
    store.logSessionManually(manualCategoryId, minutes);
    setManualMinutes("30");
  }

  const timerCategory = state.timer
    ? state.categories.find((c) => c.id === state.timer!.categoryId)
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <Mark src={MARKS[state.profile.avatar]} size={48} className="ring-2 ring-marigold" />
        <div>
          <h1 className="text-heading font-semibold text-ink-black">
            Hey {state.profile.name || "there"}.
          </h1>
          <p className="text-body-sm text-ink-black/50">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Day type + leave balance */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(Object.keys(DAY_TYPE_META) as DayType[]).map((type) => (
          <button
            key={type}
            onClick={() => store.setDayType(today, type)}
            className={`rounded-full px-3 py-1.5 text-caption font-medium uppercase tracking-wide transition-colors ${
              dayType === type
                ? "bg-notion-blue text-pure-white"
                : "bg-ink-black/5 text-ink-black/50 hover:bg-ink-black/10"
            }`}
          >
            {DAY_TYPE_META[type].label}
          </button>
        ))}
        <span className="ml-auto rounded-full bg-ink-black/5 px-3 py-1.5 text-caption font-medium text-ink-black/60">
          {balance.monthly - balance.used} / {balance.monthly} leave units left
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Timer */}
        <div className="rounded-xl border border-ink-black/8 bg-pure-white p-6 lg:col-span-1">
          <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
            Timer
          </p>
          {state.timer && timerCategory ? (
            <div className="mt-4 text-center">
              <p className="text-body-sm font-medium text-ink-black">{timerCategory.name}</p>
              <p className="mt-2 font-serif text-display-sm text-ink-black">
                {formatElapsed(now - state.timer.startedAt)}
              </p>
              <button
                onClick={() => store.stopTimer()}
                className="mt-4 w-full rounded-lg bg-ink-black px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
              >
                Stop session
              </button>
            </div>
          ) : (
            <div className="mt-4">
              {state.categories.length === 0 ? (
                <p className="text-body-sm text-ink-black/50">
                  Add a category in Settings to start a timer.
                </p>
              ) : (
                <>
                  <select
                    value={timerCategoryId}
                    onChange={(e) => setTimerCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black"
                  >
                    <option value="">Choose a category…</option>
                    {state.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => startTimerFor(timerCategoryId)}
                    disabled={!timerCategoryId}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Start session
                  </button>
                </>
              )}

              <div className="mt-5 border-t border-ink-black/8 pt-4">
                <p className="text-caption font-medium text-ink-black/50">Log manually</p>
                <div className="mt-2 flex gap-2">
                  <select
                    value={manualCategoryId}
                    onChange={(e) => setManualCategoryId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-ink-black/12 bg-pure-white px-2 py-1.5 text-caption text-ink-black"
                  >
                    <option value="">Category…</option>
                    {state.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    className="w-16 rounded-lg border border-ink-black/12 bg-pure-white px-2 py-1.5 text-caption text-ink-black"
                  />
                  <button
                    onClick={logManual}
                    disabled={!manualCategoryId}
                    className="shrink-0 rounded-lg bg-ink-black/5 px-3 py-1.5 text-caption font-medium text-ink-black hover:bg-ink-black/10 disabled:opacity-40"
                  >
                    Log
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Today's schedule */}
        <div className="rounded-xl border border-ink-black/8 bg-pure-white p-6 lg:col-span-2">
          <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
            Today
          </p>
          <div className="mt-4 space-y-2">
            {scheduleBlocks.map((block, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3"
              >
                <span className="text-body-sm text-slate">{block.time}</span>
                <span
                  className={`text-body-sm font-medium ${block.dim ? "text-ink-black/40" : "text-ink-black"}`}
                >
                  {block.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly progress */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          This week
        </p>
        {progress.length === 0 ? (
          <div className="mt-2 flex flex-col items-center py-6 text-center">
            <Image
              src="/illustrations/empty-categories.png"
              alt=""
              width={340}
              height={253}
              className="h-auto w-full max-w-[220px]"
            />
            <p className="mt-4 text-body font-semibold text-ink-black">No categories yet</p>
            <p className="mt-1 max-w-xs text-body-sm text-ink-black/50">
              Add your first category to start organizing your week around it.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-4 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
            >
              + Add your first category
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {progress.map(({ category, current, minutes, sessions }) => (
              <CategoryProgress
                key={category.id}
                category={category}
                current={current}
                minutes={minutes}
                sessions={sessions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryProgress({
  category,
  current,
  minutes,
  sessions,
}: {
  category: Category;
  current: number;
  minutes: number;
  sessions: number;
}) {
  const hasTarget = category.weeklyTarget !== null;
  const pct = hasTarget ? (current / (category.weeklyTarget as number)) * 100 : 0;
  const label =
    category.trackingMode === "hours"
      ? `${(minutes / 60).toFixed(1)}h${hasTarget ? ` / ${category.weeklyTarget}h` : ""}`
      : `${sessions}${hasTarget ? ` / ${category.weeklyTarget} sessions` : " sessions"}`;

  return (
    <div>
      <div className="flex justify-between text-caption text-ink-black/60">
        <span className="font-medium text-ink-black">{category.name}</span>
        <span>{hasTarget ? label : "No minimum"}</span>
      </div>
      <div className="mt-1">
        <ProgressBar value={hasTarget ? pct : 0} className={category.color} />
      </div>
    </div>
  );
}

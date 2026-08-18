"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mark, markSrc } from "@/components/marks";
import { FlameIcon, PlayIcon, TrendingUpIcon } from "@/components/icons";
import { useStore, todayISO, type Category, type DayType } from "@/lib/store";
import { useToast } from "@/components/toast";

const DAY_TYPE_META: Record<DayType, { label: string; cost: string }> = {
  NORMAL: { label: "Normal", cost: "0 units" },
  REDUCED: { label: "Reduced", cost: "1 unit" },
  LEAVE: { label: "Full Leave", cost: "2 units" },
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
  const { show, celebrate } = useToast();

  // Lands here right after a Lemon Squeezy checkout (see
  // backend's product_options.redirect_url) -- the webhook that actually
  // grants the plan runs server-side and can arrive a beat after the
  // browser does, so re-fetch rather than trusting stale bootstrap state.
  // Reads window.location directly (not next/navigation's useSearchParams)
  // so this stays a plain client-only effect with no Suspense boundary
  // requirement on an otherwise statically-rendered page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("checkout") !== "success") return;
    window.history.replaceState({}, "", window.location.pathname);
    store.refreshProfile().then(() => {
      celebrate("Welcome to Plus! Your plan is now active.", "met");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const today = todayISO();
  const dayType = state.dayTypes[today] ?? "NORMAL";
  const balance = store.leaveBalance();
  const streak = store.currentStreak();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!state.timer || state.timer.paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.timer]);

  const [manualCategoryId, setManualCategoryId] = useState("");
  const [manualMinutes, setManualMinutes] = useState("30");
  const [manualTags, setManualTags] = useState("");
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

  const categoriesWithTarget = progress.filter((p) => p.category.weeklyTarget !== null);
  const onTrackCount = categoriesWithTarget.filter((p) => p.deficit <= 0).length;

  // Today's schedule (deficit/priority planner + pinned-category overrides,
  // merged with today's events) comes from the backend now — architecture.md
  // §2 keeps that scheduling logic server-side only, not duplicated here.
  const scheduleBlocks = state.todaySchedule;

  function startTimerFor(id: string) {
    if (!id) return;
    store.startTimer(id);
    const category = state.categories.find((c) => c.id === id);
    show(`Timer started — ${category?.name ?? "session"}`);
  }

  // Compares the category's pre-log standing against what it'll be right
  // after this session is added, so a target-crossing celebration fires
  // exactly once — the moment "on track" or "well beyond" becomes true.
  function checkCelebration(categoryId: string, addedMinutes: number) {
    const category = state.categories.find((c) => c.id === categoryId);
    if (!category || category.weeklyTarget === null) return;
    const p = progress.find((x) => x.category.id === categoryId);
    if (!p) return;
    const target = category.weeklyTarget;
    const addedUnits =
      category.trackingMode === "hours" ? addedMinutes / 60 : addedMinutes >= 45 ? 1 : 0;
    const before = p.current;
    const after = before + addedUnits;
    if (before < target * 1.5 && after >= target * 1.5) {
      celebrate(`${category.name} — smashed this week's target!`, "exceeded");
    } else if (before < target && after >= target) {
      celebrate(`${category.name} — weekly target hit!`, "met");
    }
  }

  function logManual() {
    const minutes = Number(manualMinutes);
    if (!manualCategoryId) {
      show("Pick a category to log against first");
      return;
    }
    if (!minutes) {
      show("Enter how many minutes to log");
      return;
    }
    const category = state.categories.find((c) => c.id === manualCategoryId);
    const tags = manualTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    checkCelebration(manualCategoryId, minutes);
    store.logSessionManually(manualCategoryId, minutes, undefined, tags);
    setManualMinutes("30");
    setManualTags("");
    show(`Logged ${minutes}m to ${category?.name ?? "category"}`);
  }

  function timerElapsedMs() {
    if (!state.timer) return 0;
    const running = state.timer.paused ? 0 : now - state.timer.startedAt;
    return state.timer.accumulatedMs + running;
  }

  function handleStopTimer() {
    if (!state.timer) return;
    const category = state.categories.find((c) => c.id === state.timer!.categoryId);
    const minutes = Math.max(1, Math.round(timerElapsedMs() / 60000));
    checkCelebration(state.timer.categoryId, minutes);
    store.stopTimer();
    show(`Session saved — ${minutes}m added to ${category?.name ?? "category"}`);
  }

  function handleCancelTimer() {
    store.cancelTimer();
    show("Timer discarded");
  }

  const timerCategory = state.timer
    ? state.categories.find((c) => c.id === state.timer!.categoryId)
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <Mark src={markSrc(state.profile.avatar)} size={48} className="ring-2 ring-marigold" />
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

      {/* Status strip */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {streak > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marigold px-3 py-1.5 text-caption font-semibold text-black">
            <FlameIcon className="h-3.5 w-3.5" />
            {streak}-day streak
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-black/5 px-3 py-1.5 text-caption font-medium text-ink-black/50">
            <FlameIcon className="h-3.5 w-3.5" />
            Log something today to start a streak
          </span>
        )}
        {categoriesWithTarget.length > 0 ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium ${
              onTrackCount === categoriesWithTarget.length
                ? "bg-signal-blue/15 text-signal-blue"
                : "bg-ink-black/5 text-ink-black/60"
            }`}
          >
            <TrendingUpIcon className="h-3.5 w-3.5" />
            {onTrackCount}/{categoriesWithTarget.length} categories on track this week
          </span>
        ) : null}
      </div>

      {/* Day type + leave balance */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(Object.keys(DAY_TYPE_META) as DayType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              if (type === dayType) return;
              store.setDayType(today, type);
              show(`Today marked ${DAY_TYPE_META[type].label}`);
            }}
            className={`rounded-full px-3 py-1.5 text-caption font-medium uppercase tracking-wide transition-colors ${
              dayType === type
                ? "bg-accent text-white"
                : "bg-ink-black/5 text-ink-black/50 hover:bg-ink-black/10"
            }`}
          >
            {DAY_TYPE_META[type].label}
          </button>
        ))}
        <span className="ml-auto rounded-full bg-ink-black/5 px-3 py-1.5 text-caption font-medium text-ink-black/60">
          {balance.remaining} / {balance.totalAvailable} leave units left
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
              <p
                className={`mt-2 font-serif text-display-sm text-ink-black ${state.timer.paused ? "opacity-40" : ""}`}
              >
                {formatElapsed(timerElapsedMs())}
              </p>
              {state.timer.paused ? (
                <p className="mt-1 text-caption font-medium uppercase tracking-wide text-ink-black/40">
                  Paused
                </p>
              ) : null}
              <button
                onClick={handleStopTimer}
                className="mt-4 w-full rounded-lg bg-ink-black px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
              >
                Stop session
              </button>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => (state.timer!.paused ? store.resumeTimer() : store.pauseTimer())}
                  className="flex-1 rounded-lg bg-ink-black/5 px-4 py-2 text-body-sm font-medium text-ink-black hover:bg-ink-black/10"
                >
                  {state.timer.paused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={handleCancelTimer}
                  className="flex-1 rounded-lg bg-ink-black/5 px-4 py-2 text-body-sm font-medium text-ink-black/60 hover:bg-ink-black/10"
                >
                  Cancel
                </button>
              </div>
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
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-body-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
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
                <input
                  value={manualTags}
                  onChange={(e) => setManualTags(e.target.value)}
                  placeholder="Tags — comma separated, optional"
                  className="mt-2 w-full rounded-lg border border-ink-black/12 bg-pure-white px-2 py-1.5 text-caption text-ink-black placeholder:text-ink-black/30"
                />
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
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  block.isEvent ? "border-orchid/30 bg-orchid/5" : "border-ink-black/8"
                }`}
              >
                <span className="text-body-sm text-slate">{block.time}</span>
                <span className="flex items-center gap-2">
                  {block.isEvent ? (
                    <span className="rounded-full bg-orchid/20 px-2 py-0.5 text-caption font-medium text-orchid">
                      Event
                    </span>
                  ) : null}
                  <span
                    className={`text-body-sm font-medium ${block.dim ? "text-ink-black/40" : "text-ink-black"}`}
                  >
                    {block.label}
                  </span>
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
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
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

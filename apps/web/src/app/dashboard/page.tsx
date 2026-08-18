"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mark, markSrc } from "@/components/marks";
import { AnalogTimer } from "@/components/analog-timer";
import { RetroTimer } from "@/components/retro-timer";
import { FlameIcon, PlayIcon, TrendingUpIcon, ExpandIcon, CollapseIcon } from "@/components/icons";
import { useStore, todayISO, type Category, type DayType } from "@/lib/store";
import { useToast } from "@/components/toast";

const DAY_TYPE_META: Record<DayType, { label: string; cost: string }> = {
  NORMAL: { label: "Normal", cost: "0 units" },
  REDUCED: { label: "Lighter", cost: "1 unit" },
  LEAVE: { label: "Full Leave", cost: "2 units" },
  MISSED: { label: "Missed", cost: "0 units" },
};

type WatchFace = "chronograph" | "retro";
const WATCH_FACE_KEY = "cadence:watch-face";

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
  const [showQuickAddItem, setShowQuickAddItem] = useState(false);
  const [quickAddItemName, setQuickAddItemName] = useState("");
  const [showQuickAddBlock, setShowQuickAddBlock] = useState(false);
  const [quickAddBlockLabel, setQuickAddBlockLabel] = useState("");
  const [quickAddBlockStart, setQuickAddBlockStart] = useState("09:00");
  const [quickAddBlockEnd, setQuickAddBlockEnd] = useState("10:00");
  const [watchFace, setWatchFace] = useState<WatchFace>("chronograph");
  const [timerFullscreen, setTimerFullscreen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(WATCH_FACE_KEY);
    if (stored === "chronograph" || stored === "retro") {
      queueMicrotask(() => setWatchFace(stored));
    }
  }, []);

  function selectWatchFace(face: WatchFace) {
    setWatchFace(face);
    window.localStorage.setItem(WATCH_FACE_KEY, face);
  }

  useEffect(() => {
    if (!timerFullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setTimerFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [timerFullscreen]);

  // Sessions-tracked categories only count a logged block toward the
  // weekly total once it's >= 45 minutes (same rule store.weeklySessionCount
  // and the backend's insights use) -- the manual-log form defaults to 30,
  // so without this warning someone logs the default, the row is created,
  // and their weekly count silently never moves.
  const manualCategory = state.categories.find((c) => c.id === manualCategoryId);
  const manualBelowSessionThreshold =
    manualCategory?.trackingMode === "sessions" && Number(manualMinutes) < 45 && manualMinutes !== "";

  const progress = useMemo(
    () =>
      state.categories.map((c) => {
        const minutes = store.weeklyMinutes(c.id);
        const sessions = store.weeklySessionCount(c.id);
        const current = c.trackingMode === "hours" ? minutes / 60 : sessions;
        const deficit = c.weeklyTarget === null ? -Infinity : c.weeklyTarget - current;
        const previousMinutes = store.previousWeeklyMinutes(c.id);
        const previousSessions = store.previousWeeklySessionCount(c.id);
        return { category: c, current, minutes, sessions, deficit, previousMinutes, previousSessions };
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
      show("Pick an item to log against first");
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
    show(`Logged ${minutes}m to ${category?.name ?? "item"}`);
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
    show(`Session saved — ${minutes}m added to ${category?.name ?? "item"}`);
  }

  function handleCancelTimer() {
    store.cancelTimer();
    show("Timer discarded");
  }

  async function handleQuickAddItem() {
    const name = quickAddItemName.trim();
    if (!name) return;
    const category = await store.addCategory({
      name,
      trackingMode: "hours",
      weeklyTarget: null,
      priorityTier: 3,
      weekendPreferred: false,
    });
    if (category) {
      setTimerCategoryId(category.id);
      show(`Added ${category.name} — ready to start`);
    }
    setQuickAddItemName("");
    setShowQuickAddItem(false);
  }

  async function handleQuickAddBlock() {
    const label = quickAddBlockLabel.trim();
    if (!label || !quickAddBlockStart || !quickAddBlockEnd) return;
    const anchor = await store.addAnchor({
      label,
      start: quickAddBlockStart,
      end: quickAddBlockEnd,
      recurrence: "once",
      daysOfWeek: [],
      date: today,
      // Fixed, not flexible: a named one-off block ("Guitar lesson") should
      // show its own label -- a focus block instead hands the slot to the
      // planner's auto-pick, silently overwriting the label with whatever
      // category it assigns.
      isFocusBlock: false,
      categoryIds: [],
    });
    if (anchor) show(`Added ${anchor.label} to today`);
    setQuickAddBlockLabel("");
    setQuickAddBlockStart("09:00");
    setQuickAddBlockEnd("10:00");
    setShowQuickAddBlock(false);
  }

  const timerCategory = state.timer
    ? state.categories.find((c) => c.id === state.timer!.categoryId)
    : null;

  const isPlus = state.profile.plan !== "free";

  function renderWatchFace(size?: number) {
    if (!state.timer || !timerCategory) return null;
    if (isPlus && watchFace === "retro") {
      return (
        <RetroTimer
          elapsedMs={timerElapsedMs()}
          paused={state.timer.paused}
          itemLabel={timerCategory.name}
          timeLabel={formatElapsed(timerElapsedMs())}
          size={size}
        />
      );
    }
    return <AnalogTimer elapsedMs={timerElapsedMs()} paused={state.timer.paused} size={size} />;
  }

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
          <span
            title="A day keeps your streak if you log a session or mark it Lighter. Full Leave days don't break it, but they don't add to the count either."
            className="inline-flex items-center gap-1.5 rounded-full bg-marigold px-3 py-1.5 text-caption font-semibold text-black"
          >
            <FlameIcon className="h-3.5 w-3.5" />
            {streak}-day streak
          </span>
        ) : (
          <span
            title="A day keeps your streak if you log a session or mark it Lighter. Full Leave days don't break it, but they don't add to the count either."
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-black/5 px-3 py-1.5 text-caption font-medium text-ink-black/50"
          >
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
            {onTrackCount}/{categoriesWithTarget.length} items on track this week
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

      {/* Timer */}
      <div className="mt-8 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <div className="flex items-center justify-between">
          <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
            Timer
          </p>
          {state.timer && timerCategory ? (
            isPlus ? (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-stretch gap-1 rounded-lg border border-ink-black/10 bg-paper-warmth p-1">
                  {(["chronograph", "retro"] as WatchFace[]).map((face) => (
                    <button
                      key={face}
                      type="button"
                      onClick={() => selectWatchFace(face)}
                      className={`rounded-md px-2.5 py-1 text-caption font-medium capitalize transition-colors ${
                        watchFace === face
                          ? "bg-accent text-white"
                          : "text-ink-black/50 hover:bg-ink-black/5"
                      }`}
                    >
                      {face}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setTimerFullscreen(true)}
                  aria-label="Fullscreen"
                  title="Fullscreen"
                  className="rounded-lg p-1.5 text-ink-black/50 hover:bg-ink-black/10"
                >
                  <ExpandIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/pricing" className="text-caption font-medium text-accent hover:opacity-80">
                More watch faces with Plus →
              </Link>
            )
          ) : null}
        </div>
        {state.timer && timerCategory ? (
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            {renderWatchFace()}
            <div className="w-full max-w-xs text-center sm:text-left">
              <p className="text-body-sm font-medium text-ink-black">{timerCategory.name}</p>
              <p
                className={`mt-1 font-serif text-display-sm text-ink-black ${state.timer.paused ? "opacity-40" : ""}`}
              >
                {formatElapsed(timerElapsedMs())}
              </p>
              {timerCategory.trackingMode === "sessions" && timerElapsedMs() < 45 * 60000 ? (
                <p className="mt-1 text-caption text-coral">
                  {timerCategory.name} counts sessions — needs 45+ min to count toward this week.
                </p>
              ) : null}
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
          </div>
        ) : (
          <div className="mx-auto mt-4 max-w-sm">
            {showQuickAddItem ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={quickAddItemName}
                    onChange={(e) => setQuickAddItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAddItem();
                      if (e.key === "Escape") {
                        setShowQuickAddItem(false);
                        setQuickAddItemName("");
                      }
                    }}
                    placeholder="Item name — e.g. Guitar"
                    className="min-w-0 flex-1 rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black placeholder:text-ink-black/30"
                  />
                  <button
                    onClick={handleQuickAddItem}
                    disabled={!quickAddItemName.trim()}
                    className="shrink-0 rounded-lg bg-accent px-3 py-2 text-body-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowQuickAddItem(false);
                      setQuickAddItemName("");
                    }}
                    aria-label="Cancel"
                    className="shrink-0 rounded-lg px-2.5 py-2 text-body-sm text-ink-black/50 hover:bg-ink-black/10"
                  >
                    ×
                  </button>
                </div>
              ) : state.categories.length === 0 ? (
                <button
                  onClick={() => setShowQuickAddItem(true)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ink-black/20 px-4 py-2 text-body-sm font-medium text-ink-black/60 hover:bg-ink-black/5"
                >
                  + New item to start timing
                </button>
              ) : (
                <>
                  <div className="flex gap-2">
                    <select
                      value={timerCategoryId}
                      onChange={(e) => setTimerCategoryId(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black"
                    >
                      <option value="">Choose an item…</option>
                      {state.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowQuickAddItem(true)}
                      className="shrink-0 rounded-lg px-3 py-2 text-body-sm font-medium text-ink-black/50 hover:bg-ink-black/10"
                    >
                      + New
                    </button>
                  </div>
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
                    <option value="">Item…</option>
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
                {manualBelowSessionThreshold ? (
                  <p className="mt-1.5 text-caption text-coral">
                    {manualCategory?.name} counts sessions, and this is under 45 minutes — it&apos;ll
                    be logged, but won&apos;t count toward this week&apos;s total.
                  </p>
                ) : null}
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

      {timerFullscreen && state.timer && timerCategory ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-paper-warmth p-6">
          <button
            onClick={() => setTimerFullscreen(false)}
            aria-label="Exit fullscreen"
            title="Exit fullscreen (Esc)"
            className="absolute right-6 top-6 rounded-lg p-2 text-ink-black/50 hover:bg-ink-black/10"
          >
            <CollapseIcon className="h-5 w-5" />
          </button>
          {renderWatchFace(420)}
          <div className="text-center">
            <p className="text-body font-medium text-ink-black">{timerCategory.name}</p>
            <p
              className={`mt-1 font-serif text-display text-ink-black ${state.timer.paused ? "opacity-40" : ""}`}
            >
              {formatElapsed(timerElapsedMs())}
            </p>
            {state.timer.paused ? (
              <p className="mt-1 text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Paused
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => (state.timer!.paused ? store.resumeTimer() : store.pauseTimer())}
              className="rounded-lg bg-ink-black/5 px-5 py-2 text-body-sm font-medium text-ink-black hover:bg-ink-black/10"
            >
              {state.timer.paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleStopTimer}
              className="rounded-lg bg-ink-black px-5 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
            >
              Stop session
            </button>
          </div>
        </div>
      ) : null}

      {/* Today's schedule */}
      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
          <div className="flex items-center justify-between">
            <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
              Today
            </p>
            {!showQuickAddBlock ? (
              <button
                onClick={() => setShowQuickAddBlock(true)}
                className="text-caption font-medium text-ink-black/50 hover:text-ink-black"
              >
                + Add block
              </button>
            ) : null}
          </div>
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
          {showQuickAddBlock ? (
            <div className="mt-3 rounded-lg border border-dashed border-ink-black/15 p-3">
              <input
                autoFocus
                value={quickAddBlockLabel}
                onChange={(e) => setQuickAddBlockLabel(e.target.value)}
                placeholder="Block name — e.g. Gym"
                className="w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black placeholder:text-ink-black/30"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="time"
                  value={quickAddBlockStart}
                  onChange={(e) => setQuickAddBlockStart(e.target.value)}
                  className="rounded-lg border border-ink-black/12 bg-pure-white px-2 py-1.5 text-caption text-ink-black"
                />
                <span className="text-caption text-ink-black/40">to</span>
                <input
                  type="time"
                  value={quickAddBlockEnd}
                  onChange={(e) => setQuickAddBlockEnd(e.target.value)}
                  className="rounded-lg border border-ink-black/12 bg-pure-white px-2 py-1.5 text-caption text-ink-black"
                />
                <button
                  onClick={handleQuickAddBlock}
                  disabled={!quickAddBlockLabel.trim()}
                  className="ml-auto shrink-0 rounded-lg bg-accent px-3 py-1.5 text-caption font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowQuickAddBlock(false);
                    setQuickAddBlockLabel("");
                  }}
                  aria-label="Cancel"
                  className="shrink-0 rounded-lg px-2 py-1.5 text-caption text-ink-black/50 hover:bg-ink-black/10"
                >
                  ×
                </button>
              </div>
              <p className="mt-1.5 text-caption text-ink-black/40">
                Just for today — for recurring blocks, use Settings.
              </p>
            </div>
          ) : null}
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
            <p className="mt-4 text-body font-semibold text-ink-black">No items yet</p>
            <p className="mt-1 max-w-xs text-body-sm text-ink-black/50">
              Add your first item to start organizing your week around it.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              + Add your first item
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {progress.map(({ category, current, minutes, sessions, previousMinutes, previousSessions }) => (
              <CategoryProgress
                key={category.id}
                category={category}
                current={current}
                minutes={minutes}
                sessions={sessions}
                previousMinutes={previousMinutes}
                previousSessions={previousSessions}
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
  previousMinutes,
  previousSessions,
}: {
  category: Category;
  current: number;
  minutes: number;
  sessions: number;
  previousMinutes: number;
  previousSessions: number;
}) {
  const hasTarget = category.weeklyTarget !== null;
  const previous = category.trackingMode === "hours" ? previousMinutes / 60 : previousSessions;
  // No target -- fall back to last week's total as the reference point
  // instead of showing 0 progress forever regardless of what's logged.
  const pct = hasTarget
    ? (current / (category.weeklyTarget as number)) * 100
    : previous > 0
      ? (current / previous) * 100
      : current > 0
        ? 100
        : 0;
  const label =
    category.trackingMode === "hours"
      ? `${(minutes / 60).toFixed(1)}h${hasTarget ? ` / ${category.weeklyTarget}h` : ""}`
      : `${sessions}${hasTarget ? ` / ${category.weeklyTarget} sessions` : " sessions"}`;
  const lastWeekLabel =
    !hasTarget && previous > 0
      ? category.trackingMode === "hours"
        ? ` · ${previous.toFixed(1)}h last week`
        : ` · ${previous} last week`
      : "";

  return (
    <div>
      <div className="flex justify-between text-caption text-ink-black/60">
        <span className="font-medium text-ink-black">{category.name}</span>
        <span>
          {label}
          {lastWeekLabel}
        </span>
      </div>
      <div className="mt-1">
        <ProgressBar value={pct} className={category.color} />
      </div>
    </div>
  );
}

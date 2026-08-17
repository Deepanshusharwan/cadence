"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MarkKey } from "@/components/marks";

export type TrackingMode = "hours" | "sessions";

export interface Category {
  id: string;
  name: string;
  trackingMode: TrackingMode;
  weeklyTarget: number | null; // hours, or session count; null = no minimum
  priorityTier: number; // 1 = highest
  weekendPreferred: boolean;
  color: string; // bg-* class from the shared accent palette
}

// A single schedule block. `date === null` means it recurs every day;
// otherwise it applies only on that one date (e.g. a one-off commitment).
// `isFocusBlock` distinguishes a flexible block the planner assigns a
// category to (§35 "soft anchor") from a fixed/external commitment that's
// just displayed as-is (§35 "hard block"). `categoryIds` optionally pins one
// or more categories to the block — for a focus block this overrides the
// deficit/priority auto-pick (manual "swapping", §36), rotating through the
// pinned categories if there's more than one; for a fixed block it's just an
// informational tag (e.g. "Gym" tagged with "Fitness").
export type AnchorRecurrence = "daily" | "weekly" | "once";

export interface ScheduleAnchor {
  id: string;
  label: string;
  start: string; // HH:MM
  end: string; // HH:MM
  recurrence: AnchorRecurrence;
  daysOfWeek: number[]; // 0 = Sunday .. 6 = Saturday; used when recurrence === "weekly"
  date: string | null; // YYYY-MM-DD; used when recurrence === "once"
  isFocusBlock: boolean;
  categoryIds: string[];
}

export function anchorAppliesOn(anchor: ScheduleAnchor, dateISO: string, dayOfWeek: number) {
  if (anchor.recurrence === "once") return anchor.date === dateISO;
  if (anchor.recurrence === "weekly") return anchor.daysOfWeek.includes(dayOfWeek);
  return true; // daily
}

export interface Session {
  id: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  tags: string[];
}

export type DayType = "NORMAL" | "REDUCED" | "LEAVE" | "MISSED";

export interface Profile {
  name: string;
  avatar: MarkKey;
}

// `accumulatedMs` holds time banked from prior run segments; `startedAt`
// only marks the start of the *current* running segment, so pausing and
// resuming never loses or double-counts elapsed time. While `paused`,
// `startedAt` is stale and ignored by every reader.
export interface Timer {
  categoryId: string;
  startedAt: number; // epoch ms
  accumulatedMs: number;
  paused: boolean;
}

export type EventType = "SCHOOL_OR_WORK" | "SOCIAL" | "PERSONAL" | "TRAVEL" | "OTHER";

// A one-off external commitment (spec §57-58) — distinct from a recurring
// ScheduleAnchor. Shown alongside the day's anchors but never auto-scheduled
// into by the planner.
export interface CadenceEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  type: EventType;
  notes: string;
}

export interface WeeklyReview {
  wins: string;
  problems: string;
  nextWeekChanges: string;
}

export interface AppSettings {
  leaveMonthlyAllowance: number;
  leaveCarryCap: number; // max total accumulated balance (this month + carried)
}

interface State {
  onboarded: boolean;
  profile: Profile;
  categories: Category[];
  wakeStart: string;
  wakeEnd: string;
  anchors: ScheduleAnchor[];
  sessions: Session[];
  events: CadenceEvent[];
  dayTypes: Record<string, DayType>;
  timer: Timer | null;
  settings: AppSettings;
  reviews: Record<string, WeeklyReview>; // keyed by week-start YYYY-MM-DD
}

const ACCENT_CLASSES = [
  "bg-marigold",
  "bg-terracotta",
  "bg-signal-blue",
  "bg-sky-wash",
  "bg-orchid",
  "bg-midnight-ink",
];

const DEFAULT_ANCHORS: ScheduleAnchor[] = [
  {
    id: "default-fixed",
    label: "Fixed commitment",
    start: "10:00",
    end: "18:00",
    recurrence: "daily",
    daysOfWeek: [],
    date: null,
    isFocusBlock: false,
    categoryIds: [],
  },
  {
    id: "default-evening-1",
    label: "Evening focus",
    start: "19:00",
    end: "21:00",
    recurrence: "daily",
    daysOfWeek: [],
    date: null,
    isFocusBlock: true,
    categoryIds: [],
  },
  {
    id: "default-evening-2",
    label: "Evening focus",
    start: "21:30",
    end: "23:30",
    recurrence: "daily",
    daysOfWeek: [],
    date: null,
    isFocusBlock: true,
    categoryIds: [],
  },
];

const EMPTY_REVIEW: WeeklyReview = { wins: "", problems: "", nextWeekChanges: "" };

const DEFAULT_SETTINGS: AppSettings = {
  leaveMonthlyAllowance: 7,
  leaveCarryCap: 14,
};

const DEFAULT_STATE: State = {
  onboarded: false,
  profile: { name: "", avatar: "cat" },
  categories: [],
  wakeStart: "06:00",
  wakeEnd: "08:00",
  anchors: DEFAULT_ANCHORS,
  sessions: [],
  events: [],
  dayTypes: {},
  timer: null,
  settings: DEFAULT_SETTINGS,
  reviews: {},
};

const STORAGE_KEY = "cadence-state-v5";

// Local calendar date as YYYY-MM-DD — deliberately not toISOString(),
// which is UTC-based and rolls over to the "wrong" day for timezones
// ahead of UTC during local early-morning hours.
function todayISO(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse a YYYY-MM-DD string as a local-midnight Date. Using `new
// Date("YYYY-MM-DD")` directly parses it as UTC midnight, which silently
// disagrees with the local-time Date math used elsewhere (e.g.
// startOfWeekISO) by the timezone offset — exactly the mismatch that
// caused today's sessions to fall outside "this week".
function parseLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekISO(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday as week start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function loadState(): State {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    const anchors: ScheduleAnchor[] = Array.isArray(parsed.anchors)
      ? parsed.anchors.map((a: Partial<ScheduleAnchor>) => ({
          recurrence: "daily",
          daysOfWeek: [],
          categoryIds: [],
          ...a,
        }))
      : DEFAULT_ANCHORS;
    const sessions: Session[] = Array.isArray(parsed.sessions)
      ? parsed.sessions.map((s: Partial<Session>) => ({ tags: [], ...s }))
      : [];
    const events: CadenceEvent[] = Array.isArray(parsed.events) ? parsed.events : [];
    return {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      anchors,
      sessions,
      events,
      // A timer mid-run at save time can't be resumed correctly across a
      // shape change (accumulatedMs/paused may not exist on old data), so
      // rather than risk a corrupted elapsed-time read, just drop it —
      // losing one in-progress timer on migration is better than silently
      // wrong durations forever after.
      timer: null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

interface LeaveBalance {
  monthlyAllowance: number;
  carried: number;
  totalAvailable: number;
  used: number;
  remaining: number;
  cap: number;
}

export interface StreakRun {
  length: number; // count of "kept" days in the run — leave days don't add to this
  dates: string[]; // every ISO date spanned by the run, including bridging leave days
}

export interface StreakInfo {
  current: StreakRun;
  longest: StreakRun;
}

export interface Insight {
  id: string;
  text: string;
}

interface StoreValue {
  state: State;
  ready: boolean;
  nextAccentColor: () => string;
  setProfile: (patch: Partial<Profile>) => void;
  completeOnboarding: () => void;
  addCategory: (input: Omit<Category, "id" | "color">) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  setWakeWindow: (start: string, end: string) => void;
  addAnchor: (input: Omit<ScheduleAnchor, "id">) => void;
  removeAnchor: (id: string) => void;
  updateAnchor: (id: string, patch: Partial<ScheduleAnchor>) => void;
  addEvent: (input: Omit<CadenceEvent, "id">) => void;
  removeEvent: (id: string) => void;
  updateEvent: (id: string, patch: Partial<CadenceEvent>) => void;
  setDayType: (date: string, type: DayType) => void;
  startTimer: (categoryId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  cancelTimer: () => void;
  logSessionManually: (
    categoryId: string,
    minutes: number,
    date?: string,
    tags?: string[]
  ) => void;
  updateSession: (id: string, patch: Partial<Omit<Session, "id">>) => void;
  removeSession: (id: string) => void;
  weeklyMinutes: (categoryId: string) => number;
  weeklySessionCount: (categoryId: string) => number;
  currentStreak: () => number;
  streakInfo: () => StreakInfo;
  leaveBalance: () => LeaveBalance;
  updateSettings: (patch: Partial<AppSettings>) => void;
  saveReview: (weekStartISO: string, patch: Partial<WeeklyReview>) => void;
  insights: () => Insight[];
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrating client state from localStorage after mount, to keep the
    // server-rendered and first-client-render output identical (avoids a
    // hydration mismatch). This is the standard exception to "don't
    // setState in an effect" — syncing from an external system on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const nextAccentColor = useCallback(() => {
    return ACCENT_CLASSES[state.categories.length % ACCENT_CLASSES.length];
  }, [state.categories.length]);

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((s) => ({ ...s, onboarded: true }));
  }, []);

  const addCategory = useCallback((input: Omit<Category, "id" | "color">) => {
    setState((s) => ({
      ...s,
      categories: [
        ...s.categories,
        {
          ...input,
          id: crypto.randomUUID(),
          color: ACCENT_CLASSES[s.categories.length % ACCENT_CLASSES.length],
        },
      ],
    }));
  }, []);

  const removeCategory = useCallback((id: string) => {
    setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const setWakeWindow = useCallback((start: string, end: string) => {
    setState((s) => ({ ...s, wakeStart: start, wakeEnd: end }));
  }, []);

  const addAnchor = useCallback((input: Omit<ScheduleAnchor, "id">) => {
    setState((s) => ({
      ...s,
      anchors: [...s.anchors, { ...input, id: crypto.randomUUID() }],
    }));
  }, []);

  const removeAnchor = useCallback((id: string) => {
    setState((s) => ({ ...s, anchors: s.anchors.filter((a) => a.id !== id) }));
  }, []);

  const updateAnchor = useCallback((id: string, patch: Partial<ScheduleAnchor>) => {
    setState((s) => ({
      ...s,
      anchors: s.anchors.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const addEvent = useCallback((input: Omit<CadenceEvent, "id">) => {
    setState((s) => ({
      ...s,
      events: [...s.events, { ...input, id: crypto.randomUUID() }],
    }));
  }, []);

  const removeEvent = useCallback((id: string) => {
    setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<CadenceEvent>) => {
    setState((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const setDayType = useCallback((date: string, type: DayType) => {
    setState((s) => ({ ...s, dayTypes: { ...s.dayTypes, [date]: type } }));
  }, []);

  const startTimer = useCallback((categoryId: string) => {
    setState((s) => ({
      ...s,
      timer: { categoryId, startedAt: Date.now(), accumulatedMs: 0, paused: false },
    }));
  }, []);

  const pauseTimer = useCallback(() => {
    setState((s) => {
      if (!s.timer || s.timer.paused) return s;
      const elapsed = Date.now() - s.timer.startedAt;
      return {
        ...s,
        timer: { ...s.timer, accumulatedMs: s.timer.accumulatedMs + elapsed, paused: true },
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setState((s) => {
      if (!s.timer || !s.timer.paused) return s;
      return { ...s, timer: { ...s.timer, startedAt: Date.now(), paused: false } };
    });
  }, []);

  const stopTimer = useCallback(() => {
    setState((s) => {
      if (!s.timer) return s;
      const runningMs = s.timer.paused ? 0 : Date.now() - s.timer.startedAt;
      const minutes = Math.max(1, Math.round((s.timer.accumulatedMs + runningMs) / 60000));
      const session: Session = {
        id: crypto.randomUUID(),
        categoryId: s.timer.categoryId,
        date: todayISO(),
        durationMinutes: minutes,
        tags: [],
      };
      return { ...s, timer: null, sessions: [...s.sessions, session] };
    });
  }, []);

  const cancelTimer = useCallback(() => {
    setState((s) => ({ ...s, timer: null }));
  }, []);

  const logSessionManually = useCallback(
    (categoryId: string, minutes: number, date = todayISO(), tags: string[] = []) => {
      setState((s) => ({
        ...s,
        sessions: [
          ...s.sessions,
          { id: crypto.randomUUID(), categoryId, date, durationMinutes: minutes, tags },
        ],
      }));
    },
    []
  );

  const updateSession = useCallback((id: string, patch: Partial<Omit<Session, "id">>) => {
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...patch } : sess)),
    }));
  }, []);

  const removeSession = useCallback((id: string) => {
    setState((s) => ({ ...s, sessions: s.sessions.filter((sess) => sess.id !== id) }));
  }, []);

  const weeklyMinutes = useCallback(
    (categoryId: string) => {
      const weekStart = startOfWeekISO();
      return state.sessions
        .filter((s) => s.categoryId === categoryId && parseLocalDate(s.date) >= weekStart)
        .reduce((sum, s) => sum + s.durationMinutes, 0);
    },
    [state.sessions]
  );

  const weeklySessionCount = useCallback(
    (categoryId: string) => {
      const weekStart = startOfWeekISO();
      return state.sessions.filter(
        (s) =>
          s.categoryId === categoryId &&
          s.durationMinutes >= 45 &&
          parseLocalDate(s.date) >= weekStart
      ).length;
    },
    [state.sessions]
  );

  // Forgiving streak: a day is "kept" if anything was logged that day, or
  // it was explicitly marked Reduced — not "every target hit." Leave days
  // are skipped (neither kept nor breaking) but still bridge a run, so they
  // show up as part of an unbroken span on the calendar. Today doesn't
  // break the streak just because it isn't over yet — a still-open run only
  // counts through today once something's kept, otherwise it stops at
  // yesterday. Walks forward once across the whole history (instead of
  // walking backward from today) so the current run and the best-ever run
  // — including its date range for calendar marking — come out of the same
  // pass and can never disagree with each other.
  const streakInfo = useCallback((): StreakInfo => {
    const loggedDates = new Set(state.sessions.map((s) => s.date));
    const isKept = (iso: string) => loggedDates.has(iso) || state.dayTypes[iso] === "REDUCED";
    const isLeave = (iso: string) => state.dayTypes[iso] === "LEAVE";

    const knownDates = [...loggedDates, ...Object.keys(state.dayTypes)];
    const empty: StreakInfo = { current: { length: 0, dates: [] }, longest: { length: 0, dates: [] } };
    if (knownDates.length === 0) return empty;

    const earliest = knownDates.reduce((min, iso) => (iso < min ? iso : min));
    const cursor = parseLocalDate(earliest);

    const todayStr = todayISO();
    const lastDate = new Date();
    if (!isKept(todayStr) && !isLeave(todayStr)) {
      lastDate.setDate(lastDate.getDate() - 1);
    }

    let runDates: string[] = [];
    let runKept = 0;
    let bestDates: string[] = [];
    let bestKept = 0;

    while (cursor <= lastDate) {
      const iso = todayISO(cursor);
      if (isLeave(iso)) {
        if (runDates.length > 0) runDates.push(iso);
      } else if (isKept(iso)) {
        runDates.push(iso);
        runKept++;
      } else if (runKept > bestKept) {
        bestKept = runKept;
        bestDates = runDates;
        runDates = [];
        runKept = 0;
      } else {
        runDates = [];
        runKept = 0;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (runKept > bestKept) {
      bestKept = runKept;
      bestDates = runDates;
    }

    return {
      current: { length: runKept, dates: runDates },
      longest: { length: bestKept, dates: bestDates },
    };
  }, [state.sessions, state.dayTypes]);

  const currentStreak = useCallback(() => streakInfo().current.length, [streakInfo]);

  const leaveUsedInMonth = useCallback(
    (monthPrefix: string) => {
      let used = 0;
      for (const [date, type] of Object.entries(state.dayTypes)) {
        if (!date.startsWith(monthPrefix)) continue;
        if (type === "REDUCED") used += 1;
        if (type === "LEAVE") used += 2;
      }
      return used;
    },
    [state.dayTypes]
  );

  const leaveBalance = useCallback((): LeaveBalance => {
    const now = new Date();
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const { leaveMonthlyAllowance: monthlyAllowance, leaveCarryCap: cap } = state.settings;
    const usedLastMonth = leaveUsedInMonth(lastMonthPrefix);
    // Unused balance from last month carries forward for one additional
    // month only — it never compounds further back than that — and the
    // carry itself is capped so this month's total never exceeds `cap`.
    const rawCarry = Math.max(0, monthlyAllowance - usedLastMonth);
    const maxCarry = Math.max(0, cap - monthlyAllowance);
    const carried = Math.min(rawCarry, maxCarry);
    const totalAvailable = monthlyAllowance + carried;
    const used = leaveUsedInMonth(thisMonthPrefix);

    return {
      monthlyAllowance,
      carried,
      totalAvailable,
      used,
      remaining: totalAvailable - used,
      cap,
    };
  }, [state.settings, leaveUsedInMonth]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const saveReview = useCallback((weekStartISO: string, patch: Partial<WeeklyReview>) => {
    setState((s) => ({
      ...s,
      reviews: {
        ...s.reviews,
        [weekStartISO]: {
          ...(s.reviews[weekStartISO] ?? EMPTY_REVIEW),
          ...patch,
        },
      },
    }));
  }, []);

  // Descriptive pattern insights (spec §92) — deliberately simple and
  // read-only: "this category has been behind for 3 weeks," "this weekday
  // has a high missed-day rate." Never prescriptive, and silent unless
  // there's actually enough data to say something meaningful.
  const insights = useCallback((): Insight[] => {
    const results: Insight[] = [];
    const thisWeekStart = startOfWeekISO();

    for (const category of state.categories) {
      if (category.weeklyTarget === null) continue;
      let behindStreak = true;
      for (let weeksAgo = 1; weeksAgo <= 3; weeksAgo++) {
        const weekStart = new Date(thisWeekStart);
        weekStart.setDate(weekStart.getDate() - weeksAgo * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekSessions = state.sessions.filter((s) => {
          if (s.categoryId !== category.id) return false;
          const d = parseLocalDate(s.date);
          return d >= weekStart && d < weekEnd;
        });
        const total =
          category.trackingMode === "hours"
            ? weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60
            : weekSessions.filter((s) => s.durationMinutes >= 45).length;
        if (total >= category.weeklyTarget) {
          behindStreak = false;
          break;
        }
      }
      if (behindStreak) {
        results.push({
          id: `behind-${category.id}`,
          text: `${category.name} has been below target for 3 weeks running.`,
        });
      }
    }

    const WEEKDAY_NAMES = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const byWeekday = Array.from({ length: 7 }, () => ({ total: 0, missed: 0 }));
    for (const [dateStr, type] of Object.entries(state.dayTypes)) {
      const day = parseLocalDate(dateStr).getDay();
      byWeekday[day].total++;
      if (type === "MISSED") byWeekday[day].missed++;
    }
    let worstDay = -1;
    let worstRate = 0;
    for (let day = 0; day < 7; day++) {
      const { total, missed } = byWeekday[day];
      if (total < 3) continue;
      const rate = missed / total;
      if (rate > worstRate) {
        worstRate = rate;
        worstDay = day;
      }
    }
    if (worstDay !== -1 && worstRate >= 0.4) {
      results.push({
        id: `missed-weekday-${worstDay}`,
        text: `${WEEKDAY_NAMES[worstDay]}s have a high missed-day rate (${Math.round(worstRate * 100)}%).`,
      });
    }

    return results;
  }, [state.categories, state.sessions, state.dayTypes]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready,
      nextAccentColor,
      setProfile,
      completeOnboarding,
      addCategory,
      removeCategory,
      updateCategory,
      setWakeWindow,
      addAnchor,
      removeAnchor,
      updateAnchor,
      addEvent,
      removeEvent,
      updateEvent,
      setDayType,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopTimer,
      cancelTimer,
      logSessionManually,
      updateSession,
      removeSession,
      weeklyMinutes,
      weeklySessionCount,
      currentStreak,
      streakInfo,
      leaveBalance,
      updateSettings,
      saveReview,
      insights,
    }),
    [
      state,
      ready,
      nextAccentColor,
      setProfile,
      completeOnboarding,
      addCategory,
      removeCategory,
      updateCategory,
      setWakeWindow,
      addAnchor,
      removeAnchor,
      updateAnchor,
      addEvent,
      removeEvent,
      updateEvent,
      setDayType,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopTimer,
      cancelTimer,
      logSessionManually,
      updateSession,
      removeSession,
      weeklyMinutes,
      weeklySessionCount,
      currentStreak,
      streakInfo,
      leaveBalance,
      updateSettings,
      saveReview,
      insights,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { todayISO };

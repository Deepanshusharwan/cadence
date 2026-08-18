"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import type { MarkKey, ProMarkKey } from "@/components/marks";
import { api, ApiError, type ApiInsight } from "./api";

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

// Kept client-side (used by the notification-scheduling effect in
// dashboard/layout.tsx) — this is just "does this anchor occur today," a
// trivial predicate, not the deficit/priority scheduling engine itself
// (that lives only in the backend now — architecture.md §2).
export function anchorAppliesOn(anchor: ScheduleAnchor, dateISO: string, dayOfWeek: number) {
  if (anchor.recurrence === "once") return anchor.date === dateISO;
  if (anchor.recurrence === "weekly") return anchor.daysOfWeek.includes(dayOfWeek);
  return true; // daily
}

export interface Session {
  id: string;
  categoryId: string | null;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  tags: string[];
}

export type DayType = "NORMAL" | "REDUCED" | "LEAVE" | "MISSED";

export type Plan = "free" | "plus" | "pro";

export interface Profile {
  name: string;
  avatar: MarkKey | ProMarkKey;
  accentColor: string;
  plan: Plan;
}

// Timer is deliberately client-only, in-memory state — there's no backend
// resource for "an anchor in progress." Only the resulting Session, created
// on stop, is persisted. A page reload mid-timer loses it; that's an
// accepted prototype tradeoff rather than building a server-side timer
// resource for this pass.
export interface Timer {
  categoryId: string;
  startedAt: number; // epoch ms
  accumulatedMs: number;
  paused: boolean;
}

export type EventType = "SCHOOL_OR_WORK" | "SOCIAL" | "PERSONAL" | "TRAVEL" | "OTHER";

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
  timezone: string; // IANA name — display/spec-alignment only (§103)
  notificationsEnabled: boolean;
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
  reviews: Record<string, WeeklyReview>; // lazily populated cache, keyed by week-start YYYY-MM-DD
  leaveBalance: LeaveBalance;
  streakInfo: StreakInfo;
  insights: Insight[];
  todaySchedule: ScheduleBlock[];
}

const EMPTY_REVIEW: WeeklyReview = { wins: "", problems: "", nextWeekChanges: "" };

const EMPTY_LEAVE: LeaveBalance = {
  monthlyAllowance: 0,
  carried: 0,
  totalAvailable: 0,
  used: 0,
  remaining: 0,
  cap: 0,
};

const EMPTY_STREAK_RUN: StreakRun = { length: 0, dates: [] };
const EMPTY_STREAK_INFO: StreakInfo = { current: EMPTY_STREAK_RUN, longest: EMPTY_STREAK_RUN };

const DEFAULT_STATE: State = {
  onboarded: false,
  profile: { name: "", avatar: "cat", accentColor: "notion-blue", plan: "free" },
  categories: [],
  wakeStart: "06:00",
  wakeEnd: "08:00",
  anchors: [],
  sessions: [],
  events: [],
  dayTypes: {},
  timer: null,
  settings: { leaveMonthlyAllowance: 7, leaveCarryCap: 14, timezone: "UTC", notificationsEnabled: false },
  reviews: {},
  leaveBalance: EMPTY_LEAVE,
  streakInfo: EMPTY_STREAK_INFO,
  insights: [],
  todaySchedule: [],
};

// Local calendar date as YYYY-MM-DD — deliberately not toISOString(),
// which is UTC-based and rolls over to the "wrong" day for timezones
// ahead of UTC during local early-morning hours.
function todayISO(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export interface ScheduleBlock {
  time: string;
  label: string;
  dim: boolean;
  isEvent: boolean;
}

interface StoreValue {
  state: State;
  ready: boolean;
  suspended: boolean;
  setProfile: (patch: Partial<Profile>) => void;
  refreshProfile: () => Promise<void>;
  completeOnboarding: () => void;
  addCategory: (input: Omit<Category, "id" | "color">) => Promise<Category | undefined>;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  setWakeWindow: (start: string, end: string) => void;
  addAnchor: (input: Omit<ScheduleAnchor, "id">) => Promise<ScheduleAnchor | undefined>;
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
  previousWeeklyMinutes: (categoryId: string) => number;
  previousWeeklySessionCount: (categoryId: string) => number;
  currentStreak: () => number;
  streakInfo: () => StreakInfo;
  leaveBalance: () => LeaveBalance;
  updateSettings: (patch: Partial<AppSettings>) => void;
  loadReview: (weekStartISO: string) => void;
  saveReview: (weekStartISO: string, patch: Partial<WeeklyReview>) => void;
  insights: () => Insight[];
}

const StoreContext = createContext<StoreValue | null>(null);

function startOfWeekISO(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday as week start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function insightFromApi(i: ApiInsight): Insight {
  return { id: i.id, text: i.text };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // StoreProvider wraps the whole app, including the public landing page —
  // gate the bootstrap fetch on Clerk actually reporting a signed-in user so
  // an anonymous visit to "/" never fires (and fails) authenticated API
  // calls. Pages that need real data (/setup, /dashboard/*) are already
  // behind middleware.ts's auth.protect(), so by the time they render,
  // isSignedIn is true here too.
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const reviewsLoading = useRef<Set<string>>(new Set());

  const refreshComputed = useCallback(async (onDate?: string) => {
    const [leave, streaks, insights, schedule] = await Promise.all([
      api.getLeaveBalance(),
      api.getStreakInfo(),
      api.getInsights(),
      api.getTodaySchedule(onDate),
    ]);
    setState((s) => ({
      ...s,
      leaveBalance: leave,
      streakInfo: streaks,
      insights: insights.map(insightFromApi),
      todaySchedule: schedule,
    }));
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (!isSignedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }
    let cancelled = false;
    async function bootstrap() {
      try {
        const [me, categories, anchors, sessions, events, dayEntries, leave, streaks, insights, schedule] =
          await Promise.all([
            api.getMe(),
            api.listCategories(),
            api.listAnchors(),
            api.listSessions(),
            api.listEvents(),
            api.listDayTypes(),
            api.getLeaveBalance(),
            api.getStreakInfo(),
            api.getInsights(),
            api.getTodaySchedule(),
          ]);
        if (cancelled) return;
        const dayTypes: Record<string, DayType> = {};
        for (const entry of dayEntries) dayTypes[entry.date] = entry.dayType;

        setState((s) => ({
          ...s,
          onboarded: me.onboarded,
          profile: {
            name: me.name,
            avatar: me.avatar as MarkKey | ProMarkKey,
            accentColor: me.accentColor,
            plan: me.plan,
          },
          wakeStart: me.wakeStart,
          wakeEnd: me.wakeEnd,
          settings: {
            leaveMonthlyAllowance: me.leaveMonthlyAllowance,
            leaveCarryCap: me.leaveCarryCap,
            timezone: me.timezone,
            notificationsEnabled: me.notificationsEnabled,
          },
          categories,
          anchors,
          sessions,
          events,
          dayTypes,
          leaveBalance: leave,
          streakInfo: streaks,
          insights: insights.map(insightFromApi),
          todaySchedule: schedule,
        }));
      } catch (err) {
        console.error("Failed to load Cadence data from the API", err);
        // A banned account gets 403 from every endpoint (deps.get_current_user
        // enforces it centrally on the backend) — this is the one failure
        // mode worth a dedicated screen instead of the generic error log.
        if (!cancelled && err instanceof ApiError && err.status === 403) {
          setSuspended(true);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, isSignedIn]);

  const setProfile = useCallback(
    (patch: Partial<Profile>) => {
      setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
      api.updateMe(patch).catch((err) => console.error("setProfile failed", err));
    },
    []
  );

  // Re-reads /me and applies just the plan (not the whole patch/PATCH
  // machinery setProfile uses) -- for the post-checkout redirect, where the
  // webhook that actually grants the plan runs server-side, independent of
  // and possibly a beat behind the browser landing back on /dashboard.
  const refreshProfile = useCallback(async () => {
    try {
      const me = await api.getMe();
      setState((s) => ({ ...s, profile: { ...s.profile, plan: me.plan } }));
    } catch (err) {
      console.error("refreshProfile failed", err);
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((s) => ({ ...s, onboarded: true }));
    api.updateMe({ onboarded: true }).catch((err) => console.error("completeOnboarding failed", err));
  }, []);

  const addCategory = useCallback(async (input: Omit<Category, "id" | "color">) => {
    try {
      const category = await api.createCategory(input);
      setState((s) => ({ ...s, categories: [...s.categories, category] }));
      return category;
    } catch (err) {
      console.error("addCategory failed", err);
      return undefined;
    }
  }, []);

  const removeCategory = useCallback((id: string) => {
    setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
    api.deleteCategory(id).catch((err) => console.error("removeCategory failed", err));
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    api.updateCategory(id, patch).catch((err) => console.error("updateCategory failed", err));
  }, []);

  const setWakeWindow = useCallback((start: string, end: string) => {
    setState((s) => ({ ...s, wakeStart: start, wakeEnd: end }));
    api
      .updateMe({ wakeStart: start, wakeEnd: end })
      .catch((err) => console.error("setWakeWindow failed", err));
  }, []);

  const addAnchor = useCallback(
    async (input: Omit<ScheduleAnchor, "id">) => {
      try {
        const anchor = await api.createAnchor(input);
        setState((s) => ({ ...s, anchors: [...s.anchors, anchor] }));
        // A same-day "once" anchor's date is set client-side (local calendar
        // day) while the server's default "today" for GET /today falls back
        // to its own system clock -- those can disagree right around local
        // midnight in timezones ahead of UTC, silently hiding what was just
        // created. Only override for that exact case: a one-off anchor for a
        // *different* day should never make todaySchedule show non-today data.
        const isTodayOnce = input.recurrence === "once" && input.date === todayISO();
        await refreshComputed(isTodayOnce ? input.date! : undefined);
        return anchor;
      } catch (err) {
        console.error("addAnchor failed", err);
        return undefined;
      }
    },
    [refreshComputed]
  );

  const removeAnchor = useCallback((id: string) => {
    setState((s) => ({ ...s, anchors: s.anchors.filter((a) => a.id !== id) }));
    api.deleteAnchor(id).catch((err) => console.error("removeAnchor failed", err));
  }, []);

  const updateAnchor = useCallback((id: string, patch: Partial<ScheduleAnchor>) => {
    setState((s) => ({
      ...s,
      anchors: s.anchors.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
    api.updateAnchor(id, patch).catch((err) => console.error("updateAnchor failed", err));
  }, []);

  const addEvent = useCallback(async (input: Omit<CadenceEvent, "id">) => {
    try {
      const event = await api.createEvent(input);
      setState((s) => ({ ...s, events: [...s.events, event] }));
    } catch (err) {
      console.error("addEvent failed", err);
    }
  }, []);

  const removeEvent = useCallback((id: string) => {
    setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
    api.deleteEvent(id).catch((err) => console.error("removeEvent failed", err));
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<CadenceEvent>) => {
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }, []);

  const setDayType = useCallback(
    (date: string, type: DayType) => {
      setState((s) => ({ ...s, dayTypes: { ...s.dayTypes, [date]: type } }));
      api
        .setDayType(date, type)
        .then(() => refreshComputed())
        .catch((err) => console.error("setDayType failed", err));
    },
    [refreshComputed]
  );

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

  const logSessionManually = useCallback(
    async (categoryId: string, minutes: number, date = todayISO(), tags: string[] = []) => {
      try {
        const session = await api.createSession({ categoryId, date, durationMinutes: minutes, tags });
        setState((s) => ({ ...s, sessions: [...s.sessions, session] }));
        await refreshComputed();
      } catch (err) {
        console.error("logSessionManually failed", err);
      }
    },
    [refreshComputed]
  );

  const stopTimer = useCallback(() => {
    setState((s) => {
      if (!s.timer) return s;
      const runningMs = s.timer.paused ? 0 : Date.now() - s.timer.startedAt;
      const minutes = Math.max(1, Math.round((s.timer.accumulatedMs + runningMs) / 60000));
      const categoryId = s.timer.categoryId;
      api
        .createSession({ categoryId, date: todayISO(), durationMinutes: minutes, tags: [] })
        .then((session) => {
          setState((s2) => ({ ...s2, sessions: [...s2.sessions, session] }));
          refreshComputed();
        })
        .catch((err) => console.error("stopTimer failed", err));
      return { ...s, timer: null };
    });
  }, [refreshComputed]);

  const cancelTimer = useCallback(() => {
    setState((s) => ({ ...s, timer: null }));
  }, []);

  const updateSession = useCallback(
    (id: string, patch: Partial<Omit<Session, "id">>) => {
      setState((s) => ({
        ...s,
        sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...patch } : sess)),
      }));
      api
        .updateSession(id, patch)
        .then(() => refreshComputed())
        .catch((err) => console.error("updateSession failed", err));
    },
    [refreshComputed]
  );

  const removeSession = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, sessions: s.sessions.filter((sess) => sess.id !== id) }));
      api
        .deleteSession(id)
        .then(() => refreshComputed())
        .catch((err) => console.error("removeSession failed", err));
    },
    [refreshComputed]
  );

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

  // Previous week's totals -- used as a reference point for categories with
  // no weekly target (spec has no "minimum" to compare against, so last
  // week's own total stands in for one) instead of always showing 0
  // progress for them.
  const previousWeekRange = useCallback(() => {
    const thisWeekStart = startOfWeekISO();
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    return { lastWeekStart, thisWeekStart };
  }, []);

  const previousWeeklyMinutes = useCallback(
    (categoryId: string) => {
      const { lastWeekStart, thisWeekStart } = previousWeekRange();
      return state.sessions
        .filter(
          (s) =>
            s.categoryId === categoryId &&
            parseLocalDate(s.date) >= lastWeekStart &&
            parseLocalDate(s.date) < thisWeekStart
        )
        .reduce((sum, s) => sum + s.durationMinutes, 0);
    },
    [state.sessions, previousWeekRange]
  );

  const previousWeeklySessionCount = useCallback(
    (categoryId: string) => {
      const { lastWeekStart, thisWeekStart } = previousWeekRange();
      return state.sessions.filter(
        (s) =>
          s.categoryId === categoryId &&
          s.durationMinutes >= 45 &&
          parseLocalDate(s.date) >= lastWeekStart &&
          parseLocalDate(s.date) < thisWeekStart
      ).length;
    },
    [state.sessions, previousWeekRange]
  );

  const currentStreak = useCallback(() => state.streakInfo.current.length, [state.streakInfo]);
  const streakInfoGetter = useCallback(() => state.streakInfo, [state.streakInfo]);
  const leaveBalanceGetter = useCallback(() => state.leaveBalance, [state.leaveBalance]);
  const insightsGetter = useCallback(() => state.insights, [state.insights]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    api.updateMe(patch).catch((err) => console.error("updateSettings failed", err));
  }, []);

  const loadReview = useCallback((weekStartISO: string) => {
    if (state.reviews[weekStartISO] || reviewsLoading.current.has(weekStartISO)) return;
    reviewsLoading.current.add(weekStartISO);
    api
      .getReview(weekStartISO)
      .then((review) => {
        setState((s) => ({
          ...s,
          reviews: { ...s.reviews, [weekStartISO]: { ...review } },
        }));
      })
      .catch((err) => console.error("loadReview failed", err))
      .finally(() => reviewsLoading.current.delete(weekStartISO));
  }, [state.reviews]);

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
    api.saveReview(weekStartISO, patch).catch((err) => console.error("saveReview failed", err));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready,
      suspended,
      setProfile,
      refreshProfile,
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
      previousWeeklyMinutes,
      previousWeeklySessionCount,
      currentStreak,
      streakInfo: streakInfoGetter,
      leaveBalance: leaveBalanceGetter,
      updateSettings,
      loadReview,
      saveReview,
      insights: insightsGetter,
    }),
    [
      state,
      ready,
      suspended,
      setProfile,
      refreshProfile,
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
      previousWeeklyMinutes,
      previousWeeklySessionCount,
      currentStreak,
      streakInfoGetter,
      leaveBalanceGetter,
      updateSettings,
      loadReview,
      saveReview,
      insightsGetter,
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

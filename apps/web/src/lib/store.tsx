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
}

export type DayType = "NORMAL" | "REDUCED" | "LEAVE" | "MISSED";

export interface Profile {
  name: string;
  avatar: MarkKey;
}

export interface Timer {
  categoryId: string;
  startedAt: number; // epoch ms
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
  dayTypes: {},
  timer: null,
  settings: DEFAULT_SETTINGS,
  reviews: {},
};

const STORAGE_KEY = "cadence-state-v4";

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
    return {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      anchors,
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
  setDayType: (date: string, type: DayType) => void;
  startTimer: (categoryId: string) => void;
  stopTimer: () => void;
  logSessionManually: (categoryId: string, minutes: number, date?: string) => void;
  weeklyMinutes: (categoryId: string) => number;
  weeklySessionCount: (categoryId: string) => number;
  leaveBalance: () => LeaveBalance;
  updateSettings: (patch: Partial<AppSettings>) => void;
  saveReview: (weekStartISO: string, patch: Partial<WeeklyReview>) => void;
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

  const setDayType = useCallback((date: string, type: DayType) => {
    setState((s) => ({ ...s, dayTypes: { ...s.dayTypes, [date]: type } }));
  }, []);

  const startTimer = useCallback((categoryId: string) => {
    setState((s) => ({ ...s, timer: { categoryId, startedAt: Date.now() } }));
  }, []);

  const stopTimer = useCallback(() => {
    setState((s) => {
      if (!s.timer) return s;
      const minutes = Math.max(1, Math.round((Date.now() - s.timer.startedAt) / 60000));
      const session: Session = {
        id: crypto.randomUUID(),
        categoryId: s.timer.categoryId,
        date: todayISO(),
        durationMinutes: minutes,
      };
      return { ...s, timer: null, sessions: [...s.sessions, session] };
    });
  }, []);

  const logSessionManually = useCallback(
    (categoryId: string, minutes: number, date = todayISO()) => {
      setState((s) => ({
        ...s,
        sessions: [
          ...s.sessions,
          { id: crypto.randomUUID(), categoryId, date, durationMinutes: minutes },
        ],
      }));
    },
    []
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
      setDayType,
      startTimer,
      stopTimer,
      logSessionManually,
      weeklyMinutes,
      weeklySessionCount,
      leaveBalance,
      updateSettings,
      saveReview,
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
      setDayType,
      startTimer,
      stopTimer,
      logSessionManually,
      weeklyMinutes,
      weeklySessionCount,
      leaveBalance,
      updateSettings,
      saveReview,
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

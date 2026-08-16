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

export interface Anchors {
  wakeStart: string;
  wakeEnd: string;
  morningAnchorEnabled: boolean;
  morningAnchorStart: string;
  morningAnchorEnd: string;
  morningAnchorCategoryId: string | null;
  fixedStart: string;
  fixedEnd: string;
  eveningBlock1Start: string;
  eveningBlock1End: string;
  eveningBlock2Start: string;
  eveningBlock2End: string;
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

interface State {
  onboarded: boolean;
  profile: Profile;
  categories: Category[];
  anchors: Anchors;
  sessions: Session[];
  dayTypes: Record<string, DayType>;
  timer: Timer | null;
}

const ACCENT_CLASSES = [
  "bg-marigold",
  "bg-terracotta",
  "bg-signal-blue",
  "bg-sky-wash",
  "bg-orchid",
  "bg-midnight-ink",
];

const DEFAULT_ANCHORS: Anchors = {
  wakeStart: "06:00",
  wakeEnd: "08:00",
  morningAnchorEnabled: false,
  morningAnchorStart: "08:00",
  morningAnchorEnd: "09:00",
  morningAnchorCategoryId: null,
  fixedStart: "10:00",
  fixedEnd: "18:00",
  eveningBlock1Start: "19:00",
  eveningBlock1End: "21:00",
  eveningBlock2Start: "21:30",
  eveningBlock2End: "23:30",
};

const DEFAULT_STATE: State = {
  onboarded: false,
  profile: { name: "", avatar: "cat" },
  categories: [],
  anchors: DEFAULT_ANCHORS,
  sessions: [],
  dayTypes: {},
  timer: null,
};

const STORAGE_KEY = "cadence-state-v1";

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
    return { ...DEFAULT_STATE, ...parsed, anchors: { ...DEFAULT_ANCHORS, ...parsed.anchors } };
  } catch {
    return DEFAULT_STATE;
  }
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
  setAnchors: (patch: Partial<Anchors>) => void;
  setDayType: (date: string, type: DayType) => void;
  startTimer: (categoryId: string) => void;
  stopTimer: () => void;
  logSessionManually: (categoryId: string, minutes: number, date?: string) => void;
  weeklyMinutes: (categoryId: string) => number;
  weeklySessionCount: (categoryId: string) => number;
  leaveBalance: () => { used: number; monthly: number };
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

  const setAnchors = useCallback((patch: Partial<Anchors>) => {
    setState((s) => ({ ...s, anchors: { ...s.anchors, ...patch } }));
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

  const leaveBalance = useCallback(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let used = 0;
    for (const [date, type] of Object.entries(state.dayTypes)) {
      if (!date.startsWith(monthPrefix)) continue;
      if (type === "REDUCED") used += 1;
      if (type === "LEAVE") used += 2;
    }
    return { used, monthly: 7 };
  }, [state.dayTypes]);

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
      setAnchors,
      setDayType,
      startTimer,
      stopTimer,
      logSessionManually,
      weeklyMinutes,
      weeklySessionCount,
      leaveBalance,
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
      setAnchors,
      setDayType,
      startTimer,
      stopTimer,
      logSessionManually,
      weeklyMinutes,
      weeklySessionCount,
      leaveBalance,
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

// Thin client for the FastAPI backend (backend/app). Talks in the same
// camelCase shapes lib/store.tsx already uses everywhere else in the app —
// the snake_case <-> camelCase mapping lives entirely in this file so nothing
// downstream has to know the backend uses a different naming convention.
//
// Every request carries the current Clerk session token (via
// lib/auth-token.ts's bridge) so the backend's real JWKS verification has
// something to check — see backend/app/auth.py.

import { getAuthToken } from "./auth-token";

// Exported so callers building a full URL to a non-JSON backend route
// (e.g. the calendar .ics feed link shown in Settings) can use the same
// base the rest of this client already talks to.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Carries the real HTTP status, so callers (store.tsx's bootstrap, for the
// banned-account case) can branch on it reliably instead of string-matching
// a generic Error's message.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // The dev backend is a single-process uvicorn instance without any
  // production tuning, and bootstrap fires ~10 requests in one burst — that
  // combination occasionally drops one connection at the network level
  // (never after the server actually receives the request, so a retry here
  // is safe). One retry with a short backoff absorbs that without masking
  // real HTTP error responses, which are never retried.
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ApiError(res.status, `${init?.method ?? "GET"} ${path} failed: ${res.status} ${body}`);
      }
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      const isNetworkFailure = err instanceof TypeError;
      if (!isNetworkFailure || attempt === 1) throw err;
      await sleep(150);
    }
  }
  throw lastError;
}

// For file downloads (CSV export) -- apiFetch above always calls res.json(),
// which would try to parse a CSV file as JSON and fail.
async function apiFetchBlob(path: string): Promise<Blob> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, `GET ${path} failed: ${res.status} ${body}`);
  }
  return res.blob();
}

// Public, unauthenticated fetch -- for GET /share/{token}, viewed by
// logged-out visitors, which must never carry a Clerk bearer token.
async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, `GET ${path} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

// --- Wire types (snake_case, as returned by the backend) -------------------

type Plan = "free" | "plus" | "pro";

interface WireUser {
  id: string;
  name: string;
  avatar: string;
  timezone: string;
  wake_start: string;
  wake_end: string;
  leave_monthly_allowance: number;
  leave_carry_cap: number;
  notifications_enabled: boolean;
  onboarded: boolean;
  plan: Plan;
}

interface WireAdminUser {
  id: string;
  name: string;
  avatar: string;
  plan: Plan;
  banned: boolean;
  onboarded: boolean;
  created_at: string;
}

interface WireCategory {
  id: string;
  name: string;
  tracking_mode: "hours" | "sessions";
  weekly_target: number | null;
  priority_tier: number;
  weekend_preferred: boolean;
  color: string;
}

interface WireAnchor {
  id: string;
  label: string;
  start: string;
  end: string;
  recurrence: "daily" | "weekly" | "once";
  days_of_week: number[];
  date: string | null;
  is_focus_block: boolean;
  category_ids: string[];
}

interface WireSession {
  id: string;
  category_id: string | null;
  date: string;
  duration_minutes: number;
  tags: string[];
}

interface WireEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  type: "SCHOOL_OR_WORK" | "SOCIAL" | "PERSONAL" | "TRAVEL" | "OTHER";
  notes: string;
}

interface WireDayEntry {
  date: string;
  day_type: "NORMAL" | "REDUCED" | "LEAVE" | "MISSED";
}

interface WireFeedback {
  id: string;
  type: "bug" | "idea" | "review" | "other";
  message: string;
  created_at: string;
}

interface WireFeedbackAdmin extends WireFeedback {
  user_id: string;
  user_name: string;
  user_avatar: string;
}

interface WireReview {
  week_start: string;
  wins: string;
  problems: string;
  next_week_changes: string;
}

interface WireLeaveBalance {
  monthly_allowance: number;
  carried: number;
  total_available: number;
  used: number;
  remaining: number;
  cap: number;
}

interface WireStreakRun {
  length: number;
  dates: string[];
}

interface WireStreakInfo {
  current: WireStreakRun;
  longest: WireStreakRun;
}

interface WireMonthlyCategoryTotal {
  month: string;
  category_id: string;
  minutes: number;
  session_count: number;
}

interface WireMonthlyConsistency {
  month: string;
  pct: number;
}

interface WireLongTermTrend {
  months: WireMonthlyCategoryTotal[];
  monthly_consistency_pct: WireMonthlyConsistency[];
}

interface WireShareLink {
  token: string;
  created_at: string;
}

interface WireCalendarFeed {
  token: string;
  created_at: string;
}

interface WireSharedCategoryProgress {
  name: string;
  color: string;
  tracking_mode: "hours" | "sessions";
  weekly_target: number | null;
  current: number;
}

interface WireSharedProgress {
  user_name: string;
  user_avatar: string;
  current_streak: number;
  longest_streak: number;
  consistency_pct: number;
  categories: WireSharedCategoryProgress[];
}

interface WireScheduleBlock {
  start: string;
  time: string;
  label: string;
  dim: boolean;
  is_event: boolean;
}

// --- Client-facing (camelCase) shapes, mirroring lib/store.tsx -------------

export interface ApiUser {
  id: string;
  name: string;
  avatar: string;
  timezone: string;
  wakeStart: string;
  wakeEnd: string;
  leaveMonthlyAllowance: number;
  leaveCarryCap: number;
  notificationsEnabled: boolean;
  onboarded: boolean;
  plan: Plan;
}

export interface ApiAdminUser {
  id: string;
  name: string;
  avatar: string;
  plan: Plan;
  banned: boolean;
  onboarded: boolean;
  createdAt: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  trackingMode: "hours" | "sessions";
  weeklyTarget: number | null;
  priorityTier: number;
  weekendPreferred: boolean;
  color: string;
}

export interface ApiAnchor {
  id: string;
  label: string;
  start: string;
  end: string;
  recurrence: "daily" | "weekly" | "once";
  daysOfWeek: number[];
  date: string | null;
  isFocusBlock: boolean;
  categoryIds: string[];
}

export interface ApiSession {
  id: string;
  categoryId: string | null;
  date: string;
  durationMinutes: number;
  tags: string[];
}

export interface ApiEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  type: "SCHOOL_OR_WORK" | "SOCIAL" | "PERSONAL" | "TRAVEL" | "OTHER";
  notes: string;
}

export interface ApiDayEntry {
  date: string;
  dayType: "NORMAL" | "REDUCED" | "LEAVE" | "MISSED";
}

export interface ApiReview {
  weekStart: string;
  wins: string;
  problems: string;
  nextWeekChanges: string;
}

export interface ApiLeaveBalance {
  monthlyAllowance: number;
  carried: number;
  totalAvailable: number;
  used: number;
  remaining: number;
  cap: number;
}

export interface ApiStreakRun {
  length: number;
  dates: string[];
}

export interface ApiStreakInfo {
  current: ApiStreakRun;
  longest: ApiStreakRun;
}

export interface ApiScheduleBlock {
  start: string;
  time: string;
  label: string;
  dim: boolean;
  isEvent: boolean;
}

export interface ApiInsight {
  id: string;
  text: string;
}

export interface ApiShareLink {
  token: string;
  createdAt: string;
}

export interface ApiCalendarFeed {
  token: string;
  createdAt: string;
}

export interface ApiSharedProgress {
  userName: string;
  userAvatar: string;
  currentStreak: number;
  longestStreak: number;
  consistencyPct: number;
  categories: {
    name: string;
    color: string;
    trackingMode: "hours" | "sessions";
    weeklyTarget: number | null;
    current: number;
  }[];
}

export interface ApiLongTermTrend {
  months: { month: string; categoryId: string; minutes: number; sessionCount: number }[];
  monthlyConsistencyPct: { month: string; pct: number }[];
}

export interface ApiFeedback {
  id: string;
  type: "bug" | "idea" | "review" | "other";
  message: string;
  createdAt: string;
  userId: string;
  userName: string;
  userAvatar: string;
}

export interface ApiAdminEmail {
  id: string | null;
  email: string;
  source: "seed" | "added";
}

const userFromWire = (w: WireUser): ApiUser => ({
  id: w.id,
  name: w.name,
  avatar: w.avatar,
  timezone: w.timezone,
  wakeStart: w.wake_start,
  wakeEnd: w.wake_end,
  leaveMonthlyAllowance: w.leave_monthly_allowance,
  leaveCarryCap: w.leave_carry_cap,
  notificationsEnabled: w.notifications_enabled,
  onboarded: w.onboarded,
  plan: w.plan,
});

const adminUserFromWire = (w: WireAdminUser): ApiAdminUser => ({
  id: w.id,
  name: w.name,
  avatar: w.avatar,
  plan: w.plan,
  banned: w.banned,
  onboarded: w.onboarded,
  createdAt: w.created_at,
});

const categoryFromWire = (w: WireCategory): ApiCategory => ({
  id: w.id,
  name: w.name,
  trackingMode: w.tracking_mode,
  weeklyTarget: w.weekly_target,
  priorityTier: w.priority_tier,
  weekendPreferred: w.weekend_preferred,
  color: w.color,
});

const anchorFromWire = (w: WireAnchor): ApiAnchor => ({
  id: w.id,
  label: w.label,
  start: w.start,
  end: w.end,
  recurrence: w.recurrence,
  daysOfWeek: w.days_of_week,
  date: w.date,
  isFocusBlock: w.is_focus_block,
  categoryIds: w.category_ids,
});

const sessionFromWire = (w: WireSession): ApiSession => ({
  id: w.id,
  categoryId: w.category_id,
  date: w.date,
  durationMinutes: w.duration_minutes,
  tags: w.tags,
});

const eventFromWire = (w: WireEvent): ApiEvent => ({
  id: w.id,
  title: w.title,
  date: w.date,
  start: w.start,
  end: w.end,
  type: w.type,
  notes: w.notes,
});

const dayEntryFromWire = (w: WireDayEntry): ApiDayEntry => ({ date: w.date, dayType: w.day_type });

const reviewFromWire = (w: WireReview): ApiReview => ({
  weekStart: w.week_start,
  wins: w.wins,
  problems: w.problems,
  nextWeekChanges: w.next_week_changes,
});

const leaveFromWire = (w: WireLeaveBalance): ApiLeaveBalance => ({
  monthlyAllowance: w.monthly_allowance,
  carried: w.carried,
  totalAvailable: w.total_available,
  used: w.used,
  remaining: w.remaining,
  cap: w.cap,
});

const streakInfoFromWire = (w: WireStreakInfo): ApiStreakInfo => ({
  current: w.current,
  longest: w.longest,
});

const longTermTrendFromWire = (w: WireLongTermTrend): ApiLongTermTrend => ({
  months: w.months.map((m) => ({
    month: m.month,
    categoryId: m.category_id,
    minutes: m.minutes,
    sessionCount: m.session_count,
  })),
  monthlyConsistencyPct: w.monthly_consistency_pct,
});

const sharedProgressFromWire = (w: WireSharedProgress): ApiSharedProgress => ({
  userName: w.user_name,
  userAvatar: w.user_avatar,
  currentStreak: w.current_streak,
  longestStreak: w.longest_streak,
  consistencyPct: w.consistency_pct,
  categories: w.categories.map((c) => ({
    name: c.name,
    color: c.color,
    trackingMode: c.tracking_mode,
    weeklyTarget: c.weekly_target,
    current: c.current,
  })),
});

const scheduleBlockFromWire = (w: WireScheduleBlock): ApiScheduleBlock => ({
  start: w.start,
  time: w.time,
  label: w.label,
  dim: w.dim,
  isEvent: w.is_event,
});

// --- API surface -------------------------------------------------------------

export const api = {
  getMe: () => apiFetch<WireUser>("/me").then(userFromWire),
  updateMe: (patch: Partial<Omit<ApiUser, "id">>) =>
    apiFetch<WireUser>("/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: patch.name,
        avatar: patch.avatar,
        timezone: patch.timezone,
        wake_start: patch.wakeStart,
        wake_end: patch.wakeEnd,
        leave_monthly_allowance: patch.leaveMonthlyAllowance,
        leave_carry_cap: patch.leaveCarryCap,
        notifications_enabled: patch.notificationsEnabled,
        onboarded: patch.onboarded,
      }),
    }).then(userFromWire),

  listCategories: () => apiFetch<WireCategory[]>("/categories").then((rows) => rows.map(categoryFromWire)),
  createCategory: (input: Omit<ApiCategory, "id" | "color">) =>
    apiFetch<WireCategory>("/categories", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        tracking_mode: input.trackingMode,
        weekly_target: input.weeklyTarget,
        priority_tier: input.priorityTier,
        weekend_preferred: input.weekendPreferred,
      }),
    }).then(categoryFromWire),
  updateCategory: (id: string, patch: Partial<Omit<ApiCategory, "id" | "color">>) =>
    apiFetch<WireCategory>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: patch.name,
        tracking_mode: patch.trackingMode,
        weekly_target: patch.weeklyTarget,
        priority_tier: patch.priorityTier,
        weekend_preferred: patch.weekendPreferred,
      }),
    }).then(categoryFromWire),
  deleteCategory: (id: string) => apiFetch<void>(`/categories/${id}`, { method: "DELETE" }),

  listAnchors: () => apiFetch<WireAnchor[]>("/anchors").then((rows) => rows.map(anchorFromWire)),
  createAnchor: (input: Omit<ApiAnchor, "id">) =>
    apiFetch<WireAnchor>("/anchors", {
      method: "POST",
      body: JSON.stringify({
        label: input.label,
        start: input.start,
        end: input.end,
        recurrence: input.recurrence,
        days_of_week: input.daysOfWeek,
        date: input.date,
        is_focus_block: input.isFocusBlock,
        category_ids: input.categoryIds,
      }),
    }).then(anchorFromWire),
  updateAnchor: (id: string, patch: Partial<Omit<ApiAnchor, "id">>) =>
    apiFetch<WireAnchor>(`/anchors/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        label: patch.label,
        start: patch.start,
        end: patch.end,
        recurrence: patch.recurrence,
        days_of_week: patch.daysOfWeek,
        date: patch.date,
        is_focus_block: patch.isFocusBlock,
        category_ids: patch.categoryIds,
      }),
    }).then(anchorFromWire),
  deleteAnchor: (id: string) => apiFetch<void>(`/anchors/${id}`, { method: "DELETE" }),

  listSessions: () => apiFetch<WireSession[]>("/sessions").then((rows) => rows.map(sessionFromWire)),
  createSession: (input: { categoryId: string; date: string; durationMinutes: number; tags: string[] }) =>
    apiFetch<WireSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({
        category_id: input.categoryId,
        date: input.date,
        duration_minutes: input.durationMinutes,
        tags: input.tags,
      }),
    }).then(sessionFromWire),
  updateSession: (
    id: string,
    patch: Partial<{ categoryId: string | null; date: string; durationMinutes: number; tags: string[] }>
  ) =>
    apiFetch<WireSession>(`/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        category_id: patch.categoryId,
        date: patch.date,
        duration_minutes: patch.durationMinutes,
        tags: patch.tags,
      }),
    }).then(sessionFromWire),
  deleteSession: (id: string) => apiFetch<void>(`/sessions/${id}`, { method: "DELETE" }),

  listEvents: () => apiFetch<WireEvent[]>("/events").then((rows) => rows.map(eventFromWire)),
  createEvent: (input: Omit<ApiEvent, "id">) =>
    apiFetch<WireEvent>("/events", { method: "POST", body: JSON.stringify(input) }).then(eventFromWire),
  deleteEvent: (id: string) => apiFetch<void>(`/events/${id}`, { method: "DELETE" }),

  listDayTypes: () => apiFetch<WireDayEntry[]>("/day-types").then((rows) => rows.map(dayEntryFromWire)),
  setDayType: (date: string, dayType: ApiDayEntry["dayType"]) =>
    apiFetch<WireDayEntry>(`/day-types/${date}`, {
      method: "PUT",
      body: JSON.stringify({ day_type: dayType }),
    }).then(dayEntryFromWire),

  getReview: (weekStart: string) => apiFetch<WireReview>(`/weekly-review/${weekStart}`).then(reviewFromWire),
  saveReview: (weekStart: string, patch: Partial<Omit<ApiReview, "weekStart">>) =>
    apiFetch<WireReview>(`/weekly-review/${weekStart}`, {
      method: "PUT",
      body: JSON.stringify({
        wins: patch.wins,
        problems: patch.problems,
        next_week_changes: patch.nextWeekChanges,
      }),
    }).then(reviewFromWire),

  submitFeedback: (input: { type: ApiFeedback["type"]; message: string }) =>
    apiFetch<WireFeedback>("/feedback", { method: "POST", body: JSON.stringify(input) }).then(() => undefined),
  listFeedback: () =>
    apiFetch<WireFeedbackAdmin[]>("/feedback").then((rows) =>
      rows.map(
        (w): ApiFeedback => ({
          id: w.id,
          type: w.type,
          message: w.message,
          createdAt: w.created_at,
          userId: w.user_id,
          userName: w.user_name,
          userAvatar: w.user_avatar,
        })
      )
    ),

  listAdminEmails: () => apiFetch<ApiAdminEmail[]>("/admin/emails"),
  addAdminEmail: (email: string) =>
    apiFetch<ApiAdminEmail>("/admin/emails", { method: "POST", body: JSON.stringify({ email }) }),
  removeAdminEmail: (id: string) => apiFetch<void>(`/admin/emails/${id}`, { method: "DELETE" }),

  listAdminUsers: () =>
    apiFetch<WireAdminUser[]>("/admin/users").then((rows) => rows.map(adminUserFromWire)),
  setUserPlan: (id: string, plan: Plan) =>
    apiFetch<WireUser>(`/admin/users/${id}/plan`, {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    }).then(userFromWire),
  setUserBanned: (id: string, banned: boolean) =>
    apiFetch<WireAdminUser>(`/admin/users/${id}/banned`, {
      method: "PATCH",
      body: JSON.stringify({ banned }),
    }).then(adminUserFromWire),

  createCheckout: (variantId: string) =>
    apiFetch<{ url: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId }),
    }),

  getLeaveBalance: () => apiFetch<WireLeaveBalance>("/leave").then(leaveFromWire),
  getStreakInfo: () => apiFetch<WireStreakInfo>("/streaks").then(streakInfoFromWire),
  getInsights: () => apiFetch<ApiInsight[]>("/insights"),
  getLongTermTrend: (months = 6) =>
    apiFetch<WireLongTermTrend>(`/analytics/long-term?months=${months}`).then(longTermTrendFromWire),

  exportJson: () => apiFetch<unknown>("/export/json"),
  exportCsv: () => apiFetchBlob("/export/csv"),

  getMyShareLink: () =>
    apiFetch<WireShareLink | null>("/share-links").then((w) =>
      w ? { token: w.token, createdAt: w.created_at } : null
    ),
  createShareLink: () =>
    apiFetch<WireShareLink>("/share-links", { method: "POST" }).then((w) => ({
      token: w.token,
      createdAt: w.created_at,
    })),
  revokeShareLink: (token: string) => apiFetch<void>(`/share-links/${token}`, { method: "DELETE" }),
  getSharedProgress: (token: string) =>
    publicFetch<WireSharedProgress>(`/share/${token}`).then(sharedProgressFromWire),

  getMyCalendarFeed: () =>
    apiFetch<WireCalendarFeed | null>("/calendar-feed").then((w) =>
      w ? { token: w.token, createdAt: w.created_at } : null
    ),
  createCalendarFeed: () =>
    apiFetch<WireCalendarFeed>("/calendar-feed", { method: "POST" }).then((w) => ({
      token: w.token,
      createdAt: w.created_at,
    })),
  revokeCalendarFeed: (token: string) => apiFetch<void>(`/calendar-feed/${token}`, { method: "DELETE" }),
  getTodaySchedule: (onDate?: string) =>
    apiFetch<WireScheduleBlock[]>(`/today${onDate ? `?on_date=${onDate}` : ""}`).then((rows) =>
      rows.map(scheduleBlockFromWire)
    ),
};

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mark, MARKS, PRO_MARKS, markSrc, type MarkKey, type ProMarkKey } from "@/components/marks";
import { PencilIcon } from "@/components/icons";
import { useStore, type Category, type TrackingMode, type AnchorRecurrence } from "@/lib/store";
import { useToast } from "@/components/toast";
import { textOnCategoryColor } from "@/lib/category-color";

const TIER_LABELS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"];

// JS Date.getDay() order (0 = Sunday), displayed Monday-first.
const WEEKDAY_OPTIONS = [
  { day: 1, label: "M" },
  { day: 2, label: "T" },
  { day: 3, label: "W" },
  { day: 4, label: "T" },
  { day: 5, label: "F" },
  { day: 6, label: "S" },
  { day: 0, label: "S" },
];

function describeRecurrence(a: { recurrence: AnchorRecurrence; date: string | null; daysOfWeek: number[] }) {
  if (a.recurrence === "once") return a.date ?? "one-off";
  if (a.recurrence === "weekly") {
    if (a.daysOfWeek.length === 0) return "weekly";
    return WEEKDAY_OPTIONS.filter((w) => a.daysOfWeek.includes(w.day))
      .map((w) => w.label)
      .join("");
  }
  return "every day";
}

const inputClass =
  "w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black outline-none transition-colors focus:border-notion-blue";

// `Intl.supportedValuesOf` isn't in every browser's lib.dom.d.ts yet — feature-detect at
// runtime and fall back to a short curated list so the picker still works everywhere.
const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function listTimezones(): string[] {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    return intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? FALLBACK_TIMEZONES;
  } catch {
    return FALLBACK_TIMEZONES;
  }
}

export default function SettingsPage() {
  const store = useStore();
  const { state } = store;
  const { show } = useToast();
  const timezoneOptions = listTimezones();

  // The plan can change out-of-band (e.g. an admin granting it via
  // /dashboard/users, or a Lemon Squeezy webhook landing after checkout) --
  // bootstrap only fetches /me once, so re-fetch on every visit here rather
  // than showing a plan badge that can silently go stale.
  useEffect(() => {
    store.refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [name, setName] = useState(state.profile.name);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatMode, setNewCatMode] = useState<TrackingMode>("hours");
  const [newCatTarget, setNewCatTarget] = useState("");
  const [newCatTier, setNewCatTier] = useState(1);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatMode, setEditCatMode] = useState<TrackingMode>("hours");
  const [editCatTarget, setEditCatTarget] = useState("");
  const [editCatTier, setEditCatTier] = useState(1);

  const [newAnchorLabel, setNewAnchorLabel] = useState("");
  const [newAnchorStart, setNewAnchorStart] = useState("09:00");
  const [newAnchorEnd, setNewAnchorEnd] = useState("10:00");
  const [newAnchorRecurrence, setNewAnchorRecurrence] = useState<AnchorRecurrence>("daily");
  const [newAnchorDaysOfWeek, setNewAnchorDaysOfWeek] = useState<number[]>([]);
  const [newAnchorDate, setNewAnchorDate] = useState("");
  const [newAnchorFocus, setNewAnchorFocus] = useState(true);
  const [newAnchorCategoryIds, setNewAnchorCategoryIds] = useState<string[]>([]);
  const [confirmingRemoveAnchorId, setConfirmingRemoveAnchorId] = useState<string | null>(null);

  function toggleNewAnchorDay(day: number) {
    setNewAnchorDaysOfWeek((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  }

  function toggleNewAnchorCategory(id: string) {
    setNewAnchorCategoryIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  function saveProfile() {
    store.setProfile({ name: name.trim() || state.profile.name });
    setIsEditingProfile(false);
    show("Profile updated");
  }

  function addCategory() {
    if (!newCatName.trim()) return;
    const categoryName = newCatName.trim();
    store.addCategory({
      name: categoryName,
      trackingMode: newCatMode,
      weeklyTarget: newCatTarget.trim() === "" ? null : Number(newCatTarget),
      priorityTier: newCatTier,
      weekendPreferred: false,
    });
    setNewCatName("");
    setNewCatTarget("");
    show(`Added ${categoryName}`);
  }

  function removeCategory(id: string, categoryName: string) {
    store.removeCategory(id);
    show(`Removed ${categoryName}`);
  }

  function startEditCategory(c: Category) {
    setEditingCategoryId(c.id);
    setEditCatName(c.name);
    setEditCatMode(c.trackingMode);
    setEditCatTarget(c.weeklyTarget === null ? "" : String(c.weeklyTarget));
    setEditCatTier(c.priorityTier);
  }

  function saveEditCategory(id: string) {
    if (!editCatName.trim()) return;
    store.updateCategory(id, {
      name: editCatName.trim(),
      trackingMode: editCatMode,
      weeklyTarget: editCatTarget.trim() === "" ? null : Number(editCatTarget),
      priorityTier: editCatTier,
    });
    setEditingCategoryId(null);
    show("Category updated");
  }

  function addAnchor() {
    if (!newAnchorLabel.trim()) return;
    if (newAnchorRecurrence === "once" && !newAnchorDate) {
      show("Pick a date for this one-off anchor");
      return;
    }
    if (newAnchorRecurrence === "weekly" && newAnchorDaysOfWeek.length === 0) {
      show("Pick at least one day of the week");
      return;
    }
    store.addAnchor({
      label: newAnchorLabel.trim(),
      start: newAnchorStart,
      end: newAnchorEnd,
      recurrence: newAnchorRecurrence,
      daysOfWeek: newAnchorDaysOfWeek,
      date: newAnchorRecurrence === "once" ? newAnchorDate : null,
      isFocusBlock: newAnchorFocus,
      categoryIds: newAnchorCategoryIds,
    });
    show(`Added ${newAnchorLabel.trim()}`);
    setNewAnchorLabel("");
    setNewAnchorRecurrence("daily");
    setNewAnchorDaysOfWeek([]);
    setNewAnchorDate("");
    setNewAnchorCategoryIds([]);
  }

  function removeAnchor(id: string, label: string) {
    store.removeAnchor(id);
    show(`Removed ${label}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-heading font-semibold text-ink-black">Settings</h1>
      <p className="mt-2 text-body-sm text-ink-black/50">
        Everything from setup lives here — nothing is locked in.
      </p>

      {/* Profile */}
      <section className="mt-8 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Profile
        </p>

        {!isEditingProfile ? (
          <div className="mt-4 flex items-center gap-3">
            <Mark src={markSrc(state.profile.avatar)} size={44} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-medium text-ink-black">{state.profile.name}</span>
              <span className="rounded-full bg-notion-blue/10 px-2 py-0.5 text-caption font-medium capitalize text-notion-blue">
                {state.profile.plan}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/pricing"
                className="text-caption font-medium text-notion-blue hover:opacity-80"
              >
                {state.profile.plan === "free" ? "Upgrade" : "Manage plan"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setName(state.profile.name);
                  setIsEditingProfile(true);
                }}
                aria-label="Edit profile"
                className="rounded-full p-2 text-ink-black/40 transition-colors hover:bg-ink-black/5 hover:text-ink-black"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              {(Object.keys(MARKS) as MarkKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => store.setProfile({ avatar: key })}
                  className={`rounded-full p-1 transition-all duration-200 ease-out ${
                    state.profile.avatar === key
                      ? "scale-110 ring-2 ring-notion-blue ring-offset-2 ring-offset-pure-white"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <Mark src={MARKS[key]} size={44} />
                </button>
              ))}
            </div>

            {state.profile.plan === "pro" ? (
              <>
                <p className="mt-4 text-caption font-medium uppercase tracking-wide text-notion-blue">
                  Pro avatars
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(Object.keys(PRO_MARKS) as ProMarkKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => store.setProfile({ avatar: key })}
                      className={`rounded-full p-1 transition-all duration-200 ease-out ${
                        state.profile.avatar === key
                          ? "scale-110 ring-2 ring-notion-blue ring-offset-2 ring-offset-pure-white"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Mark src={PRO_MARKS[key]} size={44} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 text-caption text-ink-black/40">
                <Link href="/pricing" className="text-notion-blue hover:opacity-80">
                  Upgrade to Pro
                </Link>{" "}
                to unlock 24 more avatars.
              </p>
            )}
            <button
              type="button"
              onClick={saveProfile}
              className="mt-3 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Categories
        </p>
        <div className="mt-4 space-y-2">
          {state.categories.map((c) => {
            const hasSessions = state.sessions.some((s) => s.categoryId === c.id);
            const isEditing = editingCategoryId === c.id;

            if (isEditing) {
              return (
                <div key={c.id} className={`rounded-lg p-3 ${c.color} ${textOnCategoryColor(c.color)}`}>
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className={`${inputClass} bg-pure-white`}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={editCatMode}
                        onChange={(e) => setEditCatMode(e.target.value as TrackingMode)}
                        disabled={hasSessions}
                        title={
                          hasSessions
                            ? "Locked — this category already has logged sessions"
                            : undefined
                        }
                        className={`${inputClass} bg-pure-white ${hasSessions ? "opacity-50" : ""}`}
                      >
                        <option value="hours">Hours per week</option>
                        <option value="sessions">Sessions per week</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={editCatTarget}
                        onChange={(e) => setEditCatTarget(e.target.value)}
                        placeholder="Weekly target (blank = no minimum)"
                        className={`${inputClass} bg-pure-white`}
                      />
                    </div>
                    <select
                      value={editCatTier}
                      onChange={(e) => setEditCatTier(Number(e.target.value))}
                      className={`${inputClass} bg-pure-white`}
                    >
                      {TIER_LABELS.map((label, i) => (
                        <option key={label} value={i + 1}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {hasSessions ? (
                      <p className="text-caption text-ink-black/70">
                        Hours/sessions tracking is locked once a category has logged
                        sessions — create a new category instead if you need to switch.
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEditCategory(c.id)}
                        disabled={!editCatName.trim()}
                        className="rounded-full bg-ink-black/15 px-3 py-1 text-caption font-semibold hover:bg-ink-black/25 disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategoryId(null)}
                        className="rounded-full px-3 py-1 text-caption font-medium hover:bg-ink-black/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={c.id}
                className={`flex items-center justify-between rounded-lg p-3 ${c.color} ${textOnCategoryColor(c.color)}`}
              >
                <span className="font-semibold">{c.name}</span>
                {confirmingRemoveId === c.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-medium">Remove?</span>
                    <button
                      onClick={() => {
                        removeCategory(c.id, c.name);
                        setConfirmingRemoveId(null);
                      }}
                      className="rounded-full bg-ink-black/15 px-2.5 py-1 text-caption font-semibold hover:bg-ink-black/25"
                    >
                      Yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmingRemoveId(null)}
                      className="rounded-full px-2.5 py-1 text-caption font-medium hover:bg-ink-black/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditCategory(c)}
                      aria-label={`Edit ${c.name}`}
                      className="rounded-full p-1.5 text-ink-black/50 hover:bg-ink-black/10"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmingRemoveId(c.id)}
                      className="rounded-full px-2 py-1 text-body-sm text-ink-black/50 hover:bg-ink-black/10"
                      aria-label={`Remove ${c.name}`}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name"
            className={inputClass}
          />
          <select
            value={newCatMode}
            onChange={(e) => setNewCatMode(e.target.value as TrackingMode)}
            className={inputClass}
          >
            <option value="hours">Hours per week</option>
            <option value="sessions">Sessions per week</option>
          </select>
          <input
            type="number"
            min={0}
            value={newCatTarget}
            onChange={(e) => setNewCatTarget(e.target.value)}
            placeholder="Weekly target (blank = no minimum)"
            className={inputClass}
          />
          <select
            value={newCatTier}
            onChange={(e) => setNewCatTier(Number(e.target.value))}
            className={inputClass}
          >
            {TIER_LABELS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={addCategory}
          disabled={!newCatName.trim()}
          className="mt-3 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          + Add category
        </button>
      </section>

      {/* Leave */}
      <section className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Leave
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">Monthly leave units</span>
            <input
              type="number"
              min={0}
              value={state.settings.leaveMonthlyAllowance}
              onChange={(e) =>
                store.updateSettings({ leaveMonthlyAllowance: Number(e.target.value) || 0 })
              }
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">
              Max accumulated balance
            </span>
            <input
              type="number"
              min={0}
              value={state.settings.leaveCarryCap}
              onChange={(e) => store.updateSettings({ leaveCarryCap: Number(e.target.value) || 0 })}
              className={`${inputClass} mt-1.5`}
            />
          </label>
        </div>
        <p className="mt-3 text-caption text-ink-black/40">
          Unused units carry into next month, capped at your max balance above.
        </p>
      </section>

      {/* Timezone & notifications */}
      <section className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Timezone &amp; notifications
        </p>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">Timezone</span>
            <select
              value={state.settings.timezone}
              onChange={(e) => store.updateSettings({ timezone: e.target.value })}
              className={`${inputClass} mt-1.5`}
            >
              {timezoneOptions.includes(state.settings.timezone) ? null : (
                <option value={state.settings.timezone}>{state.settings.timezone}</option>
              )}
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-caption text-ink-black/40">
              All times in Cadence are shown in your device&apos;s local time — this is used to
              label what &quot;local&quot; means once your data syncs across devices.
            </p>
          </label>

          <div className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3">
            <div>
              <p className="text-body-sm font-medium text-ink-black">Anchor reminders</p>
              <p className="text-caption text-ink-black/40">
                Browser notifications a few minutes before an anchor starts, and when your fixed
                commitment block ends.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (state.settings.notificationsEnabled) {
                  store.updateSettings({ notificationsEnabled: false });
                  show("Anchor reminders turned off");
                  return;
                }
                if (typeof Notification === "undefined") {
                  show("This browser doesn't support notifications");
                  return;
                }
                const permission =
                  Notification.permission === "granted"
                    ? "granted"
                    : await Notification.requestPermission();
                if (permission === "granted") {
                  store.updateSettings({ notificationsEnabled: true });
                  show("Anchor reminders turned on");
                } else {
                  show("Notification permission denied");
                }
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-caption font-medium transition-colors ${
                state.settings.notificationsEnabled
                  ? "bg-notion-blue text-pure-white"
                  : "bg-ink-black/5 text-ink-black/60 hover:bg-ink-black/10"
              }`}
            >
              {state.settings.notificationsEnabled ? "On" : "Off"}
            </button>
          </div>
        </div>
      </section>

      {/* Wake window */}
      <section className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Wake window
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">From</span>
            <input
              type="time"
              value={state.wakeStart}
              onChange={(e) => store.setWakeWindow(e.target.value, state.wakeEnd)}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">To</span>
            <input
              type="time"
              value={state.wakeEnd}
              onChange={(e) => store.setWakeWindow(state.wakeStart, e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </label>
        </div>
      </section>

      {/* Schedule anchors */}
      <section className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Schedule anchors
        </p>
        <p className="mt-1 text-caption text-ink-black/40">
          Add as many as you need — every day, specific weekdays, or a one-off date. Pin a
          category to any of them if you want to fix what fills it.
        </p>

        <div className="mt-4 space-y-2">
          {state.anchors.length === 0 ? (
            <p className="text-body-sm text-ink-black/40">No anchors yet.</p>
          ) : (
            state.anchors.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-ink-black/8 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-ink-black">
                    {a.label}
                    {a.categoryIds.length > 0
                      ? ` (${a.categoryIds
                          .map((id) => state.categories.find((c) => c.id === id)?.name ?? "?")
                          .join(", ")})`
                      : ""}
                  </p>
                  <p className="text-caption text-ink-black/40">
                    {a.start}–{a.end} · {describeRecurrence(a)} ·{" "}
                    {a.isFocusBlock ? "focus block" : "fixed"}
                  </p>
                </div>
                {confirmingRemoveAnchorId === a.id ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => {
                        removeAnchor(a.id, a.label);
                        setConfirmingRemoveAnchorId(null);
                      }}
                      className="rounded-full bg-ink-black/15 px-2.5 py-1 text-caption font-semibold hover:bg-ink-black/25"
                    >
                      Yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmingRemoveAnchorId(null)}
                      className="rounded-full px-2.5 py-1 text-caption font-medium hover:bg-ink-black/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingRemoveAnchorId(a.id)}
                    className="shrink-0 rounded-full px-2 py-1 text-body-sm text-ink-black/50 hover:bg-ink-black/10"
                    aria-label={`Remove ${a.label}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-dashed border-ink-black/15 p-4">
          <input
            value={newAnchorLabel}
            onChange={(e) => setNewAnchorLabel(e.target.value)}
            placeholder="e.g. Gym, Class, Evening focus"
            className={inputClass}
          />

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={newAnchorStart}
              onChange={(e) => setNewAnchorStart(e.target.value)}
              className={inputClass}
            />
            <span className="shrink-0 text-ink-black/40">–</span>
            <input
              type="time"
              value={newAnchorEnd}
              onChange={(e) => setNewAnchorEnd(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <span className="text-body-sm font-medium text-ink-black">Repeats</span>
            <select
              value={newAnchorRecurrence}
              onChange={(e) => setNewAnchorRecurrence(e.target.value as AnchorRecurrence)}
              className={`${inputClass} mt-1.5`}
            >
              <option value="daily">Every day</option>
              <option value="weekly">Specific days of the week</option>
              <option value="once">One-off, specific date</option>
            </select>
          </div>

          {newAnchorRecurrence === "weekly" ? (
            <div className="flex gap-1.5">
              {WEEKDAY_OPTIONS.map((w) => (
                <button
                  key={w.day}
                  type="button"
                  onClick={() => toggleNewAnchorDay(w.day)}
                  className={`h-8 w-8 shrink-0 rounded-full text-caption font-semibold transition-colors ${
                    newAnchorDaysOfWeek.includes(w.day)
                      ? "bg-notion-blue text-pure-white"
                      : "bg-ink-black/5 text-ink-black/50 hover:bg-ink-black/10"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          ) : null}

          {newAnchorRecurrence === "once" ? (
            <input
              type="date"
              value={newAnchorDate}
              onChange={(e) => setNewAnchorDate(e.target.value)}
              className={inputClass}
            />
          ) : null}

          <label className="flex items-center gap-2 text-body-sm text-ink-black">
            <input
              type="checkbox"
              checked={newAnchorFocus}
              onChange={(e) => setNewAnchorFocus(e.target.checked)}
              className="h-4 w-4 rounded border-ink-black/20"
            />
            Flexible focus block (planner assigns a category)
          </label>

          <div>
            <span className="text-body-sm font-medium text-ink-black">
              Pin categories (optional)
            </span>
            {state.categories.length === 0 ? (
              <p className="mt-1.5 text-body-sm text-ink-black/40">Add a category first.</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {state.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleNewAnchorCategory(c.id)}
                    className={`rounded-full px-3 py-1.5 text-caption font-medium transition-colors ${
                      newAnchorCategoryIds.includes(c.id)
                        ? "bg-notion-blue text-pure-white"
                        : "bg-ink-black/5 text-ink-black/60 hover:bg-ink-black/10"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={addAnchor}
            disabled={!newAnchorLabel.trim()}
            className="rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            + Add anchor
          </button>
        </div>
      </section>

      <Link
        href="/setup"
        className="mt-6 inline-block text-body-sm font-medium text-notion-blue hover:opacity-80"
      >
        Redo the full setup wizard →
      </Link>
    </div>
  );
}

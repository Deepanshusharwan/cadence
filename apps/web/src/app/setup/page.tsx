"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mark, MARKS, type MarkKey, type ProMarkKey } from "@/components/marks";
import { SparkleIcon } from "@/components/icons";
import { useStore, type TrackingMode, type AnchorRecurrence } from "@/lib/store";
import { textOnCategoryColor } from "@/lib/category-color";
import { SuspendedScreen } from "@/components/suspended-screen";

const STEPS = ["Identity", "Categories", "Schedule", "Review"] as const;

const TIER_LABELS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"];

const RANDOM_NAMES = ["Alex", "Sam", "Jordan", "Riley", "Casey", "Morgan", "Taylor", "Avery"];

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-body-sm font-medium text-ink-black">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black outline-none transition-colors focus:border-accent";

export default function SetupPage() {
  const router = useRouter();
  const store = useStore();
  const [step, setStep] = useState(0);

  const [name, setName] = useState(store.state.profile.name);
  const [avatar, setAvatar] = useState<MarkKey | ProMarkKey>(store.state.profile.avatar);

  const [newCatName, setNewCatName] = useState("");
  const [newCatMode, setNewCatMode] = useState<TrackingMode>("hours");
  const [newCatTarget, setNewCatTarget] = useState("");
  const [newCatTier, setNewCatTier] = useState(1);
  const [newCatWeekend, setNewCatWeekend] = useState(false);

  const [newAnchorLabel, setNewAnchorLabel] = useState("");
  const [newAnchorStart, setNewAnchorStart] = useState("09:00");
  const [newAnchorEnd, setNewAnchorEnd] = useState("10:00");
  const [newAnchorRecurrence, setNewAnchorRecurrence] = useState<AnchorRecurrence>("daily");
  const [newAnchorDaysOfWeek, setNewAnchorDaysOfWeek] = useState<number[]>([]);
  const [newAnchorDate, setNewAnchorDate] = useState("");
  const [newAnchorFocus, setNewAnchorFocus] = useState(true);
  const [newAnchorCategoryIds, setNewAnchorCategoryIds] = useState<string[]>([]);

  const categories = store.state.categories;
  const anchors = store.state.anchors;

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

  function addCategory() {
    if (!newCatName.trim()) return;
    const target = newCatTarget.trim() === "" ? null : Number(newCatTarget);
    store.addCategory({
      name: newCatName.trim(),
      trackingMode: newCatMode,
      weeklyTarget: target,
      priorityTier: newCatTier,
      weekendPreferred: newCatWeekend,
    });
    setNewCatName("");
    setNewCatTarget("");
    setNewCatWeekend(false);
  }

  function addAnchor() {
    if (!newAnchorLabel.trim()) return;
    if (newAnchorRecurrence === "once" && !newAnchorDate) return;
    if (newAnchorRecurrence === "weekly" && newAnchorDaysOfWeek.length === 0) return;
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
    setNewAnchorLabel("");
    setNewAnchorRecurrence("daily");
    setNewAnchorDaysOfWeek([]);
    setNewAnchorDate("");
    setNewAnchorCategoryIds([]);
  }

  function finish() {
    store.setProfile({ name: name.trim() || "there", avatar });
    store.completeOnboarding();
    router.push("/dashboard");
  }

  function skipSetup() {
    // Only invent a placeholder identity for a genuinely brand-new profile
    // (blank name). A returning user hitting Skip -- e.g. via "Redo the
    // full setup wizard" in Settings, or landing back here on another
    // device -- already has a real name/avatar loaded from `/me`, and this
    // must not clobber it with a random one. `avatar` alone can't signal
    // "new" since the backend defaults it to "cat" for everyone.
    if (!store.state.profile.name.trim()) {
      const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      const keys = Object.keys(MARKS) as MarkKey[];
      const randomAvatar = keys[Math.floor(Math.random() * keys.length)];
      store.setProfile({ name: randomName, avatar: randomAvatar });
    }
    store.completeOnboarding();
    router.push("/dashboard");
  }

  const canProceed =
    step === 0 ? name.trim().length > 0 : step === 1 ? categories.length > 0 : true;

  if (store.suspended) {
    return <SuspendedScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper-warmth">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
          Cadence
        </Link>
        <button
          type="button"
          onClick={skipSetup}
          className="text-body-sm font-medium text-ink-black/40 hover:text-ink-black"
        >
          Skip for now
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-16">
        {/* Step indicator */}
        <div className="mb-10 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-caption font-semibold transition-colors ${
                  i === step
                    ? "bg-accent text-white"
                    : i < step
                      ? "bg-marigold text-black"
                      : "bg-ink-black/8 text-ink-black/40"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 ? (
                <div className={`h-0.5 w-6 sm:w-10 ${i < step ? "bg-marigold" : "bg-ink-black/8"}`} />
              ) : null}
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="animate-word-in">
            <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
              Step 1 of 4
            </p>
            <h1 className="mt-2 text-heading-lg font-semibold text-ink-black">
              Hi! What should we call you?
            </h1>
            <p className="mt-3 font-serif text-body text-graphite">
              No account needed yet — this stays on your device for now.
            </p>

            <div className="mt-8">
              <Field label="Your name">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-8">
              <p className="text-body-sm font-medium text-ink-black">Pick a face</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {(Object.keys(MARKS) as MarkKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAvatar(key)}
                    className={`rounded-full p-1 transition-all duration-200 ease-out ${
                      avatar === key
                        ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-paper-warmth"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Mark src={MARKS[key]} size={56} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="animate-word-in">
            <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
              Step 2 of 4
            </p>
            <h1 className="mt-2 text-heading-lg font-semibold text-ink-black">
              What are you building toward?
            </h1>
            <p className="mt-3 font-serif text-body text-graphite">
              Add whatever you&apos;re trying to be consistent about. There&apos;s no built-in
              list — you&apos;re starting from a blank page, on purpose.
            </p>

            {categories.length > 0 ? (
              <div className="mt-6 space-y-2">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-lg p-3 ${c.color} ${textOnCategoryColor(c.color)}`}
                  >
                    <div>
                      <span className="font-semibold">{c.name}</span>
                      <span className="ml-2 text-body-sm opacity-70">
                        {c.weeklyTarget === null
                          ? "No minimum"
                          : c.trackingMode === "hours"
                            ? `${c.weeklyTarget}h / week`
                            : `${c.weeklyTarget} sessions / week`}
                        {" · "}
                        {TIER_LABELS[c.priorityTier - 1] ?? `Tier ${c.priorityTier}`}
                        {c.weekendPreferred ? " · Weekend" : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => store.removeCategory(c.id)}
                      className="rounded-full px-2 py-1 text-body-sm text-ink-black/50 hover:bg-ink-black/10 hover:text-ink-black"
                      aria-label={`Remove ${c.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 rounded-xl border border-dashed border-ink-black/15 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category name">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Study, Fitness, Guitar"
                    className={inputClass}
                  />
                </Field>
                <Field label="Priority">
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
                  <p className="mt-1 text-caption text-ink-black/40">
                    Tier 1 gets scheduled first when your week doesn&apos;t have room for everything.
                  </p>
                </Field>
                <Field label="Tracked as">
                  <select
                    value={newCatMode}
                    onChange={(e) => setNewCatMode(e.target.value as TrackingMode)}
                    className={inputClass}
                  >
                    <option value="hours">Hours per week</option>
                    <option value="sessions">Sessions per week</option>
                  </select>
                </Field>
                <Field label={newCatMode === "hours" ? "Weekly target (hours)" : "Weekly target (sessions)"}>
                  <input
                    type="number"
                    min={0}
                    value={newCatTarget}
                    onChange={(e) => setNewCatTarget(e.target.value)}
                    placeholder="No minimum"
                    className={inputClass}
                  />
                </Field>
              </div>
              <label className="mt-4 flex items-center gap-2 text-body-sm text-ink-black">
                <input
                  type="checkbox"
                  checked={newCatWeekend}
                  onChange={(e) => setNewCatWeekend(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-black/20"
                />
                Weekend-preferred
              </label>
              <p className="mt-1 pl-6 text-caption text-ink-black/40">
                The planner favors scheduling this category on weekends when it&apos;s picking
                what fills your flexible time.
              </p>
              <button
                type="button"
                onClick={addCategory}
                disabled={!newCatName.trim()}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-body-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                + Add category
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="animate-word-in">
            <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
              Step 3 of 4
            </p>
            <h1 className="mt-2 text-heading-lg font-semibold text-ink-black">
              When&apos;s your day actually free?
            </h1>
            <p className="mt-3 font-serif text-body text-graphite">
              Fill in your real schedule blocks — the fixed and recurring chunks of your week
              (class, a shift, the gym) — these are yours to set, not ours to assume. Add as many
              as you need, and remove any that don&apos;t apply to you.
            </p>

            <div className="mt-6">
              <p className="text-body-sm font-medium text-ink-black">Wake window</p>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Field label="From">
                  <input
                    type="time"
                    value={store.state.wakeStart}
                    onChange={(e) => store.setWakeWindow(e.target.value, store.state.wakeEnd)}
                    className={inputClass}
                  />
                </Field>
                <Field label="To">
                  <input
                    type="time"
                    value={store.state.wakeEnd}
                    onChange={(e) => store.setWakeWindow(store.state.wakeStart, e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-body-sm font-medium text-ink-black">Schedule blocks</p>
              <div className="mt-2 space-y-2">
                {anchors.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-ink-black/8 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-ink-black">
                        {a.label}
                        {a.categoryIds.length > 0
                          ? ` (${a.categoryIds
                              .map((id) => categories.find((c) => c.id === id)?.name ?? "?")
                              .join(", ")})`
                          : ""}
                      </p>
                      <p className="text-caption text-ink-black/40">
                        {a.start}–{a.end} · {describeRecurrence(a)} ·{" "}
                        {a.isFocusBlock ? "focus block" : "fixed"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => store.removeAnchor(a.id)}
                      className="shrink-0 rounded-full px-2 py-1 text-body-sm text-ink-black/50 hover:bg-ink-black/10"
                      aria-label={`Remove ${a.label}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-3 rounded-xl border border-dashed border-ink-black/15 p-4">
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
                            ? "bg-accent text-white"
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
                <p className="pl-6 text-caption text-ink-black/40">
                  On: this time is open, and Cadence decides what to work on each day. Off: it&apos;s
                  a fixed commitment (class, work) — just blocked off, nothing gets scheduled into
                  it.
                </p>

                <div>
                  <span className="text-body-sm font-medium text-ink-black">
                    Pin categories (optional)
                  </span>
                  {categories.length === 0 ? (
                    <p className="mt-1.5 text-body-sm text-ink-black/40">Add a category first.</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleNewAnchorCategory(c.id)}
                          className={`rounded-full px-3 py-1.5 text-caption font-medium transition-colors ${
                            newAnchorCategoryIds.includes(c.id)
                              ? "bg-accent text-white"
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
                  type="button"
                  onClick={addAnchor}
                  disabled={!newAnchorLabel.trim()}
                  className="rounded-lg bg-accent px-4 py-2 text-body-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  + Add schedule block
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="animate-word-in text-center">
            <div className="mx-auto flex justify-center">
              <Image
                src="/illustrations/all-set.png"
                alt=""
                width={440}
                height={394}
                className="h-auto w-full max-w-[280px]"
              />
            </div>
            <div className="relative mt-2 inline-block">
              <h1 className="text-heading-lg font-semibold text-ink-black">
                You&apos;re all set, {name.trim() || "friend"}.
              </h1>
              <SparkleIcon className="pointer-events-none absolute -right-7 -top-2 h-5 w-5 text-marigold" />
            </div>
            <p className="mx-auto mt-3 max-w-md font-serif text-body text-graphite">
              {categories.length} categor{categories.length === 1 ? "y" : "ies"} and{" "}
              {anchors.length} schedule block{anchors.length === 1 ? "" : "s"} configured. Your
              dashboard is ready whenever you are — nothing here is locked in, you can change any
              of it later.
            </p>

            <div className="mx-auto mt-8 max-w-sm rounded-xl border border-ink-black/8 bg-pure-white p-5 text-left">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Quick summary
              </p>
              <ul className="mt-3 space-y-1.5 text-body-sm text-ink-black">
                <li>
                  Wake window: {store.state.wakeStart}–{store.state.wakeEnd}
                </li>
                {anchors.map((a) => (
                  <li key={a.id}>
                    {a.label}: {a.start}–{a.end} ({describeRecurrence(a)})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* Nav buttons */}
        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-body-sm font-medium text-ink-black/60 transition-colors hover:bg-ink-black/5 disabled:opacity-0"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canProceed}
              className="rounded-lg bg-accent px-5 py-2.5 text-body-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded-lg bg-accent px-5 py-2.5 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Go to my dashboard →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

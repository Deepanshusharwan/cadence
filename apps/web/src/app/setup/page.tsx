"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mark, MARKS, type MarkKey } from "@/components/marks";
import { SparkleIcon } from "@/components/icons";
import { useStore, type TrackingMode } from "@/lib/store";

const STEPS = ["Identity", "Categories", "Schedule", "Review"] as const;

const TIER_LABELS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-body-sm font-medium text-ink-black">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black outline-none transition-colors focus:border-notion-blue";

export default function SetupPage() {
  const router = useRouter();
  const store = useStore();
  const [step, setStep] = useState(0);

  const [name, setName] = useState(store.state.profile.name);
  const [avatar, setAvatar] = useState<MarkKey>(store.state.profile.avatar);

  const [newCatName, setNewCatName] = useState("");
  const [newCatMode, setNewCatMode] = useState<TrackingMode>("hours");
  const [newCatTarget, setNewCatTarget] = useState("");
  const [newCatTier, setNewCatTier] = useState(1);
  const [newCatWeekend, setNewCatWeekend] = useState(false);

  const [anchors, setAnchorsLocal] = useState(store.state.anchors);

  const categories = store.state.categories;

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

  function finish() {
    store.setProfile({ name: name.trim() || "there", avatar });
    store.setAnchors(anchors);
    store.completeOnboarding();
    router.push("/dashboard");
  }

  const canProceed =
    step === 0 ? name.trim().length > 0 : step === 1 ? categories.length > 0 : true;

  return (
    <div className="flex min-h-screen flex-col bg-paper-warmth">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
          Cadence
        </Link>
        <Link
          href="/dashboard"
          className="text-body-sm font-medium text-ink-black/40 hover:text-ink-black"
        >
          Skip for now
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-16">
        {/* Step indicator */}
        <div className="mb-10 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-caption font-semibold transition-colors ${
                  i === step
                    ? "bg-notion-blue text-pure-white"
                    : i < step
                      ? "bg-marigold text-ink-black"
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
                        ? "scale-110 ring-2 ring-notion-blue ring-offset-2 ring-offset-paper-warmth"
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
                    className={`flex items-center justify-between rounded-lg p-3 ${c.color} text-ink-black`}
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
              <button
                type="button"
                onClick={addCategory}
                disabled={!newCatName.trim()}
                className="mt-4 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90 disabled:opacity-40"
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
              Fill in your real anchors — these are yours to set, not ours to assume.
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <p className="text-body-sm font-medium text-ink-black">Wake window</p>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <Field label="From">
                    <input
                      type="time"
                      value={anchors.wakeStart}
                      onChange={(e) => setAnchorsLocal((a) => ({ ...a, wakeStart: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="To">
                    <input
                      type="time"
                      value={anchors.wakeEnd}
                      onChange={(e) => setAnchorsLocal((a) => ({ ...a, wakeEnd: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <p className="text-body-sm font-medium text-ink-black">
                  Fixed commitment block (job, school, etc.)
                </p>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <Field label="Starts">
                    <input
                      type="time"
                      value={anchors.fixedStart}
                      onChange={(e) => setAnchorsLocal((a) => ({ ...a, fixedStart: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Ends">
                    <input
                      type="time"
                      value={anchors.fixedEnd}
                      onChange={(e) => setAnchorsLocal((a) => ({ ...a, fixedEnd: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-body-sm font-medium text-ink-black">
                  <input
                    type="checkbox"
                    checked={anchors.morningAnchorEnabled}
                    onChange={(e) =>
                      setAnchorsLocal((a) => ({ ...a, morningAnchorEnabled: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-ink-black/20"
                  />
                  I want a morning priority block
                </label>
                {anchors.morningAnchorEnabled ? (
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <Field label="Starts">
                      <input
                        type="time"
                        value={anchors.morningAnchorStart}
                        onChange={(e) =>
                          setAnchorsLocal((a) => ({ ...a, morningAnchorStart: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Ends">
                      <input
                        type="time"
                        value={anchors.morningAnchorEnd}
                        onChange={(e) =>
                          setAnchorsLocal((a) => ({ ...a, morningAnchorEnd: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-body-sm font-medium text-ink-black">Evening focus blocks</p>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <Field label="Block 1 starts">
                    <input
                      type="time"
                      value={anchors.eveningBlock1Start}
                      onChange={(e) =>
                        setAnchorsLocal((a) => ({ ...a, eveningBlock1Start: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Block 1 ends">
                    <input
                      type="time"
                      value={anchors.eveningBlock1End}
                      onChange={(e) =>
                        setAnchorsLocal((a) => ({ ...a, eveningBlock1End: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Block 2 starts">
                    <input
                      type="time"
                      value={anchors.eveningBlock2Start}
                      onChange={(e) =>
                        setAnchorsLocal((a) => ({ ...a, eveningBlock2Start: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Block 2 ends">
                    <input
                      type="time"
                      value={anchors.eveningBlock2End}
                      onChange={(e) =>
                        setAnchorsLocal((a) => ({ ...a, eveningBlock2End: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="animate-word-in text-center">
            <div className="mx-auto flex justify-center">
              <Mark src={MARKS[avatar]} size={80} className="ring-4 ring-marigold" />
            </div>
            <div className="relative mt-4 inline-block">
              <h1 className="text-heading-lg font-semibold text-ink-black">
                You&apos;re all set, {name.trim() || "friend"}.
              </h1>
              <SparkleIcon className="pointer-events-none absolute -right-7 -top-2 h-5 w-5 text-marigold" />
            </div>
            <p className="mx-auto mt-3 max-w-md font-serif text-body text-graphite">
              {categories.length} categor{categories.length === 1 ? "y" : "ies"} configured. Your
              dashboard is ready whenever you are — nothing here is locked in, you can change any
              of it later.
            </p>

            <div className="mx-auto mt-8 max-w-sm rounded-xl border border-ink-black/8 bg-pure-white p-5 text-left">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Quick summary
              </p>
              <ul className="mt-3 space-y-1.5 text-body-sm text-ink-black">
                <li>
                  Fixed commitment: {anchors.fixedStart}–{anchors.fixedEnd}
                </li>
                <li>
                  Wake window: {anchors.wakeStart}–{anchors.wakeEnd}
                </li>
                <li>
                  Evening focus: {anchors.eveningBlock1Start}–{anchors.eveningBlock1End} &amp;{" "}
                  {anchors.eveningBlock2Start}–{anchors.eveningBlock2End}
                </li>
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
              className="rounded-lg bg-notion-blue px-5 py-2.5 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded-lg bg-notion-blue px-5 py-2.5 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
            >
              Go to my dashboard →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

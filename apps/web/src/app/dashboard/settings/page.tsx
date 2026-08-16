"use client";

import { useState } from "react";
import Link from "next/link";
import { Mark, MARKS, type MarkKey } from "@/components/marks";
import { useStore, type TrackingMode } from "@/lib/store";

const TIER_LABELS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"];

const inputClass =
  "w-full rounded-lg border border-ink-black/12 bg-pure-white px-3 py-2 text-body-sm text-ink-black outline-none transition-colors focus:border-notion-blue";

export default function SettingsPage() {
  const store = useStore();
  const { state } = store;

  const [name, setName] = useState(state.profile.name);
  const [newCatName, setNewCatName] = useState("");
  const [newCatMode, setNewCatMode] = useState<TrackingMode>("hours");
  const [newCatTarget, setNewCatTarget] = useState("");
  const [newCatTier, setNewCatTier] = useState(1);

  function addCategory() {
    if (!newCatName.trim()) return;
    store.addCategory({
      name: newCatName.trim(),
      trackingMode: newCatMode,
      weeklyTarget: newCatTarget.trim() === "" ? null : Number(newCatTarget),
      priorityTier: newCatTier,
      weekendPreferred: false,
    });
    setNewCatName("");
    setNewCatTarget("");
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
        <div className="mt-4 flex items-center gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => store.setProfile({ name: name.trim() || state.profile.name })}
            className={inputClass}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
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
      </section>

      {/* Categories */}
      <section className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Categories
        </p>
        <div className="mt-4 space-y-2">
          {state.categories.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between rounded-lg p-3 ${c.color} text-ink-black`}
            >
              <span className="font-semibold">{c.name}</span>
              <button
                onClick={() => store.removeCategory(c.id)}
                className="rounded-full px-2 py-1 text-body-sm text-ink-black/50 hover:bg-ink-black/10"
              >
                ×
              </button>
            </div>
          ))}
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

      {/* Schedule anchors */}
      <section className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          Schedule anchors
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">Fixed commitment starts</span>
            <input
              type="time"
              value={state.anchors.fixedStart}
              onChange={(e) => store.setAnchors({ fixedStart: e.target.value })}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">Fixed commitment ends</span>
            <input
              type="time"
              value={state.anchors.fixedEnd}
              onChange={(e) => store.setAnchors({ fixedEnd: e.target.value })}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">Evening block 1</span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="time"
                value={state.anchors.eveningBlock1Start}
                onChange={(e) => store.setAnchors({ eveningBlock1Start: e.target.value })}
                className={inputClass}
              />
              <span className="text-ink-black/40">–</span>
              <input
                type="time"
                value={state.anchors.eveningBlock1End}
                onChange={(e) => store.setAnchors({ eveningBlock1End: e.target.value })}
                className={inputClass}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-black">Evening block 2</span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="time"
                value={state.anchors.eveningBlock2Start}
                onChange={(e) => store.setAnchors({ eveningBlock2Start: e.target.value })}
                className={inputClass}
              />
              <span className="text-ink-black/40">–</span>
              <input
                type="time"
                value={state.anchors.eveningBlock2End}
                onChange={(e) => store.setAnchors({ eveningBlock2End: e.target.value })}
                className={inputClass}
              />
            </div>
          </label>
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

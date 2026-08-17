"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/lib/store";

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

export default function ProgressPage() {
  const store = useStore();
  const { state } = store;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-heading font-semibold text-ink-black">Progress</h1>
      <p className="mt-2 text-body-sm text-ink-black/50">
        This week, for real. Monthly and long-term trends are on their way.
      </p>

      <div className="mt-6 rounded-xl border border-ink-black/8 bg-pure-white p-6">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
          This week
        </p>
        {state.categories.length === 0 ? (
          <div className="mt-2 flex flex-col items-center py-6 text-center">
            <Image
              src="/illustrations/empty-progress.png"
              alt=""
              width={340}
              height={211}
              className="h-auto w-full max-w-[220px]"
            />
            <p className="mt-4 text-body font-semibold text-ink-black">Nothing to show yet</p>
            <p className="mt-1 max-w-xs text-body-sm text-ink-black/50">
              Complete a session or two to see your progress grow.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-4 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
            >
              Add a category
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {state.categories.map((c) => {
              const minutes = store.weeklyMinutes(c.id);
              const sessions = store.weeklySessionCount(c.id);
              const current = c.trackingMode === "hours" ? minutes / 60 : sessions;
              const hasTarget = c.weeklyTarget !== null;
              const pct = hasTarget ? (current / (c.weeklyTarget as number)) * 100 : 0;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-caption text-ink-black/60">
                    <span className="font-medium text-ink-black">{c.name}</span>
                    <span>
                      {c.trackingMode === "hours"
                        ? `${(minutes / 60).toFixed(1)}h${hasTarget ? ` / ${c.weeklyTarget}h` : ""}`
                        : `${sessions}${hasTarget ? ` / ${c.weeklyTarget} sessions` : " sessions"}`}
                    </span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar value={hasTarget ? pct : 0} className={c.color} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-ink-black/15 p-6">
        <p className="text-body-sm text-ink-black/60">
          Monthly totals, consistency %, and long-term trends land in a future update.
        </p>
      </div>
    </div>
  );
}

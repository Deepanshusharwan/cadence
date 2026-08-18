"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type ApiSharedProgress } from "@/lib/api";
import { Mark, markSrc, type MarkKey, type ProMarkKey } from "@/components/marks";
import { FlameIcon, TrendingUpIcon } from "@/components/icons";

// Public page -- no dashboard chrome, no auth. Anyone with the link lands
// here, logged in or not. See backend/app/routers/sharing.py's own
// docstring for what this deliberately does and doesn't show.
export default function SharedProgressPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<ApiSharedProgress | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .getSharedProgress(params.token)
      .then(setData)
      .catch(() => setNotFound(true));
  }, [params.token]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-paper-warmth px-4 py-16">
      <Link href="/" className="mb-10 flex items-center gap-2 text-heading-sm font-semibold text-ink-black">
        <span className="text-notion-blue">C</span>Cadence
      </Link>

      {notFound ? (
        <div className="max-w-sm text-center">
          <p className="text-body font-medium text-ink-black">This link isn&apos;t active anymore.</p>
          <p className="mt-1 text-body-sm text-ink-black/50">
            It may have been revoked, or the owner is no longer on Plus.
          </p>
        </div>
      ) : !data ? (
        <p className="text-body-sm text-ink-black/40">Loading…</p>
      ) : (
        <div className="w-full max-w-md rounded-xl border border-ink-black/8 bg-pure-white p-6">
          <div className="flex items-center gap-3">
            <Mark src={markSrc(data.userAvatar as MarkKey | ProMarkKey)} size={44} />
            <div>
              <p className="text-body font-semibold text-ink-black">{data.userName || "Cadence user"}</p>
              <p className="text-caption text-ink-black/40">Read-only progress snapshot</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-ink-black/8 p-4">
              <div className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-wide text-ink-black/40">
                <FlameIcon className="h-3.5 w-3.5 text-coral" />
                Current streak
              </div>
              <p className="mt-1 text-heading-sm font-semibold text-ink-black">{data.currentStreak}</p>
            </div>
            <div className="rounded-lg border border-ink-black/8 p-4">
              <div className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-wide text-ink-black/40">
                <TrendingUpIcon className="h-3.5 w-3.5 text-notion-blue" />
                Consistency
              </div>
              <p className="mt-1 text-heading-sm font-semibold text-ink-black">{data.consistencyPct}%</p>
            </div>
          </div>

          {data.categories.length > 0 ? (
            <div className="mt-6 space-y-3 border-t border-ink-black/8 pt-4">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                This week
              </p>
              {data.categories.map((c) => {
                const pct = c.weeklyTarget ? Math.min(100, (c.current / c.weeklyTarget) * 100) : 0;
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-caption text-ink-black/60">
                      <span className="font-medium text-ink-black">{c.name}</span>
                      <span>
                        {c.trackingMode === "hours"
                          ? `${c.current.toFixed(1)}h${c.weeklyTarget ? ` / ${c.weeklyTarget}h` : ""}`
                          : `${c.current}${c.weeklyTarget ? ` / ${c.weeklyTarget} sessions` : ""}`}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-ink-black/8">
                      <div className={`h-2 rounded-full ${c.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <Link href="/" className="mt-8 text-caption font-medium text-notion-blue hover:opacity-80">
        Made with Cadence →
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type ApiAdminUser } from "@/lib/api";
import { Mark, markSrc, type MarkKey, type ProMarkKey } from "@/components/marks";
import { SearchIcon, CloseIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

// Same pattern as /dashboard/feedback: not in NAV, silent redirect on
// rejection rather than an "access denied" page — see that page's own
// comment for why. Real access control is entirely server-side
// (backend/app/deps.py's get_admin_email).

type Plan = ApiAdminUser["plan"];

const PLANS: Plan[] = ["free", "plus", "pro"];

const PLAN_STYLES: Record<Plan, string> = {
  free: "bg-ink-black/5 text-ink-black/60",
  plus: "bg-sky-tint text-accent",
  pro: "bg-marigold/20 text-[#8a5a00]",
};

export default function UsersAdminPage() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<ApiAdminUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingBanId, setConfirmingBanId] = useState<string | null>(null);

  function reload() {
    api
      .listAdminUsers()
      .then(setUsers)
      .catch(() => router.replace("/dashboard"));
  }

  useEffect(reload, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function changePlan(id: string, plan: Plan) {
    setBusyId(id);
    try {
      await api.setUserPlan(id, plan);
      reload();
    } catch {
      toast.show("Couldn't change that plan — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBanned(id: string, banned: boolean) {
    setBusyId(id);
    setConfirmingBanId(null);
    try {
      await api.setUserBanned(id, banned);
      toast.show(banned ? "User banned" : "User unbanned");
      reload();
    } catch {
      toast.show(
        banned
          ? "Couldn't ban that user — you can't ban your own account."
          : "Couldn't unban that user — try again."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-lg font-semibold text-ink-black">Users</h1>
        <Link href="/dashboard/feedback" className="text-body-sm text-accent hover:opacity-80">
          View feedback →
        </Link>
      </div>
      <p className="mt-1 text-body-sm text-graphite">
        Manually grant plans until real billing exists.
      </p>

      <div className="relative mt-6">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-black/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or user id…"
          className="w-full rounded-lg border border-ink-black/12 py-2 pl-9 pr-3 text-body-sm text-ink-black placeholder:text-ink-black/30 focus:border-accent focus:outline-none"
        />
      </div>

      {users === null ? (
        <p className="mt-8 text-body-sm text-ink-black/40">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-body-sm text-ink-black/40">
          {users.length === 0 ? "No users yet." : "No users match that search."}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-ink-black/8 rounded-xl border border-ink-black/8 bg-pure-white">
          {filtered.map((u) => (
            <div key={u.id} className="px-5 py-4">
              <div className="flex items-center gap-3">
                <Mark src={markSrc(u.avatar as MarkKey | ProMarkKey)} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-body-sm font-medium text-ink-black">
                    {u.name.trim() || "Unnamed user"}
                    {u.banned ? (
                      <span className="shrink-0 rounded-full bg-coral/15 px-2 py-0.5 text-caption font-medium uppercase tracking-wide text-coral">
                        Banned
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-caption text-ink-black/40">{u.id}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-ink-black/10 bg-paper-warmth p-1">
                  {PLANS.map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => changePlan(u.id, plan)}
                      className={`rounded-md px-2.5 py-1 text-caption font-medium uppercase tracking-wide transition-colors disabled:opacity-40 ${
                        u.plan === plan ? PLAN_STYLES[plan] : "text-ink-black/40 hover:text-ink-black"
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                {confirmingBanId === u.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-ink-black/60">
                      Ban this user? They&apos;ll lose access immediately.
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBanned(u.id, true)}
                      className="rounded-full bg-coral/15 px-2.5 py-1 text-caption font-semibold text-coral hover:bg-coral/25"
                    >
                      Yes, ban
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingBanId(null)}
                      className="rounded-full p-1 text-ink-black/40 hover:bg-ink-black/10"
                      aria-label="Cancel"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : u.banned ? (
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => toggleBanned(u.id, false)}
                    className="text-caption font-medium text-accent hover:opacity-80 disabled:opacity-40"
                  >
                    Unban
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => setConfirmingBanId(u.id)}
                    className="text-caption font-medium text-ink-black/40 hover:text-coral disabled:opacity-40"
                  >
                    Ban
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

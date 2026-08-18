"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type ApiAdminUser } from "@/lib/api";
import { Mark, markSrc, type MarkKey, type ProMarkKey } from "@/components/marks";
import { SearchIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

// Same pattern as /dashboard/feedback: not in NAV, silent redirect on
// rejection rather than an "access denied" page — see that page's own
// comment for why. Real access control is entirely server-side
// (backend/app/deps.py's get_admin_email).

type Plan = ApiAdminUser["plan"];

const PLANS: Plan[] = ["free", "plus", "pro"];

const PLAN_STYLES: Record<Plan, string> = {
  free: "bg-ink-black/5 text-ink-black/60",
  plus: "bg-sky-tint text-notion-blue",
  pro: "bg-marigold/20 text-[#8a5a00]",
};

export default function UsersAdminPage() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<ApiAdminUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-lg font-semibold text-ink-black">Users</h1>
        <Link href="/dashboard/feedback" className="text-body-sm text-notion-blue hover:opacity-80">
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
          className="w-full rounded-lg border border-ink-black/12 py-2 pl-9 pr-3 text-body-sm text-ink-black placeholder:text-ink-black/30 focus:border-notion-blue focus:outline-none"
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
            <div key={u.id} className="flex items-center gap-3 px-5 py-4">
              <Mark src={markSrc(u.avatar as MarkKey | ProMarkKey)} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium text-ink-black">
                  {u.name.trim() || "Unnamed user"}
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
          ))}
        </div>
      )}
    </div>
  );
}

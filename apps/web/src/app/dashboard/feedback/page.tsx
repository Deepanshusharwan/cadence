"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type ApiAdminEmail, type ApiFeedback } from "@/lib/api";
import { Mark, markSrc, type MarkKey, type ProMarkKey } from "@/components/marks";
import { SearchIcon, CloseIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

// Deliberately not in dashboard/layout.tsx's NAV, and deliberately silent
// on rejection (see the 403 branch below) — a non-admin who finds this URL
// gets bounced straight back to /dashboard with no error message, rather
// than a page that visibly confirms "yes, there's a gated admin view here."
// The real access control is entirely server-side (see the email-allowlist
// check in backend/app/deps.py's get_admin_email) — this is just not
// advertising the page's existence on top of that, not a second layer of
// security.

const TYPE_STYLES: Record<ApiFeedback["type"], string> = {
  bug: "bg-coral/15 text-coral",
  idea: "bg-sky-tint text-notion-blue",
  review: "bg-marigold/20 text-[#8a5a00]",
  other: "bg-ink-black/5 text-ink-black/60",
};

const TYPE_LABELS: Record<ApiFeedback["type"], string> = {
  bug: "Bug",
  idea: "Idea",
  review: "Review",
  other: "Other",
};

const TYPE_FILTERS: (ApiFeedback["type"] | "all")[] = ["all", "bug", "idea", "review", "other"];

function AdminEmailManager() {
  const toast = useToast();
  const [emails, setEmails] = useState<ApiAdminEmail[] | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    api.listAdminEmails().then(setEmails).catch(() => setEmails([]));
  }

  useEffect(reload, []);

  async function add() {
    const email = newEmail.trim();
    if (!email || busy) return;
    setBusy(true);
    try {
      await api.addAdminEmail(email);
      setNewEmail("");
      reload();
    } catch {
      toast.show("Couldn't add that email — check it's valid and not already listed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.removeAdminEmail(id);
      reload();
    } catch {
      toast.show("Couldn't remove that email.");
    }
  }

  return (
    <div className="rounded-xl border border-ink-black/8 bg-pure-white p-5">
      <h2 className="text-body font-semibold text-ink-black">Who can see this page</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {emails === null ? (
          <span className="text-body-sm text-ink-black/40">Loading…</span>
        ) : (
          emails.map((e) => (
            <span
              key={e.id ?? e.email}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-black/5 py-1 pl-3 pr-1.5 text-body-sm text-ink-black"
            >
              {e.email}
              {e.source === "seed" ? (
                <span className="text-caption text-ink-black/40">(owner)</span>
              ) : (
                <button
                  type="button"
                  onClick={() => remove(e.id as string)}
                  aria-label={`Remove ${e.email}`}
                  className="rounded-full p-0.5 text-ink-black/40 hover:bg-ink-black/10 hover:text-ink-black"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add another email…"
          className="flex-1 rounded-lg border border-ink-black/12 px-3 py-1.5 text-body-sm text-ink-black placeholder:text-ink-black/30 focus:border-notion-blue focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!newEmail.trim() || busy}
          className="shrink-0 rounded-lg bg-notion-blue px-3 py-1.5 text-body-sm font-medium text-pure-white hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function FeedbackAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<ApiFeedback[] | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ApiFeedback["type"] | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .listFeedback()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) router.replace("/dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    const fromTime = from ? new Date(from).getTime() : null;
    // End-of-day, so the "to" date itself is included.
    const toTime = to ? new Date(to).getTime() + 24 * 60 * 60 * 1000 : null;
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      const created = new Date(item.createdAt).getTime();
      if (fromTime !== null && created < fromTime) return false;
      if (toTime !== null && created >= toTime) return false;
      if (q && !item.message.toLowerCase().includes(q) && !item.userName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, search, typeFilter, from, to]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-lg font-semibold text-ink-black">Feedback</h1>
        <Link href="/dashboard/users" className="text-body-sm text-notion-blue hover:opacity-80">
          Manage users →
        </Link>
      </div>
      <p className="mt-1 text-body-sm text-graphite">Bug reports, ideas, and reviews submitted from the app.</p>

      <div className="mt-6">
        <AdminEmailManager />
      </div>

      <div className="mt-6 space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-black/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user or message…"
            className="w-full rounded-lg border border-ink-black/12 py-2 pl-9 pr-3 text-body-sm text-ink-black placeholder:text-ink-black/30 focus:border-notion-blue focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-caption font-medium uppercase tracking-wide transition-colors ${
                  typeFilter === t
                    ? "bg-notion-blue text-pure-white"
                    : "bg-ink-black/5 text-ink-black/60 hover:bg-ink-black/10"
                }`}
              >
                {t === "all" ? "All" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 text-body-sm text-ink-black/60">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-ink-black/12 px-2 py-1 text-caption text-ink-black focus:border-notion-blue focus:outline-none"
            />
            <span>–</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-ink-black/12 px-2 py-1 text-caption text-ink-black focus:border-notion-blue focus:outline-none"
            />
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="text-caption text-ink-black/40 hover:text-ink-black"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {items === null ? (
        <p className="mt-8 text-body-sm text-ink-black/40">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-body-sm text-ink-black/40">
          {items.length === 0 ? "No feedback yet." : "No feedback matches these filters."}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-ink-black/8 rounded-xl border border-ink-black/8 bg-pure-white">
          {filtered.map((item) => (
            <div key={item.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mark src={markSrc(item.userAvatar as MarkKey | ProMarkKey)} size={24} />
                  <span className="text-body-sm font-medium text-ink-black">
                    {item.userName.trim() || "Unnamed user"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium uppercase tracking-wide ${TYPE_STYLES[item.type]}`}
                  >
                    {TYPE_LABELS[item.type]}
                  </span>
                </div>
                <span className="shrink-0 text-caption text-ink-black/40">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-body-sm text-ink-black">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

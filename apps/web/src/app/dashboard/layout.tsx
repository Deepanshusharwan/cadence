"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { Mark, markSrc } from "@/components/marks";
import { CadenceMark } from "@/components/logo";
import { FeedbackModal } from "@/components/feedback-modal";
import { useStore, anchorAppliesOn, todayISO } from "@/lib/store";
import {
  ChevronLeftIcon,
  HomeIcon,
  CalendarIcon,
  BarChartIcon,
  LightbulbIcon,
  SettingsIcon,
  LogOutIcon,
  MegaphoneIcon,
  type IconComponent,
} from "@/components/icons";

const NAV: { href: string; label: string; Icon: IconComponent }[] = [
  { href: "/dashboard", label: "Today", Icon: HomeIcon },
  { href: "/dashboard/calendar", label: "Calendar", Icon: CalendarIcon },
  { href: "/dashboard/progress", label: "Progress", Icon: BarChartIcon },
  { href: "/dashboard/review", label: "Review", Icon: LightbulbIcon },
  { href: "/dashboard/settings", label: "Settings", Icon: SettingsIcon },
];

const SIDEBAR_COLLAPSED_KEY = "cadence-sidebar-collapsed";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [collapsedReady, setCollapsedReady] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    setCollapsedReady(true);
  }, []);

  useEffect(() => {
    if (!collapsedReady) return;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed, collapsedReady]);

  useEffect(() => {
    if (store.ready && !store.state.onboarded) {
      router.replace("/setup");
    }
  }, [store.ready, store.state.onboarded, router]);

  // Anchor reminders (spec §55): a start-soon nudge for every anchor, plus an
  // end-soon nudge for fixed (non-focus) blocks. `notifiedRef` is per-session
  // only — it resets on reload, which is an acceptable prototype tradeoff
  // rather than persisting a full notification log.
  const notifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!store.state.settings.notificationsEnabled) return;
    if (typeof Notification === "undefined") return;

    function checkAnchors() {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const today = todayISO(now);
      const dayOfWeek = now.getDay();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      for (const anchor of store.state.anchors) {
        if (!anchorAppliesOn(anchor, today, dayOfWeek)) continue;
        const [startH, startM] = anchor.start.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const startKey = `${today}-${anchor.id}-start`;
        const untilStart = startMinutes - nowMinutes;
        if (!notifiedRef.current.has(startKey) && untilStart >= 0 && untilStart <= 5) {
          notifiedRef.current.add(startKey);
          new Notification(`${anchor.label} starts soon`, { body: `${anchor.start}–${anchor.end}` });
        }

        if (!anchor.isFocusBlock) {
          const [endH, endM] = anchor.end.split(":").map(Number);
          const endMinutes = endH * 60 + endM;
          const endKey = `${today}-${anchor.id}-end`;
          const untilEnd = endMinutes - nowMinutes;
          if (!notifiedRef.current.has(endKey) && untilEnd >= 0 && untilEnd <= 15) {
            notifiedRef.current.add(endKey);
            new Notification(`${anchor.label} ends soon`, { body: `Ends at ${anchor.end}` });
          }
        }
      }
    }

    checkAnchors();
    const id = setInterval(checkAnchors, 60000);
    return () => clearInterval(id);
  }, [store.state.settings.notificationsEnabled, store.state.anchors]);

  if (!store.ready || !store.state.onboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-warmth">
        <p className="text-body-sm text-ink-black/40">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper-warmth">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-ink-black/8 py-6 transition-[width] duration-200 sm:flex ${
          collapsed ? "w-[72px] px-2" : "w-56 px-4"
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-9 flex h-6 w-6 items-center justify-center rounded-full border border-ink-black/10 bg-pure-white text-ink-black/50 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] transition-transform hover:text-ink-black"
        >
          <ChevronLeftIcon className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>

        {collapsed ? (
          <Link
            href="/"
            aria-label="Cadence"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-ink-black/8 bg-pure-white text-notion-blue"
          >
            <CadenceMark className="h-5 w-5" />
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2 px-2">
            <CadenceMark className="h-5 w-5 shrink-0 text-notion-blue" />
            <span className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
              Cadence
            </span>
          </Link>
        )}

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded-lg py-2 text-body-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${
                  active
                    ? "bg-sky-tint text-notion-blue"
                    : "text-ink-black/60 hover:bg-ink-black/5 hover:text-ink-black"
                }`}
              >
                <item.Icon className="h-4.5 w-4.5 shrink-0" />
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          title={collapsed ? "Send feedback" : undefined}
          className={`mt-auto flex items-center gap-2.5 rounded-lg py-2 text-body-sm font-medium text-ink-black/54 transition-colors hover:bg-ink-black/5 hover:text-ink-black ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
        >
          <MegaphoneIcon className="h-4.5 w-4.5 shrink-0" />
          {collapsed ? <span className="sr-only">Send feedback</span> : "Send feedback"}
        </button>

        <div
          className={`flex items-center gap-2 rounded-lg py-2 ${collapsed ? "justify-center px-0" : "px-2"}`}
          title={collapsed ? store.state.profile.name : undefined}
        >
          <Mark src={markSrc(store.state.profile.avatar)} size={32} />
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink-black">
                {store.state.profile.name}
              </span>
              <SignOutButton>
                <button
                  type="button"
                  aria-label="Sign out"
                  title="Sign out"
                  className="shrink-0 rounded-lg p-1.5 text-ink-black/40 hover:bg-ink-black/5 hover:text-ink-black"
                >
                  <LogOutIcon className="h-4 w-4" />
                </button>
              </SignOutButton>
            </>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-ink-black/8 bg-paper-warmth/95 px-4 py-3 backdrop-blur sm:hidden">
        <Link href="/" className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
          Cadence
        </Link>
        <div className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-2.5 py-1.5 text-caption font-medium ${
                pathname === item.href
                  ? "bg-sky-tint text-notion-blue"
                  : "text-ink-black/50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 px-6 py-8 pt-20 sm:pt-8">{children}</main>

      {feedbackOpen ? <FeedbackModal onClose={() => setFeedbackOpen(false)} /> : null}
    </div>
  );
}

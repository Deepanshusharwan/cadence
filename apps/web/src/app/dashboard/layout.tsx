"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Mark, MARKS } from "@/components/marks";
import { useStore } from "@/lib/store";
import {
  ChevronLeftIcon,
  HomeIcon,
  CalendarIcon,
  BarChartIcon,
  LightbulbIcon,
  SettingsIcon,
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
        <div className="relative flex items-center">
          <Link
            href="/"
            className={`text-heading-sm font-bold tracking-[-0.242px] text-ink-black ${
              collapsed ? "mx-auto" : "px-2"
            }`}
          >
            {collapsed ? "C" : "Cadence"}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-ink-black/10 bg-pure-white text-ink-black/50 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] transition-transform hover:text-ink-black"
          >
            <ChevronLeftIcon className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

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

        <div
          className={`mt-auto flex items-center gap-2 rounded-lg py-2 ${collapsed ? "justify-center px-0" : "px-2"}`}
          title={collapsed ? store.state.profile.name : undefined}
        >
          <Mark src={MARKS[store.state.profile.avatar]} size={32} />
          {collapsed ? null : (
            <span className="truncate text-body-sm font-medium text-ink-black">
              {store.state.profile.name}
            </span>
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
    </div>
  );
}

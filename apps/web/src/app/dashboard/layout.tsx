"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Mark, MARKS } from "@/components/marks";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/week", label: "Week" },
  { href: "/dashboard/progress", label: "Progress" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();

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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-ink-black/8 px-4 py-6 sm:flex">
        <Link href="/" className="px-2 text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
          Cadence
        </Link>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-body-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-tint text-notion-blue"
                    : "text-ink-black/60 hover:bg-ink-black/5 hover:text-ink-black"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2 rounded-lg px-2 py-2">
          <Mark src={MARKS[store.state.profile.avatar]} size={32} />
          <span className="truncate text-body-sm font-medium text-ink-black">
            {store.state.profile.name}
          </span>
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

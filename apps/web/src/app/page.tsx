import type { ReactNode } from "react";
import { RotatingWord } from "@/components/rotating-word";

const NAV_LINKS = [
  { href: "#philosophy", label: "Philosophy" },
  { href: "#categories", label: "Categories" },
  { href: "#leave", label: "Leave" },
  { href: "#screens", label: "Screens" },
];

const CATEGORY_MARKS = [
  { initials: "Un", label: "University", border: "border-signal-blue" },
  { initials: "SD", label: "System Design", border: "border-coral" },
  { initials: "DS", label: "DSA", border: "border-marigold" },
  { initials: "Dv", label: "Development", border: "border-sky-wash" },
  { initials: "RL", label: "Random Learning", border: "border-mocha" },
  { initials: "Pr", label: "Projects", border: "border-midnight-ink" },
];

const PHILOSOPHY_CARDS = [
  {
    title: "Fixed anchors, flexible content",
    body: "Work 10–6, DSA 8–9 AM, and the evening study blocks are fixed. Which subject fills each block isn't.",
  },
  {
    title: "Weekly targets over daily perfection",
    body: "A strong day can exceed the target. A weaker day gets absorbed by the week, not repaid tomorrow.",
  },
  {
    title: "Consistency over intensity",
    body: "The goal isn't another 12-hour study day. It's a system that survives a bad week and keeps moving.",
  },
];

const CATEGORIES = [
  { name: "University", tier: "Tier 1", target: "8h / week", bg: "bg-marigold", text: "text-ink-black" },
  { name: "System Design", tier: "Tier 1", target: "8h / week", bg: "bg-coral", text: "text-pure-white" },
  { name: "DSA", tier: "Tier 2", target: "4 sessions / week", bg: "bg-signal-blue", text: "text-pure-white" },
  { name: "Development", tier: "Tier 3", target: "No minimum", bg: "bg-sky-wash", text: "text-ink-black" },
  { name: "Random Learning", tier: "Tier 4", target: "No minimum", bg: "bg-mocha", text: "text-pure-white" },
  { name: "Projects", tier: "Weekends", target: "~5–8h", bg: "bg-midnight-ink", text: "text-pure-white" },
];

const DAY_TYPES = [
  { name: "Normal", study: "~4h", cost: "0 units" },
  { name: "Reduced", study: "~1–2h", cost: "1 unit" },
  { name: "Full Leave", study: "0h", cost: "2 units" },
  { name: "Missed", study: "—", cost: "0 units" },
];

const CLIENTS = [
  {
    name: "Web",
    border: "border-notion-blue",
    body: "The full dashboard. Sign in with Clerk, always reading current server state.",
  },
  {
    name: "iOS",
    border: "border-signal-blue",
    body: "Native Swift. Offline session logging, syncs to the cloud when back online.",
  },
  {
    name: "Android",
    border: "border-coral",
    body: "Native Kotlin. Offline session logging, syncs to the cloud when back online.",
  },
];

const SCREENS = [
  { name: "Today", body: "Day type, leave balance, what's next — one tap to start." },
  { name: "Week", body: "Monday–Sunday, planned vs. actual, targets at a glance." },
  { name: "Timer", body: "Start, pause, stop. Manual logging for when you forget." },
  { name: "Progress", body: "This week, this month, long term — no single meaningless score." },
];

function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-caption font-medium uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-ink-black/8">
      <div
        className={`h-2 rounded-full ${className}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-heading-lg font-semibold text-ink-black">{title}</h2>
      {body ? (
        <p className="mt-4 font-serif text-body text-graphite">{body}</p>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper-warmth">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-ink-black/8 bg-paper-warmth/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
          <a href="#" className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
            Cadence
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-3 text-body-sm font-medium text-ink-black/54 transition-colors duration-200 ease-out hover:text-ink-black"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#"
              className="rounded-lg px-4 py-2 text-body-sm font-medium text-ink-black/95 transition-colors duration-200 ease-out hover:bg-ink-black/5"
            >
              Sign in
            </a>
            <a
              href="#"
              className="rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity duration-200 ease-out hover:opacity-90"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-[1440px] px-6 pt-20 pb-16 text-center">
          <Pill className="bg-sky-tint text-notion-blue">Planner + Consistency Tracker</Pill>

          <h1 className="mx-auto mt-6 max-w-3xl text-display-sm font-semibold text-ink-black md:text-display">
            A demanding year, made <RotatingWord />.
          </h1>

          <p className="mx-auto mt-6 max-w-xl font-serif text-subheading leading-[1.56] text-graphite">
            Cadence is a planner and tracker for people running a job, a degree, and a
            one-year goal at the same time — built around weekly commitments instead of
            daily guilt.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href="#"
              className="rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity duration-200 ease-out hover:opacity-90"
            >
              Get started
            </a>
            <a
              href="#philosophy"
              className="rounded-lg bg-sky-tint px-4 py-2 text-body-sm font-medium text-notion-blue transition-opacity duration-200 ease-out hover:opacity-90"
            >
              See how it works
            </a>
          </div>

          {/* Category avatar row */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
            {CATEGORY_MARKS.map((mark) => (
              <div key={mark.label} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 bg-pure-white text-body-sm font-semibold text-ink-black ${mark.border}`}
                >
                  {mark.initials}
                </div>
                <span className="text-caption text-ink-black/40">{mark.label}</span>
              </div>
            ))}
          </div>

          {/* Product mockup: Today screen */}
          <div className="mx-auto mt-16 max-w-2xl rounded-xl border border-ink-black/8 bg-pure-white p-6 text-left shadow-[0px_4px_12px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <span className="text-heading-sm font-semibold text-ink-black">Today</span>
              <div className="flex items-center gap-2">
                <Pill className="bg-sky-tint text-notion-blue">Normal</Pill>
                <Pill className="bg-ink-black/5 text-ink-black/60">7 leave units</Pill>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3">
                <span className="text-body-sm text-slate">08:00–09:00</span>
                <span className="text-body-sm font-medium text-ink-black">DSA</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3">
                <span className="text-body-sm text-slate">10:00–18:00</span>
                <span className="text-body-sm font-medium text-ink-black/40">Work</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3">
                <span className="text-body-sm text-slate">19:00–21:00</span>
                <span className="text-body-sm font-medium text-ink-black">System Design</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3">
                <span className="text-body-sm text-slate">21:30–23:30</span>
                <span className="text-body-sm font-medium text-ink-black">University</span>
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-ink-black/8 pt-5">
              <div>
                <div className="flex justify-between text-caption text-ink-black/60">
                  <span>University</span>
                  <span>4.5 / 8h</span>
                </div>
                <div className="mt-1">
                  <ProgressBar value={56} className="bg-marigold" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-caption text-ink-black/60">
                  <span>System Design</span>
                  <span>3.0 / 8h</span>
                </div>
                <div className="mt-1">
                  <ProgressBar value={37} className="bg-coral" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-caption text-ink-black/60">
                  <span>DSA</span>
                  <span>3 / 4 sessions</span>
                </div>
                <div className="mt-1">
                  <ProgressBar value={75} className="bg-signal-blue" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Philosophy */}
        <section id="philosophy" className="mx-auto max-w-[1440px] px-6 py-20">
          <SectionHeader
            eyebrow="Philosophy"
            title="Structure without rigidity"
            body="“You completed a two-hour core study block. Your University target is healthy and System Design needs more attention this week.” Not: “You failed your 7 PM task.”"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PHILOSOPHY_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-ink-black/8 bg-pure-white p-6"
              >
                <h3 className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
                  {card.title}
                </h3>
                <p className="mt-3 text-body text-slate">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="mx-auto max-w-[1440px] px-6 py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Categories
              </p>
              <h2 className="mt-3 text-heading-lg font-semibold text-ink-black">
                Six categories. Two you can&apos;t skip.
              </h2>
              <p className="mt-4 text-body text-graphite">
                University and System Design carry equal weight — the planner won&apos;t
                quietly favor one. DSA has a weekly target, not a daily requirement.
                Development and Random Learning stay flexible on purpose, and Projects
                get the weekend.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((category) => (
                <div
                  key={category.name}
                  className={`rounded-xl p-6 ${category.bg} ${category.text}`}
                >
                  <p className="text-caption font-medium uppercase tracking-wide opacity-60">
                    {category.tier}
                  </p>
                  <h3 className="mt-2 text-heading-sm font-bold tracking-[-0.242px]">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-body-sm opacity-80">{category.target}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Leave */}
        <section id="leave" className="mx-auto max-w-[1440px] px-6 py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Leave
              </p>
              <h2 className="mt-3 text-heading-lg font-semibold text-ink-black">
                Leave that doesn&apos;t need an excuse
              </h2>
              <p className="mt-4 text-body text-graphite">
                7 leave units a month, carried forward for one additional month, capped
                at 14. Reduced and full-leave days cost units on purpose — but a missed
                day is never quietly converted into leave, and leave never counts against
                your consistency score.
              </p>
              <div className="mt-6 divide-y divide-ink-black/8 rounded-xl border border-ink-black/8 bg-pure-white">
                {DAY_TYPES.map((day) => (
                  <div key={day.name} className="flex items-center justify-between px-5 py-3">
                    <span className="text-body-sm font-medium text-ink-black">{day.name}</span>
                    <span className="text-body-sm text-slate">{day.study}</span>
                    <Pill className="bg-ink-black/5 text-ink-black/60">{day.cost}</Pill>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 rounded-xl bg-midnight-ink p-6 text-pure-white md:order-2">
              <p className="text-caption font-medium uppercase tracking-wide text-pure-white/50">
                Leave balance
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-pure-white/50">Current month</p>
                  <p className="mt-1 text-heading-sm font-bold">7 units</p>
                </div>
                <div>
                  <p className="text-caption text-pure-white/50">Carried</p>
                  <p className="mt-1 text-heading-sm font-bold">3 units</p>
                </div>
                <div>
                  <p className="text-caption text-pure-white/50">Total available</p>
                  <p className="mt-1 text-heading-sm font-bold">10 units</p>
                </div>
                <div>
                  <p className="text-caption text-pure-white/50">Used</p>
                  <p className="mt-1 text-heading-sm font-bold">2 units</p>
                </div>
              </div>
              <p className="mt-6 rounded-lg bg-pure-white/10 px-4 py-3 text-body-sm text-pure-white/80">
                3 carried units expire at month end
              </p>
            </div>
          </div>
        </section>

        {/* Sync */}
        <section id="sync" className="mx-auto max-w-[1440px] px-6 py-20">
          <SectionHeader
            eyebrow="One system, three places"
            title="Cloud is the source of truth"
            body="Nothing client-side is authoritative. The mobile apps cache locally so logging a session still works offline, then sync when connectivity returns."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {CLIENTS.map((client) => (
              <div
                key={client.name}
                className="rounded-xl border border-ink-black/8 bg-pure-white p-6"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-pure-white text-body-sm font-semibold text-ink-black ${client.border}`}
                >
                  {client.name.slice(0, 2)}
                </div>
                <h3 className="mt-4 text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
                  {client.name}
                </h3>
                <p className="mt-2 text-body text-slate">{client.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Screens */}
        <section id="screens" className="mx-auto max-w-[1440px] px-6 py-20">
          <SectionHeader eyebrow="Screens" title="Everything in seconds" />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SCREENS.map((screen) => (
              <div
                key={screen.name}
                className="rounded-xl border border-ink-black/8 bg-pure-white p-6"
              >
                <h3 className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
                  {screen.name}
                </h3>
                <p className="mt-3 text-body-sm text-slate">{screen.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pull quote */}
        <section className="bg-midnight-ink py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="font-serif text-[32px] leading-[1.25] text-pure-white">
              &ldquo;The timetable exists to serve the user&apos;s goals and life. The
              user does not exist to serve the timetable.&rdquo;
            </p>
            <p className="mt-6 text-caption font-medium uppercase tracking-wide text-pure-white/50">
              Design principle, Cadence
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-marigold py-20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-heading-lg font-semibold text-ink-black">
              Plan the year. Protect the person.
            </h2>
            <div className="mt-8">
              <a
                href="#"
                className="inline-flex rounded-lg bg-pure-white px-5 py-2.5 text-body-sm font-medium text-notion-blue transition-opacity duration-200 ease-out hover:opacity-90"
              >
                Get started
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-black/8">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row">
          <div>
            <p className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
              Cadence
            </p>
            <p className="mt-1 text-body-sm text-ink-black/40">
              Fixed anchors. Flexible content.
            </p>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-2 text-body-sm font-medium text-ink-black/54 transition-colors duration-200 ease-out hover:text-ink-black"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <p className="text-caption text-ink-black/40">© 2026 Cadence</p>
        </div>
      </footer>
    </div>
  );
}

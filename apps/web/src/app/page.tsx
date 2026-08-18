import type { ReactNode } from "react";
import Link from "next/link";
import { RotatingWord } from "@/components/rotating-word";
import { Mark, MARKS } from "@/components/marks";
import { CadenceMark } from "@/components/logo";
import {
  BookIcon,
  TrendingUpIcon,
  DumbbellIcon,
  LightbulbIcon,
  GlassesIcon,
  FolderIcon,
  BrowserIcon,
  SmartphoneIcon,
  PlayIcon,
  CalendarMinusIcon,
  SwapIcon,
  BarChartIcon,
  PencilIcon,
  SparkleIcon,
  SquiggleArrowIcon,
} from "@/components/icons";

const NAV_LINKS = [
  { href: "#philosophy", label: "Philosophy" },
  { href: "#categories", label: "Categories" },
  { href: "#leave", label: "Leave" },
  { href: "#screens", label: "Screens" },
];

const CATEGORY_MARKS = [
  { Icon: BookIcon, label: "Study", border: "border-signal-blue" },
  { Icon: TrendingUpIcon, label: "Career Growth", border: "border-terracotta" },
  { Icon: DumbbellIcon, label: "Fitness", border: "border-marigold" },
  { Icon: LightbulbIcon, label: "New Skill", border: "border-sky-wash" },
  { Icon: GlassesIcon, label: "Reading", border: "border-orchid" },
  { Icon: FolderIcon, label: "Side Project", border: "border-midnight-ink" },
];

const PHILOSOPHY_CARDS = [
  {
    title: "Fixed anchors, flexible content",
    body: "Your fixed commitments and focus blocks stay put. Which category fills a given block doesn't.",
  },
  {
    title: "Weekly targets over daily perfection",
    body: "A strong day can exceed the target. A weaker day gets absorbed by the week, not repaid tomorrow.",
  },
  {
    title: "Consistency over intensity",
    body: "The goal isn't another 12-hour day. It's a system that survives a bad week and keeps moving.",
  },
];

const CATEGORIES = [
  { name: "Study", tier: "Tier 1", target: "8h / week", bg: "bg-marigold", text: "text-ink-black" },
  { name: "Career Growth", tier: "Tier 1", target: "6h / week", bg: "bg-terracotta", text: "text-ink-black" },
  { name: "Fitness", tier: "Tier 2", target: "4 sessions / week", bg: "bg-signal-blue", text: "text-pure-white" },
  { name: "New Skill", tier: "Tier 3", target: "No minimum", bg: "bg-sky-wash", text: "text-ink-black" },
  { name: "Reading", tier: "Tier 4", target: "No minimum", bg: "bg-orchid", text: "text-ink-black" },
  { name: "Side Project", tier: "Weekends", target: "~5h", bg: "bg-midnight-ink", text: "text-pure-white" },
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
    Icon: BrowserIcon,
    border: "border-notion-blue",
    body: "The full dashboard. Sign in with Clerk, always reading current server state.",
  },
  {
    name: "iOS",
    Icon: SmartphoneIcon,
    border: "border-signal-blue",
    body: "Native Swift. Offline session logging, syncs to the cloud when back online.",
  },
  {
    name: "Android",
    Icon: SmartphoneIcon,
    border: "border-terracotta",
    body: "Native Kotlin. Offline session logging, syncs to the cloud when back online.",
  },
];

const QUICK_ACTIONS = [
  { Icon: PlayIcon, label: "Start a session" },
  { Icon: CalendarMinusIcon, label: "Mark a reduced day" },
  { Icon: SwapIcon, label: "Swap a block" },
  { Icon: BarChartIcon, label: "View this week's progress" },
  { Icon: PencilIcon, label: "Log a session manually" },
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
        <div className="mx-auto flex h-16 max-w-[1760px] items-center justify-between px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2 text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
            <CadenceMark className="h-5 w-5 shrink-0 text-notion-blue" />
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
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-body-sm font-medium text-ink-black/95 transition-colors duration-200 ease-out hover:bg-ink-black/5"
            >
              Sign in
            </Link>
            <a
              href="/setup"
              className="rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity duration-200 ease-out hover:opacity-90"
            >
              Get Cadence Free
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto max-w-[1760px] px-4 sm:px-6 pt-20 pb-16 text-center">
          <div className="mb-8 flex items-center justify-center -space-x-4">
            {Object.values(MARKS).map((src) => (
              <Mark
                key={src}
                src={src}
                size={72}
                className="shadow-[0px_2px_6px_rgba(0,0,0,0.1)] ring-2 ring-paper-warmth"
              />
            ))}
          </div>

          <div className="relative mx-auto max-w-3xl">
            <SparkleIcon className="pointer-events-none absolute right-8 top-0 hidden h-4 w-4 text-marigold md:block" />
            <h1 className="text-display-sm font-semibold text-ink-black md:text-display">
              A demanding year, made <RotatingWord />.
            </h1>
          </div>

          <p className="mx-auto mt-6 max-w-xl font-serif text-subheading leading-[1.56] text-graphite">
            Set weekly targets, log real sessions, and stay consistent — built for
            anyone chasing a goal.
          </p>

          <div className="mt-8 flex items-center justify-center">
            <div className="relative inline-flex items-center gap-3">
              <SquiggleArrowIcon className="pointer-events-none absolute -left-14 -top-1 hidden h-10 w-20 text-ink-black/25 lg:block" />
              <a
                href="/setup"
                className="rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity duration-200 ease-out hover:opacity-90"
              >
                Get Cadence Free
              </a>
              <a
                href="#philosophy"
                className="rounded-lg bg-sky-tint px-4 py-2 text-body-sm font-medium text-notion-blue transition-opacity duration-200 ease-out hover:opacity-90"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Product mockup: Today screen */}
          <div className="relative mx-auto mt-16 max-w-2xl rounded-xl border border-ink-black/8 bg-pure-white p-6 text-left shadow-[0px_4px_12px_rgba(0,0,0,0.1)]">
            {/* Scattered marks — echoes the avatar row above, floating around
                the mockup the way Notion scatters its integration bubbles
                around the hero screenshot, but built from Cadence's own
                illustrated cast instead of third-party logos. */}
            <Mark
              src={MARKS.cat}
              size={44}
              className="pointer-events-none absolute -bottom-5 -right-5 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.12)] lg:block"
            />
            <Mark
              src={MARKS.signpost}
              size={40}
              className="pointer-events-none absolute -left-6 -top-6 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.12)] lg:block"
            />
            <div className="pointer-events-none absolute -left-28 top-28 hidden lg:block">
              <Mark src={MARKS.folder} size={48} className="shadow-[0px_2px_6px_rgba(0,0,0,0.12)]" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-marigold ring-2 ring-paper-warmth">
                <SparkleIcon className="h-2.5 w-2.5 text-ink-black" />
              </span>
            </div>
            <SquiggleArrowIcon className="pointer-events-none absolute -left-20 top-24 hidden h-8 w-14 -scale-x-100 text-ink-black/20 xl:block" />
            <SquiggleArrowIcon className="pointer-events-none absolute -left-14 bottom-9 hidden h-7 w-12 -scale-x-100 text-ink-black/20 xl:block" />
            <Mark
              src={MARKS.beanie}
              size={36}
              className="pointer-events-none absolute -left-8 bottom-2 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.12)] lg:block"
            />
            <SquiggleArrowIcon className="pointer-events-none absolute -right-28 top-6 hidden h-8 w-14 text-ink-black/20 xl:block" />
            <div className="pointer-events-none absolute -right-24 top-14 hidden lg:block">
              <Mark src={MARKS.pinkHair} size={44} className="shadow-[0px_2px_6px_rgba(0,0,0,0.12)]" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-signal-blue ring-2 ring-paper-warmth">
                <SparkleIcon className="h-2.5 w-2.5 text-pure-white" />
              </span>
            </div>
            <Mark
              src={MARKS.profileMan}
              size={48}
              className="pointer-events-none absolute -right-28 bottom-20 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.12)] xl:block"
            />
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
                <span className="text-body-sm font-medium text-ink-black">Study</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3">
                <span className="text-body-sm text-slate">10:00–18:00</span>
                <span className="text-body-sm font-medium text-ink-black/40">Work</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3">
                <span className="text-body-sm text-slate">19:00–21:00</span>
                <span className="text-body-sm font-medium text-ink-black">Career Growth</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-ink-black/8 px-4 py-3">
                <span className="text-body-sm text-slate">21:30–23:30</span>
                <span className="text-body-sm font-medium text-ink-black">Study</span>
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-ink-black/8 pt-5">
              <div>
                <div className="flex justify-between text-caption text-ink-black/60">
                  <span>Study</span>
                  <span>4.5 / 8h</span>
                </div>
                <div className="mt-1">
                  <ProgressBar value={56} className="bg-marigold" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-caption text-ink-black/60">
                  <span>Career Growth</span>
                  <span>3.0 / 6h</span>
                </div>
                <div className="mt-1">
                  <ProgressBar value={50} className="bg-terracotta" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-caption text-ink-black/60">
                  <span>Fitness</span>
                  <span>3 / 4 sessions</span>
                </div>
                <div className="mt-1">
                  <ProgressBar value={75} className="bg-signal-blue" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mx-auto max-w-[1760px] px-4 sm:px-6 pb-20">
          <p className="text-center text-caption font-medium uppercase tracking-wide text-ink-black/40">
            What using it feels like
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {QUICK_ACTIONS.map((action) => (
              <a
                key={action.label}
                href="#"
                className="group flex items-center gap-3 rounded-xl border border-ink-black/8 bg-pure-white px-4 py-3 transition-colors duration-200 ease-out hover:bg-ink-black/[0.02]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-tint text-notion-blue">
                  <action.Icon className="h-4 w-4" />
                </span>
                <span className="text-body-sm font-medium text-ink-black">{action.label}</span>
                <span className="text-ink-black/30 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-ink-black/60">
                  →
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Philosophy */}
        <section id="philosophy" className="relative mx-auto max-w-[1760px] px-4 sm:px-6 py-20">
          <Mark
            src={MARKS.beanie}
            size={48}
            className="pointer-events-none absolute right-10 top-16 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.1)] lg:block"
          />
          <SectionHeader
            eyebrow="Philosophy"
            title="Structure without rigidity"
            body="“You completed a two-hour focused block. Your top-priority category is healthy, and a secondary category could use more attention this week.” Not: “You failed your 7 PM task.”"
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
        <section id="categories" className="mx-auto max-w-[1760px] px-4 sm:px-6 py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Categories
              </p>
              <h2 className="mt-3 text-heading-lg font-semibold text-ink-black">
                Your categories. Your priorities.
              </h2>
              <p className="mt-4 text-body text-graphite">
                Cadence ships with no built-in categories — you define what you&apos;re
                building toward and how important each part is. Two categories can share
                top priority; the planner won&apos;t quietly favor one. Session-based
                categories get a weekly target instead of a daily requirement, and
                no-minimum categories stay flexible on purpose.
              </p>
              <p className="mt-4 text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Example categories shown — yours will look different
              </p>

              {/* Category avatar row */}
              <div className="mt-6 flex flex-wrap gap-3">
                {CATEGORY_MARKS.map((mark) => (
                  <div key={mark.label} className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-pure-white text-ink-black ${mark.border}`}
                    >
                      <mark.Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-caption text-ink-black/40">{mark.label}</span>
                  </div>
                ))}
              </div>
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
        <section id="leave" className="relative mx-auto max-w-[1760px] px-4 sm:px-6 py-20">
          <Mark
            src={MARKS.folder}
            size={44}
            className="pointer-events-none absolute left-10 top-10 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.1)] lg:block"
          />
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Leave
              </p>
              <h2 className="mt-3 text-heading-lg font-semibold text-ink-black">
                Leave that doesn&apos;t need an excuse
              </h2>
              <p className="mt-4 text-body text-graphite">
                Set your own monthly leave allowance and carry-forward cap — Cadence doesn&apos;t
                pick the number for you. Reduced and full-leave days cost units on purpose, but a
                missed day is never quietly converted into leave, and leave never counts against
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
              <p className="mt-3 text-caption text-pure-white/40">
                Example allowance shown — set your own in Settings
              </p>
            </div>
          </div>
        </section>

        {/* Sync */}
        <section id="sync" className="relative mx-auto max-w-[1760px] px-4 sm:px-6 py-20">
          <Mark
            src={MARKS.pinkHair}
            size={44}
            className="pointer-events-none absolute right-10 top-6 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.1)] lg:block"
          />
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
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-pure-white text-ink-black ${client.border}`}
                >
                  <client.Icon className="h-5 w-5" />
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
        <section id="screens" className="relative mx-auto max-w-[1760px] px-4 sm:px-6 py-20">
          <Mark
            src={MARKS.profileMan}
            size={44}
            className="pointer-events-none absolute left-10 top-4 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.1)] lg:block"
          />
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
        <section className="relative overflow-hidden bg-midnight-ink py-24">
          <Mark
            src={MARKS.beanie}
            size={48}
            className="pointer-events-none absolute left-12 bottom-12 hidden ring-2 ring-pure-white/20 lg:block"
          />
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
        <section className="relative overflow-hidden bg-marigold py-20">
          <Mark
            src={MARKS.profileMan}
            size={56}
            className="pointer-events-none absolute -left-4 bottom-8 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.15)] lg:block"
          />
          <Mark
            src={MARKS.pinkHair}
            size={48}
            className="pointer-events-none absolute -right-2 top-10 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.15)] lg:block"
          />
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-heading-lg font-semibold text-ink-black">
              Plan the year. Protect the person.
            </h2>
            <div className="mt-8">
              <a
                href="/setup"
                className="inline-flex rounded-lg bg-pure-white px-5 py-2.5 text-body-sm font-medium text-notion-blue transition-opacity duration-200 ease-out hover:opacity-90"
              >
                Get Cadence Free
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-black/8">
        <div className="mx-auto flex max-w-[1760px] flex-col items-center justify-between gap-6 px-4 sm:px-6 py-12 md:flex-row">
          <div>
            <p className="flex items-center gap-2 text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
              <CadenceMark className="h-5 w-5 shrink-0 text-notion-blue" />
              Cadence
            </p>
            <p className="mt-1 text-body-sm text-ink-black/40">
              Fixed anchors. Flexible content.
            </p>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
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

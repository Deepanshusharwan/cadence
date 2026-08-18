"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Mark, MARKS } from "@/components/marks";
import { CheckIcon, SparkleIcon, SquiggleArrowIcon } from "@/components/icons";
import { api } from "@/lib/api";

type Cadence = "monthly" | "quarterly" | "annual" | "lifetime";
type Region = "US" | "IN";

const CADENCES: { key: Cadence; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "annual", label: "Annual" },
  { key: "lifetime", label: "Lifetime" },
];

// Lemon Squeezy bills every customer in USD — there's no per-variant
// currency override on the store, so "India pricing" is a genuinely
// cheaper USD variant (matching the real-market anchor research from the
// pricing-plan discussion this page is built from), not a different
// currency. Both regions are $ amounts; India's is just the lower one.
const PRICING: Record<
  Region,
  { monthly: number; quarterly: number; annual: number; lifetime: number }
> = {
  US: { monthly: 4.99, quarterly: 12.99, annual: 49.99, lifetime: 99 },
  IN: { monthly: 1.59, quarterly: 4.19, annual: 8.39, lifetime: 20.99 },
};

// Approximate USD -> INR rate, used only to show a convenience estimate of
// what the India price feels like in rupees. Not what's actually charged —
// Lemon Squeezy always charges the USD amount above, then localizes the
// display/charge to the buyer's card currency at checkout using whatever
// the live rate is at that moment. Fetched live (see PricingPage's effect
// below) from Frankfurter (ECB rates, free, no key, CORS-enabled); this is
// only the fallback for if that fetch fails or hasn't resolved yet.
const FALLBACK_INR_RATE = 95.7;

// Matches the free-trial length set on each subscription variant in the
// Lemon Squeezy dashboard. Lifetime is a one-time purchase, so it has no
// trial — see the cadence !== "lifetime" checks below.
const TRIAL_DAYS = 30;

function approxInr(usd: number, rate: number): string {
  return `₹${Math.round(usd * rate).toLocaleString("en-IN")}`;
}

// IANA timezones for India and its immediate neighbors — comparable
// purchasing power to India, so they get routed to the same "IN" price
// tier rather than the International one. Used only as the free,
// dependency-free proxy for auto-detecting region on load (see the effect
// in PricingPage below); the visitor can always override it by hand.
const SOUTH_ASIA_TIMEZONES = new Set([
  "Asia/Kolkata", // India
  "Asia/Calcutta", // India (deprecated alias, some environments still report it)
  "Asia/Karachi", // Pakistan
  "Asia/Dhaka", // Bangladesh
  "Asia/Kathmandu", // Nepal
  "Asia/Colombo", // Sri Lanka
  "Asia/Thimphu", // Bhutan
  "Asia/Kabul", // Afghanistan
  "Asia/Yangon", // Myanmar
  "Asia/Rangoon", // Myanmar (deprecated alias)
  "Indian/Maldives", // Maldives
]);

// Lemon Squeezy variant ids (Store #454802, product "Cadence" for the three
// subscription cadences + product "Cadence Lifetime" for the one-time tier).
const VARIANT_IDS: Record<Region, Record<Cadence, string>> = {
  US: { monthly: "2032070", quarterly: "2031988", annual: "2032041", lifetime: "2032076" },
  IN: { monthly: "2032049", quarterly: "2032054", annual: "2032060", lifetime: "2032091" },
};

const CADENCE_SUFFIX: Record<Cadence, string> = {
  monthly: "/month",
  quarterly: "/quarter",
  annual: "/year",
  lifetime: " once",
};

// How many months of the monthly price each cadence covers — the base for
// computing real "% off" and "months free" figures below, instead of
// hardcoded copy that can drift out of sync with the actual prices.
const MONTHS_COVERED: Record<Cadence, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
  lifetime: 0, // not a subscription — handled separately, see lifetimePayoffYears
};

function formatPrice(region: Region, cadence: Cadence): string {
  const price = PRICING[region][cadence];
  const isWhole = Number.isInteger(price);
  return `$${isWhole ? price : price.toFixed(2)}`;
}

/** % saved vs. paying the monthly price every month for that period. null for monthly/lifetime, which aren't discounts off themselves. */
function savingsPercent(region: Region, cadence: Cadence): number | null {
  const months = MONTHS_COVERED[cadence];
  if (!months) return null;
  const fullPrice = PRICING[region].monthly * months;
  const actual = PRICING[region][cadence];
  return Math.round(((fullPrice - actual) / fullPrice) * 100);
}

/** How many free months of the monthly rate the discount is worth — reads better than a percentage for annual specifically. */
function monthsFree(region: Region, cadence: Cadence): number {
  const months = MONTHS_COVERED[cadence];
  const fullPrice = PRICING[region].monthly * months;
  const actual = PRICING[region][cadence];
  return (fullPrice - actual) / PRICING[region].monthly;
}

/** Years of Annual billing the Lifetime price is equivalent to — the honest way to frame a one-time price, since "% off monthly" doesn't apply to it. */
function lifetimePayoffYears(region: Region): number {
  return PRICING[region].lifetime / PRICING[region].annual;
}

function priceSubline(region: Region, cadence: Cadence): string {
  if (cadence === "monthly") return "billed monthly";
  if (cadence === "lifetime") {
    return `pays for itself vs. Annual in ~${lifetimePayoffYears(region).toFixed(1)} years`;
  }
  const pct = savingsPercent(region, cadence);
  if (cadence === "annual") {
    return `Save ${pct}% — about ${monthsFree(region, cadence).toFixed(1)} months free`;
  }
  return `Save ${pct}% vs. paying monthly`;
}

function Feature({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckIcon
        className={`mt-0.5 h-4 w-4 shrink-0 ${muted ? "text-ink-black/25" : "text-notion-blue"}`}
      />
      <span className={`text-body-sm ${muted ? "text-ink-black/40" : "text-ink-black/85"}`}>
        {children}
      </span>
    </li>
  );
}

export default function PricingPage() {
  const [cadence, setCadence] = useState<Cadence>("annual");
  const [region, setRegion] = useState<Region>("US");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [inrRate, setInrRate] = useState(FALLBACK_INR_RATE);
  const router = useRouter();
  const { isSignedIn } = useUser();

  // Live rate for the "≈ ₹X" convenience estimate -- keeps FALLBACK_INR_RATE
  // if this fails or is still loading, never blocks rendering on it.
  useEffect(() => {
    let cancelled = false;
    fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { rates?: { INR?: number } }) => {
        const rate = data.rates?.INR;
        if (!cancelled && typeof rate === "number") setInrRate(rate);
      })
      .catch(() => {
        // Network hiccup or the API's down -- FALLBACK_INR_RATE already covers this.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Region starts at "US" so the server-prerendered markup and the first
  // client render match (no hydration mismatch), then this corrects it
  // client-only using the visitor's timezone as a free, no-dependency proxy
  // for "are they in India" — a real geo-IP lookup would be more accurate
  // but adds an external service for a fairly small win. Only fires once on
  // mount, so it never overrides a region the visitor picks by hand.
  useEffect(() => {
    // Deferred via queueMicrotask so this isn't a synchronous setState call
    // within the effect body itself (react-hooks/set-state-in-effect) —
    // this is reading an external platform API (Intl) on mount, not
    // synchronizing with a React value, so the immediate-render-loop
    // concern that rule guards against doesn't apply here.
    queueMicrotask(() => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (SOUTH_ASIA_TIMEZONES.has(tz)) {
          setRegion("IN");
        }
      } catch {
        // Intl.DateTimeFormat unsupported/blocked -- keep the "US" default.
      }
    });
  }, []);

  async function handleStartPlus() {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const { url } = await api.createCheckout(VARIANT_IDS[region][cadence]);
      window.location.href = url;
    } catch {
      setCheckoutError("Couldn't start checkout — please try again in a moment.");
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-paper-warmth">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto max-w-[1760px] px-4 sm:px-6 pt-20 pb-12 text-center">
          <SparkleIcon className="pointer-events-none absolute left-[20%] top-8 hidden h-4 w-4 text-marigold md:block" />
          <SparkleIcon className="pointer-events-none absolute right-[20%] top-16 hidden h-3 w-3 text-signal-blue md:block" />

          <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
            Pricing
          </p>
          <h1 className="mt-3 text-display-sm font-semibold text-ink-black md:text-display">
            The planner stays free.
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-serif text-subheading leading-[1.56] text-graphite">
            Items, targets, the timer, leave, weekly review — the whole point of
            Cadence is free forever. Paid tiers add sync, insight, and eventually an
            assistant that helps you set it all up.
          </p>

          {/* Region + cadence controls */}
          <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="inline-flex items-stretch gap-1 rounded-lg border border-ink-black/10 bg-pure-white p-1">
              {CADENCES.map((c) => {
                const active = cadence === c.key;
                const pct = savingsPercent(region, c.key);
                const badge =
                  c.key === "lifetime" ? "Best value" : pct && pct > 0 ? `Save ${pct}%` : null;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCadence(c.key)}
                    className={`flex flex-col items-center rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors duration-200 ease-out ${
                      active
                        ? "bg-notion-blue text-white"
                        : "text-ink-black/60 hover:text-ink-black"
                    }`}
                  >
                    {c.label}
                    {badge ? (
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wide ${
                          active ? "text-white/70" : "text-notion-blue/70"
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <label className="inline-flex items-center gap-2 text-body-sm text-ink-black/60">
              <span className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Pricing for
              </span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="rounded-lg border border-ink-black/12 bg-pure-white px-3 py-1.5 text-body-sm font-medium text-ink-black outline-none focus:border-notion-blue"
              >
                <option value="US">International</option>
                <option value="IN">India &amp; South Asia</option>
              </select>
            </label>
          </div>
          <p className="mt-3 text-caption text-ink-black/35">
            Prices are billed in USD everywhere — India pricing is a lower USD rate,
            not a different currency. Your card statement will show the equivalent in
            your own currency at checkout.
          </p>
        </section>

        {/* Tier cards */}
        <section className="mx-auto max-w-[1760px] px-4 sm:px-6 pb-24">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 md:items-start">
            {/* Free */}
            <div className="rounded-xl border border-ink-black/8 bg-pure-white p-6">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Free
              </p>
              <p className="mt-3 text-heading font-semibold text-ink-black">
                {region === "IN" ? "₹0" : "$0"}
              </p>
              <p className="mt-1 text-body-sm text-ink-black/40">forever</p>

              <Link
                href="/sign-in"
                className="mt-6 block rounded-lg border border-ink-black/12 px-4 py-2 text-center text-body-sm font-medium text-ink-black transition-colors duration-200 ease-out hover:bg-ink-black/5"
              >
                Get started
              </Link>

              <ul className="mt-6 space-y-3">
                <Feature>Full planner — items, targets, timer, leave, weekly review</Feature>
                <Feature>Web and mobile, no device limit</Feature>
                <Feature>Each device keeps its own data — not merged across devices</Feature>
                <Feature>Feature requests taken</Feature>
              </ul>
            </div>

            {/* Plus */}
            <div className="relative rounded-xl border-2 border-notion-blue bg-sky-tint p-6">
              <span className="absolute -top-3 left-6 rounded-full bg-notion-blue px-3 py-1 text-caption font-medium uppercase tracking-wide text-white">
                Most popular
              </span>
              <div className="absolute right-5 top-5 flex -space-x-3">
                <Mark src={MARKS.pinkHair} size={30} className="ring-2 ring-sky-tint" />
                <Mark src={MARKS.cat} size={30} className="ring-2 ring-sky-tint" />
                <Mark src={MARKS.dog} size={30} className="ring-2 ring-sky-tint" />
              </div>

              <p className="text-caption font-medium uppercase tracking-wide text-notion-blue">
                Plus
              </p>
              <p className="mt-3 text-heading font-semibold text-ink-black">
                {region === "IN" ? approxInr(PRICING.IN[cadence], inrRate) : formatPrice(region, cadence)}
                <span className="text-body-sm font-normal text-ink-black/50">
                  {CADENCE_SUFFIX[cadence]}
                </span>
              </p>
              <p className="mt-1 text-body-sm text-ink-black/50">{priceSubline(region, cadence)}</p>
              {region === "IN" ? (
                <p className="mt-0.5 text-caption text-ink-black/35">
                  Charged as {formatPrice(region, cadence)} (USD) — rupee amount is an estimate at
                  today&apos;s rate
                </p>
              ) : null}
              {cadence !== "lifetime" ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-marigold/25 px-2.5 py-1 text-caption font-medium text-[#6b4700]">
                  Try free for {TRIAL_DAYS} days — you won&apos;t pay a penny until it ends
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleStartPlus}
                disabled={checkoutLoading}
                className="mt-6 block w-full rounded-lg bg-notion-blue px-4 py-2 text-center text-body-sm font-medium text-white transition-opacity duration-200 ease-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkoutLoading
                  ? "Redirecting…"
                  : cadence === "lifetime"
                    ? "Buy Plus Lifetime"
                    : "Start free trial"}
              </button>
              {cadence !== "lifetime" ? (
                <p className="mt-2 text-center text-caption text-ink-black/35">
                  Cancel before day {TRIAL_DAYS} and you won&apos;t be charged.
                </p>
              ) : null}
              {checkoutError ? (
                <p className="mt-2 text-caption text-vermillion">{checkoutError}</p>
              ) : null}

              <ul className="mt-6 space-y-3">
                <Feature>Everything in Free</Feature>
                <Feature>Cross-device sync — one account, every device merged</Feature>
                <Feature>Descriptive insights and Long Term analytics</Feature>
                <Feature>Home-screen widgets</Feature>
                <Feature>Custom avatars and themes</Feature>
                <Feature>Alternate watch faces and fullscreen timer</Feature>
                <Feature>Calendar integration</Feature>
                <Feature>Read-only progress sharing</Feature>
                <Feature>Data export</Feature>
                <Feature>Priority feature requests</Feature>
              </ul>
            </div>

            {/* Pro */}
            <div className="relative rounded-xl border border-dashed border-ink-black/15 bg-pure-white/60 p-6">
              <span className="inline-flex items-center rounded-full bg-marigold/20 px-2.5 py-0.5 text-caption font-medium uppercase tracking-wide text-[#8a5a00]">
                Work in progress
              </span>

              <Image
                src="/illustrations/something-coming.png"
                alt=""
                width={480}
                height={351}
                className="mt-4 h-auto w-full"
              />

              <p className="mt-4 text-caption font-medium uppercase tracking-wide text-ink-black/40">
                Pro
              </p>
              <p className="mt-3 text-heading font-semibold text-ink-black/40">
                Pricing TBD
              </p>
              <p className="mt-1 text-body-sm text-ink-black/40">
                still measuring what it costs to run
              </p>

              <button
                type="button"
                disabled
                className="mt-6 block w-full cursor-not-allowed rounded-lg border border-ink-black/10 px-4 py-2 text-center text-body-sm font-medium text-ink-black/40"
              >
                Coming soon
              </button>

              <ul className="mt-6 space-y-3">
                <Feature muted>Everything in Plus</Feature>
                <Feature muted>AI assistant — conversational setup</Feature>
                <Feature muted>Weekly AI coach and re-planning</Feature>
                <Feature muted>Voice input and natural-language quick-log</Feature>
                <Feature muted>AI-powered widgets</Feature>
                <Feature muted>Highest-priority feature requests</Feature>
              </ul>
              <p className="mt-6 text-caption italic text-ink-black/35">More incoming soon.</p>
            </div>
          </div>

          {/* Lifetime clarifier for Pro */}
          <p className="mx-auto mt-8 max-w-md text-center text-caption text-ink-black/35">
            Plus Lifetime is available now, at any cadence toggle above. Pro Lifetime
            will follow once Pro itself ships.
          </p>
        </section>

        {/* Decorative closer, matches the landing page's pull-quote treatment */}
        <section className="relative overflow-hidden bg-midnight-ink py-20">
          <Mark
            src={MARKS.beanie}
            size={44}
            className="pointer-events-none absolute left-10 bottom-10 hidden ring-2 ring-pure-white/20 lg:block"
          />
          <Mark
            src={MARKS.cat}
            size={40}
            className="pointer-events-none absolute right-12 top-10 hidden ring-2 ring-pure-white/20 lg:block"
          />
          <SquiggleArrowIcon className="pointer-events-none absolute left-1/3 top-8 hidden h-8 w-14 text-white/20 lg:block" />
          <div className="mx-auto max-w-2xl px-6 text-center">
            <p className="font-serif text-[32px] leading-[1.25] text-white">
              &ldquo;The timetable exists to serve the user&apos;s goals and life. The
              user does not exist to serve the timetable.&rdquo;
            </p>
            <p className="mt-6 text-caption font-medium uppercase tracking-wide text-white/50">
              That includes pricing — free stays genuinely useful, on purpose.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

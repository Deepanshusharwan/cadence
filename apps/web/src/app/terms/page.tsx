import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SparkleIcon } from "@/components/icons";

const LAST_UPDATED = "August 22, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">{title}</h2>
      <div className="mt-3 space-y-4 text-body leading-[1.5] text-graphite">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-paper-warmth">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative mx-auto max-w-[1760px] px-4 sm:px-6 pt-20 pb-12 text-center">
          <SparkleIcon className="pointer-events-none absolute right-[22%] top-10 hidden h-4 w-4 text-signal-blue md:block" />
          <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
            Legal
          </p>
          <h1 className="mt-3 text-display-sm font-semibold text-ink-black md:text-heading-lg">
            Terms of Service
          </h1>
          <p className="mt-4 text-body-sm text-ink-black/40">Last updated {LAST_UPDATED}</p>
        </section>

        <section className="mx-auto max-w-[720px] px-4 sm:px-6 pb-24">
          <div className="rounded-xl border border-ink-black/8 bg-pure-white p-8 sm:p-10">
            <p className="text-body leading-[1.5] text-graphite">
              These terms cover your use of Cadence — the web app, the Android app, and the
              backend that powers both. By creating an account, you agree to them. Cadence is
              an independently-run product, not a large company, so these terms are written
              plainly rather than padded out.
            </p>

            <Section title="The service">
              <p>
                Cadence is a fixed-anchor weekly planner: you define recurring commitments and
                items, log actual sessions against them, track leave, and get a computed
                weekly review — all scheduling, deficit, and consistency math happens on our
                servers, not on your device, so the numbers stay consistent across whatever
                you&apos;re using it on.
              </p>
              <p>
                The core planner — items, targets, the timer, leave tracking, weekly review —
                is free, with no time limit. Paid tiers (see below) add cross-device sync and
                deeper analytics.
              </p>
            </Section>

            <Section title="Your account">
              <p>
                You&apos;re responsible for keeping your sign-in credentials secure and for
                anything that happens under your account. Give us accurate information when
                asked (mainly just an email address, via our authentication provider Clerk).
                One account per person, please — this isn&apos;t enforced technically today,
                but sharing credentials isn&apos;t within the spirit of these terms.
              </p>
            </Section>

            <Section title="Plus subscriptions and billing">
              <p>
                Plus-tier subscriptions are billed and processed by Lemon Squeezy, who acts as
                merchant of record — your invoice will show Lemon Squeezy, not Cadence
                directly, and billing disputes/refund requests for a charge go through them.
                Trials (where offered) convert automatically to a paid subscription unless
                cancelled before the trial ends; cancelling stops future billing but doesn&apos;t
                retroactively refund the current period unless required by law or Lemon
                Squeezy&apos;s own policy.
              </p>
              <p>
                Lifetime purchases are a one-time payment for Plus access to that tier, for as
                long as Cadence exists as a product — they&apos;re not a promise of specific
                future features beyond what Plus includes at time of purchase.
              </p>
            </Section>

            <Section title="Acceptable use">
              <p>
                Don&apos;t use Cadence to break the law, attempt to access other users&apos;
                data, overload or abuse the service (automated scraping, load-testing
                production without asking, etc.), or reverse-engineer the apps beyond what&apos;s
                allowed by law. We reserve the right to suspend accounts that do.
              </p>
            </Section>

            <Section title="Availability">
              <p>
                We aim for the service to be reliably available, but this is a small,
                independently-run product without an enterprise uptime guarantee. We&apos;ll
                do our best to give notice before planned maintenance that affects
                availability, but the service is provided &ldquo;as is,&rdquo; without warranty
                of uninterrupted or error-free operation.
              </p>
            </Section>

            <Section title="Limitation of liability">
              <p>
                To the extent permitted by law, Cadence isn&apos;t liable for indirect,
                incidental, or consequential damages arising from your use of the service —
                including data loss, though we take reasonable steps (backups, tested
                deployments) to prevent it. Our total liability for any claim is limited to
                what you&apos;ve paid us in the twelve months before the claim, if anything.
              </p>
            </Section>

            <Section title="Termination">
              <p>
                You can stop using Cadence and delete your account at any time by emailing us.
                We may suspend or terminate accounts that violate these terms, with notice
                where practical.
              </p>
            </Section>

            <Section title="Changes to these terms">
              <p>
                If we change these terms in a way that matters, we&apos;ll update the date at
                the top of this page and note it in the app. Continuing to use Cadence after a
                change means you accept the updated terms.
              </p>
            </Section>

            <Section title="Governing law">
              <p>
                These terms are governed by the laws of India, without regard to conflict-of-law
                principles.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about these terms:{" "}
                <a href="mailto:deepanshusharwan35@gmail.com" className="text-notion-blue underline">
                  deepanshusharwan35@gmail.com
                </a>
              </p>
            </Section>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

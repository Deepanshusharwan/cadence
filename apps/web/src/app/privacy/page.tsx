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

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-paper-warmth">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative mx-auto max-w-[1760px] px-4 sm:px-6 pt-20 pb-12 text-center">
          <SparkleIcon className="pointer-events-none absolute left-[22%] top-10 hidden h-4 w-4 text-marigold md:block" />
          <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">
            Legal
          </p>
          <h1 className="mt-3 text-display-sm font-semibold text-ink-black md:text-heading-lg">
            Privacy Policy
          </h1>
          <p className="mt-4 text-body-sm text-ink-black/40">Last updated {LAST_UPDATED}</p>
        </section>

        <section className="mx-auto max-w-[720px] px-4 sm:px-6 pb-24">
          <div className="rounded-xl border border-ink-black/8 bg-pure-white p-8 sm:p-10">
            <p className="text-body leading-[1.5] text-graphite">
              Cadence (&ldquo;we,&rdquo; &ldquo;us&rdquo;) is a small, independently-run product.
              This policy explains what we collect through the Cadence web and mobile apps,
              why we collect it, and who else ever sees it. If anything here is unclear,
              email us at{" "}
              <a href="mailto:deepanshusharwan35@gmail.com" className="text-notion-blue underline">
                deepanshusharwan35@gmail.com
              </a>
              .
            </p>

            <Section title="What we collect">
              <p>
                <strong className="font-semibold text-ink-black">Account information.</strong>{" "}
                Sign-up and sign-in are handled entirely by Clerk, our authentication provider.
                Depending on how you sign in, this includes your email address, name, and
                profile photo (for Google, Facebook, GitHub, or X sign-in), or your email and
                password (which we never see in plain text — Clerk stores and verifies it on
                our behalf).
              </p>
              <p>
                <strong className="font-semibold text-ink-black">The planning data you create.</strong>{" "}
                Items and categories, schedule anchors, calendar events, logged study/focus
                sessions (start and stop times), day types (reduced day, leave), your weekly
                reviews, leave allowance, timezone, and appearance preferences (theme, accent
                color). This is the actual substance of the app — everything you track
                and plan lives here.
              </p>
              <p>
                <strong className="font-semibold text-ink-black">Billing information (Plus tier only).</strong>{" "}
                Payment is processed entirely by Lemon Squeezy, our merchant of record. We
                never see or store your card details — we only receive your subscription
                status (active, cancelled, plan tier) via a webhook.
              </p>
              <p>
                <strong className="font-semibold text-ink-black">Technical data.</strong> Standard
                server logs (IP address, timestamp, endpoint requested) for debugging and
                abuse prevention. On Android, a local on-device cache of your own data
                supports offline use — this stays on your device and syncs to our servers
                once you&apos;re back online.
              </p>
            </Section>

            <Section title="How we use it">
              <p>
                To run the app: rendering your schedule, computing deficits and priorities,
                tracking leave, generating your weekly review and progress insights, and
                syncing your data across devices if you&apos;re on the Plus tier. We also use
                it to respond to support requests and to keep the service secure and free of
                abuse. We do not use your planning data for advertising, and we do not sell
                it to anyone.
              </p>
            </Section>

            <Section title="Who else sees it">
              <p>
                A short, deliberate list — we don&apos;t add data processors casually:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-ink-black">Clerk</strong> — authentication
                  and account/session management.
                </li>
                <li>
                  <strong className="font-semibold text-ink-black">Lemon Squeezy</strong> —
                  payment processing for Plus subscriptions (merchant of record; handles all
                  card data and billing disputes directly).
                </li>
                <li>
                  <strong className="font-semibold text-ink-black">Our hosting provider</strong>{" "}
                  — runs the server and database that store your planning data. We don&apos;t
                  use any analytics or advertising trackers in the app.
                </li>
              </ul>
            </Section>

            <Section title="How long we keep it">
              <p>
                For as long as your account exists. If you want your account and data deleted,
                email us and we&apos;ll remove it from our production database within a
                reasonable time — backups are cycled out on a rolling basis afterward.
              </p>
            </Section>

            <Section title="Security">
              <p>
                All traffic between the apps and our servers is encrypted (HTTPS). Sessions
                are verified using Clerk-issued tokens rather than a password system we run
                ourselves. No method of transmission or storage is perfectly secure, but we
                don&apos;t take shortcuts here — there&apos;s no ad tech or third-party
                tracker bolted onto this app to compromise.
              </p>
            </Section>

            <Section title="Children">
              <p>
                Cadence isn&apos;t directed at children, and we don&apos;t knowingly collect
                data from anyone under 13. If you believe a child has created an account,
                email us and we&apos;ll remove it.
              </p>
            </Section>

            <Section title="Changes to this policy">
              <p>
                If this policy changes in a way that matters, we&apos;ll update the date at
                the top of this page. Significant changes will also be noted in the app.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about this policy or your data:{" "}
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

import Link from "next/link";
import type { Plan } from "@/lib/store";

// Wraps a Plus-only section: renders the real content for plus/pro,
// otherwise a locked upsell card in its place — same shape, so the page
// doesn't jump around when someone upgrades.
export function PlusGate({
  plan,
  title,
  description,
  children,
}: {
  plan: Plan;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  if (plan !== "free") return <>{children}</>;
  return (
    <div className="mt-6 rounded-xl border border-dashed border-ink-black/15 bg-pure-white/60 p-6">
      <p className="text-caption font-medium uppercase tracking-wide text-ink-black/40">{title}</p>
      <p className="mt-2 text-body-sm text-ink-black/50">{description}</p>
      <Link
        href="/pricing"
        className="mt-3 inline-block text-body-sm font-medium text-notion-blue hover:opacity-80"
      >
        Upgrade to Plus →
      </Link>
    </div>
  );
}

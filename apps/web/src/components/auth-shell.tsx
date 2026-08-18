import type { ReactNode } from "react";
import Link from "next/link";
import { Mark, MARKS, type MarkKey } from "@/components/marks";
import { CadenceMark } from "@/components/logo";
import { SparkleIcon, SquiggleArrowIcon } from "@/components/icons";

// Shared chrome for /sign-in and /sign-up — the Clerk widget itself is
// unbranded, so this is what keeps those two pages from feeling like a
// jump to a different product: the same scattered-mark treatment as the
// landing hero (see app/page.tsx), just around a login card instead of
// the product mockup.
const SCATTER: Record<"signIn" | "signUp", { key: MarkKey; badge: string }[]> = {
  signIn: [
    { key: "cat", badge: "bg-marigold" },
    { key: "signpost", badge: "bg-signal-blue" },
  ],
  signUp: [
    { key: "pinkHair", badge: "bg-signal-blue" },
    { key: "beanie", badge: "bg-marigold" },
  ],
};

export function AuthShell({
  variant,
  children,
}: {
  variant: "signIn" | "signUp";
  children: ReactNode;
}) {
  const [first, second] = SCATTER[variant];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper-warmth px-4 py-12">
      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-2 text-heading-sm font-bold tracking-[-0.242px] text-ink-black sm:left-6 sm:top-6"
      >
        <CadenceMark className="h-5 w-5 shrink-0 text-notion-blue" />
        Cadence
      </Link>

      <div className="relative">
        <SparkleIcon className="pointer-events-none absolute -right-6 -top-6 hidden h-5 w-5 text-marigold md:block" />
        <SquiggleArrowIcon className="pointer-events-none absolute -left-16 -top-4 hidden h-9 w-16 -scale-y-100 text-ink-black/20 lg:block" />

        <div className="pointer-events-none absolute -left-10 top-16 hidden lg:block">
          <Mark
            src={MARKS[first.key]}
            size={44}
            className="shadow-[0px_2px_6px_rgba(0,0,0,0.12)]"
          />
          <span
            className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-paper-warmth ${first.badge}`}
          >
            <SparkleIcon className="h-2.5 w-2.5 text-ink-black" />
          </span>
        </div>

        <Mark
          src={MARKS[second.key]}
          size={40}
          className="pointer-events-none absolute -right-10 bottom-10 hidden shadow-[0px_2px_6px_rgba(0,0,0,0.12)] lg:block"
        />

        {children}
      </div>
    </div>
  );
}

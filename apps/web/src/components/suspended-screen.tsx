import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { CadenceMark } from "@/components/logo";

// Shown when store.tsx's bootstrap gets a 403 from every endpoint, which
// only happens for a banned account (deps.get_current_user enforces it
// centrally on the backend — see backend/app/deps.py). Deliberately no
// hardcoded support address here; add one once there's a real inbox to
// point people at.
export function SuspendedScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper-warmth px-6 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2 text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
        <CadenceMark className="h-5 w-5 shrink-0 text-notion-blue" />
        Cadence
      </Link>

      <h1 className="text-heading-lg font-semibold text-ink-black">This account is suspended</h1>
      <p className="mt-3 max-w-sm font-serif text-body text-graphite">
        You don&apos;t have access to Cadence right now. Nothing has been deleted —
        your data is exactly as you left it.
      </p>

      <SignOutButton>
        <button
          type="button"
          className="mt-6 rounded-lg border border-ink-black/12 px-4 py-2 text-body-sm font-medium text-ink-black transition-colors hover:bg-ink-black/5"
        >
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}

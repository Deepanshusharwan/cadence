import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper-warmth px-6 text-center">
      <Image
        src="/illustrations/404.png"
        alt=""
        width={480}
        height={434}
        className="h-auto w-full max-w-sm"
        priority
      />
      <h1 className="mt-6 text-heading-lg font-semibold text-ink-black">
        You&apos;ve wandered off the schedule
      </h1>
      <p className="mt-3 max-w-sm font-serif text-body text-graphite">
        This page isn&apos;t on the map — but your next session is still waiting.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
      >
        ← Go back home
      </Link>
    </div>
  );
}

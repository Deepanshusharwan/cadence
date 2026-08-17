import Image from "next/image";
import Link from "next/link";

export default function WeekPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
      <Image
        src="/illustrations/empty-week.png"
        alt=""
        width={340}
        height={234}
        className="h-auto w-full max-w-xs"
      />
      <h1 className="mt-6 text-heading-lg font-semibold text-ink-black">
        The full week view is on its way
      </h1>
      <p className="mt-3 max-w-md font-serif text-body text-graphite">
        Monday–Sunday, planned vs. actual, at a glance — for now, Today has your live schedule
        and this week&apos;s progress.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90"
      >
        Back to Today
      </Link>
    </div>
  );
}

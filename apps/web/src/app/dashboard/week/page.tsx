import Link from "next/link";
import { Mark, MARKS } from "@/components/marks";

export default function WeekPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
      <Mark src={MARKS.beanie} size={72} className="shadow-[0px_2px_6px_rgba(0,0,0,0.1)]" />
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

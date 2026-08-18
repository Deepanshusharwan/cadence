import Link from "next/link";
import { CadenceMark } from "@/components/logo";
import { NAV_LINKS } from "@/components/site-header";

export function SiteFooter() {
  return (
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
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-body-sm font-medium text-ink-black/54 transition-colors duration-200 ease-out hover:text-ink-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-caption text-ink-black/40">© 2026 Cadence</p>
      </div>
    </footer>
  );
}

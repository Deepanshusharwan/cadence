import Link from "next/link";
import { CadenceMark } from "@/components/logo";

// Shared nav for the landing page and any other public marketing page
// (e.g. /pricing) — kept in one place so they can't drift apart.
export const NAV_LINKS = [
  { href: "/#philosophy", label: "Philosophy" },
  { href: "/#categories", label: "Items" },
  { href: "/#leave", label: "Leave" },
  { href: "/#screens", label: "Screens" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-black/8 bg-paper-warmth/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1760px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
          <CadenceMark className="h-5 w-5 shrink-0 text-notion-blue" />
          Cadence
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-3 text-body-sm font-medium text-ink-black/54 transition-colors duration-200 ease-out hover:text-ink-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="rounded-lg px-4 py-2 text-body-sm font-medium text-ink-black/95 transition-colors duration-200 ease-out hover:bg-ink-black/5"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity duration-200 ease-out hover:opacity-90"
          >
            Get Cadence Free
          </Link>
        </div>
      </div>
    </header>
  );
}

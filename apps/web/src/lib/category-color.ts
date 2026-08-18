// Category accent colors rotate through backend/app/routers/categories.py's
// ACCENT_CLASSES — most are light enough for black text, but the darker
// ones (signal-blue, midnight-ink) need white instead. Mirrors the per-item
// "text" field the landing page's own CATEGORIES mockup already uses
// (src/app/page.tsx) for the same palette.
//
// Literal text-black/text-white on purpose, not text-ink-black/text-pure-white
// -- those tokens flip in dark mode (globals.css), but these accent colors
// don't, so pairing a fixed bright background with a theme-reactive text
// color would flip to poor contrast (e.g. near-white text on marigold) the
// moment dark mode is on. The contrast decision here is about the fixed
// accent color, not the page theme.
const DARK_ACCENTS = new Set(["bg-signal-blue", "bg-midnight-ink"]);

export function textOnCategoryColor(bgClass: string): string {
  return DARK_ACCENTS.has(bgClass) ? "text-white" : "text-black";
}

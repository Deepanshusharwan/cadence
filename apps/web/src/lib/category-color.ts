// Category accent colors rotate through backend/app/routers/categories.py's
// ACCENT_CLASSES — most are light enough for black text, but the darker
// ones (signal-blue, midnight-ink) need white instead. Mirrors the per-item
// "text" field the landing page's own CATEGORIES mockup already uses
// (src/app/page.tsx) for the same palette.
const DARK_ACCENTS = new Set(["bg-signal-blue", "bg-midnight-ink"]);

export function textOnCategoryColor(bgClass: string): string {
  return DARK_ACCENTS.has(bgClass) ? "text-pure-white" : "text-ink-black";
}

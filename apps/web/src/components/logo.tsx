// Cadence brand mark: a single-color "C" ring with a small progress dot and
// two accent ticks. Deliberately monochrome via currentColor — per the
// notion-web-design skill, color variety belongs to card backgrounds, not
// simultaneously-colored chrome, so this mark takes whichever single accent
// class its wrapper sets (text-notion-blue, text-marigold, etc.) rather than
// carrying its own multi-color palette.
export function CadenceMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="75 25"
        strokeDashoffset="-12.5"
      />
      <circle cx="15.6" cy="14.2" r="1.3" fill="currentColor" />
      <path
        d="M17 4.5 18.4 6.6M19.8 3.2 20.6 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

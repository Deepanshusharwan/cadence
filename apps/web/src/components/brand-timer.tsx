// A playful, on-brand face: colored arc segments and tick marks in the
// app's real category-color palette, the actual Cadence "C" mark (given a
// friendly pair of eyes) at the center, and small doodle marks at the foot
// -- the most "Cadence" of the watch faces, decorative rather than
// data-driven (Progress Ring already covers literal weekly progress).

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarPoint(cx, cy, r, startDeg);
  const end = polarPoint(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

// Same rotation used for real category colors (backend ACCENT_CLASSES),
// plus coral, so ticks/arcs stay recognizable across the rest of the app.
const PALETTE = ["stroke-coral", "stroke-marigold", "stroke-signal-blue", "stroke-orchid", "stroke-sky-wash", "stroke-terracotta"];
const ARC_COLORS = ["stroke-coral", "stroke-marigold", "stroke-signal-blue", "stroke-orchid"];

export function BrandTimer({
  elapsedMs,
  paused,
  itemLabel,
  size = 264,
}: {
  elapsedMs: number;
  paused: boolean;
  itemLabel: string;
  size?: number;
}) {
  const hourDeg = ((elapsedMs / 3_600_000) % 1) * 360;
  const secDeg = ((elapsedMs / 1000) % 60) * 6;
  const c = size / 2;
  const k = size / 264;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={paused ? "opacity-40" : ""}
      role="img"
      aria-label="Elapsed session time"
    >
      <circle cx={c} cy={c} r={c - 3 * k} className="fill-paper-warmth stroke-ink-black" strokeWidth={6 * k} />

      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg, i) => {
        const outer = polarPoint(c, c, c - 16 * k, deg);
        const inner = polarPoint(c, c, c - 26 * k, deg);
        return (
          <line
            key={deg}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            strokeWidth={3.5 * k}
            strokeLinecap="round"
            className={PALETTE[i % PALETTE.length]}
          />
        );
      })}

      {[0, 90, 180, 270].map((start, i) => (
        <path
          key={start}
          d={arcPath(c, c, c * 0.42, start + 12, start + 62)}
          fill="none"
          strokeWidth={5 * k}
          strokeLinecap="round"
          className={ARC_COLORS[i % ARC_COLORS.length]}
        />
      ))}

      {/* Cadence brand mark, given a friendly pair of eyes and a smile */}
      <g transform={`translate(${c} ${c - 6 * k})`} className="stroke-ink-black" fill="none" strokeLinecap="round">
        <circle r={16 * k} strokeWidth={4.5 * k} pathLength={100} strokeDasharray="75 25" strokeDashoffset={-12.5} />
        <circle cx={-5.5 * k} cy={-3 * k} r={1.6 * k} fill="currentColor" stroke="none" />
        <circle cx={5.5 * k} cy={-3 * k} r={1.6 * k} fill="currentColor" stroke="none" />
        <path d={`M ${-4.5 * k} ${4 * k} Q 0 ${7.5 * k} ${4.5 * k} ${4 * k}`} strokeWidth={1.4 * k} />
      </g>

      <line
        x1={c}
        y1={c + 8 * k}
        x2={c}
        y2={c - (c - 60 * k)}
        strokeWidth={2.6 * k}
        strokeLinecap="round"
        className="stroke-ink-black"
        transform={`rotate(${hourDeg} ${c} ${c})`}
      />
      <line
        x1={c}
        y1={c + 4 * k}
        x2={c}
        y2={c - (c - 40 * k)}
        strokeWidth={1.2 * k}
        strokeLinecap="round"
        className="stroke-coral"
        transform={`rotate(${secDeg} ${c} ${c})`}
      />
      <circle cx={c} cy={c} r={3 * k} className="fill-ink-black" />

      {/* Doodle marks: plant + peeking cat */}
      <g transform={`translate(${c - 34 * k} ${c + 58 * k})`} className="stroke-ink-black" fill="none" strokeWidth={1.6 * k} strokeLinecap="round" strokeLinejoin="round">
        <rect x={-9 * k} y={4 * k} width={18 * k} height={13 * k} rx={2 * k} />
        <path d={`M 0 ${4 * k} Q ${-2 * k} ${-8 * k} 0 ${-14 * k} Q ${2 * k} ${-8 * k} 0 ${4 * k}`} />
        <path d={`M 0 ${-2 * k} Q ${-9 * k} ${-6 * k} ${-8 * k} ${-16 * k}`} />
        <path d={`M 0 ${-2 * k} Q ${9 * k} ${-6 * k} ${8 * k} ${-16 * k}`} />
        <line x1={-14 * k} y1={17 * k} x2={14 * k} y2={17 * k} />
      </g>
      <g transform={`translate(${c + 30 * k} ${c + 62 * k})`} className="stroke-ink-black" fill="none" strokeWidth={1.6 * k} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${-16 * k} ${8 * k} Q ${-16 * k} ${-10 * k} 0 ${-10 * k} Q ${16 * k} ${-10 * k} ${16 * k} ${8 * k}`} />
        <path d={`M ${-11 * k} ${-9 * k} L ${-14 * k} ${-16 * k} L ${-6 * k} ${-11 * k} Z`} />
        <path d={`M ${11 * k} ${-9 * k} L ${14 * k} ${-16 * k} L ${6 * k} ${-11 * k} Z`} />
        <circle cx={-5 * k} cy={-2 * k} r={0.9 * k} fill="currentColor" stroke="none" />
        <circle cx={5 * k} cy={-2 * k} r={0.9 * k} fill="currentColor" stroke="none" />
        <path d={`M ${-2 * k} ${2 * k} Q 0 ${4 * k} ${2 * k} ${2 * k}`} />
        <line x1={-20 * k} y1={9 * k} x2={20 * k} y2={9 * k} />
      </g>

      <text x={c} y={c + 96 * k} textAnchor="middle" className="fill-ink-black/60 font-sans font-medium" style={{ fontSize: 11 * k }}>
        {itemLabel}
      </text>
    </svg>
  );
}

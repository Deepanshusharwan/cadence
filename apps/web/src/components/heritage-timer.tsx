// A classic navy-and-gold dress-watch face: Roman numerals, a sunburst
// dial texture, gold hands, and a small date-style window for the elapsed
// readout. Literal navy/gold colors -- a formal watch face, not tied to
// the app's light/dark theme.

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Traditional watchmaking convention: IIII rather than IV at 4 o'clock,
// for visual symmetry opposite VIII.
const ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

export function HeritageTimer({
  elapsedMs,
  paused,
  itemLabel,
  timeLabel,
  size = 264,
}: {
  elapsedMs: number;
  paused: boolean;
  itemLabel: string;
  timeLabel: string;
  size?: number;
}) {
  const hourDeg = ((elapsedMs / 3_600_000) % 1) * 360;
  const minDeg = ((elapsedMs / 60_000) % 1) * 360;
  const c = size / 2;
  const k = size / 264;
  const gold = "#D4AF37";
  const navy = "#0B1230";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={paused ? "opacity-40" : ""}
      role="img"
      aria-label="Elapsed session time"
    >
      <circle cx={c} cy={c} r={c - 1 * k} fill="#1A1A1A" />
      <circle cx={c} cy={c} r={c - 5 * k} fill={navy} stroke={gold} strokeWidth={1 * k} />

      {/* Sunburst texture */}
      {Array.from({ length: 72 }, (_, i) => i * 5).map((deg) => {
        const outer = polarPoint(c, c, c - 8 * k, deg);
        return <line key={deg} x1={c} y1={c} x2={outer.x} y2={outer.y} stroke={gold} strokeWidth={0.4 * k} opacity={0.08} />;
      })}

      {Array.from({ length: 60 }, (_, i) => i * 6).map((deg) => {
        const major = deg % 30 === 0;
        const outer = polarPoint(c, c, c - 12 * k, deg);
        const inner = polarPoint(c, c, c - (major ? 20 : 16) * k, deg);
        return (
          <line
            key={deg}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={gold}
            strokeWidth={(major ? 1.5 : 0.6) * k}
            opacity={major ? 0.9 : 0.4}
          />
        );
      })}

      {ROMAN.map((num, i) => {
        const pos = polarPoint(c, c, c - 36 * k, i * 30);
        return (
          <text
            key={num}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-serif"
            style={{ fontSize: 13 * k, fill: gold }}
          >
            {num}
          </text>
        );
      })}

      <text
        x={c}
        y={c - 60 * k}
        textAnchor="middle"
        className="font-sans font-medium"
        style={{ fontSize: 8 * k, letterSpacing: `${2 * k}px`, fill: gold }}
      >
        CADENCE
      </text>

      {/* Date-style window, 3 o'clock */}
      <g transform={`translate(${c + 58 * k} ${c})`}>
        <rect x={-20 * k} y={-9 * k} width={40 * k} height={18 * k} fill="#050814" stroke={gold} strokeWidth={0.8 * k} rx={1 * k} />
        <text textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9 * k, fill: gold, fontFamily: "monospace" }}>
          {timeLabel}
        </text>
      </g>

      <path d="M 0 -3 Q 3 0 0 3 Q -3 0 0 -3 Z" transform={`translate(${c} ${c + 62 * k}) scale(${1.6 * k})`} fill={gold} opacity={0.7} />

      <line
        x1={c}
        y1={c + 6 * k}
        x2={c}
        y2={c - (c - 68 * k)}
        strokeWidth={1.6 * k}
        strokeLinecap="round"
        stroke={gold}
        transform={`rotate(${minDeg} ${c} ${c})`}
      />
      <line
        x1={c}
        y1={c + 5 * k}
        x2={c}
        y2={c - (c - 88 * k)}
        strokeWidth={2.4 * k}
        strokeLinecap="round"
        stroke={gold}
        transform={`rotate(${hourDeg} ${c} ${c})`}
      />
      <circle cx={c} cy={c} r={3 * k} fill={gold} />

      <text x={c} y={c + 38 * k} textAnchor="middle" className="font-serif" style={{ fontSize: 10 * k, fill: gold, opacity: 0.85 }}>
        {itemLabel}
      </text>
    </svg>
  );
}

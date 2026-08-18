// A parchment-styled sundial face: a sun mark at the center, an ivy vine
// trailing the hour positions, and a tapered shadow-hand -- purely
// decorative/aesthetic, using literal warm-paper colors rather than the
// app's theme tokens (like a physical, aged object wouldn't recolor for
// dark mode).

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const ROMAN_LIKE = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));

export function SundialTimer({
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
  const c = size / 2;
  const k = size / 264;
  const gradId = "sundial-parchment";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={paused ? "opacity-40" : ""}
      role="img"
      aria-label="Elapsed session time"
    >
      <defs>
        <radialGradient id={gradId} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#F3E7C9" />
          <stop offset="70%" stopColor="#E6D3A3" />
          <stop offset="100%" stopColor="#D4BD86" />
        </radialGradient>
      </defs>

      <circle cx={c} cy={c} r={c - 2 * k} fill={`url(#${gradId})`} stroke="#8A7548" strokeWidth={2 * k} />

      {/* Age spots, purely decorative */}
      {[
        [0.3, 0.28, 6],
        [0.7, 0.62, 8],
        [0.22, 0.72, 5],
        [0.78, 0.25, 5],
      ].map(([fx, fy, r], i) => (
        <circle key={i} cx={fx * size} cy={fy * size} r={r * k} fill="#8A7548" opacity={0.08} />
      ))}

      {/* Vine: dotted circular path with small leaves */}
      <circle
        cx={c}
        cy={c}
        r={c - 34 * k}
        fill="none"
        stroke="#7A3B2E"
        strokeWidth={2 * k}
        strokeLinecap="round"
        strokeDasharray={`${1.5 * k} ${6 * k}`}
        opacity={0.55}
      />
      {Array.from({ length: 12 }, (_, i) => i * 30 + 15).map((deg) => {
        const pos = polarPoint(c, c, c - 34 * k, deg);
        return (
          <ellipse
            key={deg}
            cx={pos.x}
            cy={pos.y}
            rx={5 * k}
            ry={2.5 * k}
            fill="#5C7A3F"
            opacity={0.75}
            transform={`rotate(${deg + 90} ${pos.x} ${pos.y})`}
          />
        );
      })}

      {ROMAN_LIKE.map((num, i) => {
        const pos = polarPoint(c, c, c - 20 * k, i * 30);
        return (
          <text
            key={num}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-serif"
            style={{ fontSize: 13 * k, fill: "#5C4A2A" }}
          >
            {num}
          </text>
        );
      })}

      {/* Sun face, center */}
      <g transform={`translate(${c} ${c - 22 * k})`}>
        {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
          const outer = polarPoint(0, 0, 15 * k, deg);
          const inner = polarPoint(0, 0, 10 * k, deg);
          return (
            <line
              key={deg}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="#B8860B"
              strokeWidth={1.2 * k}
              strokeLinecap="round"
            />
          );
        })}
        <circle r={9 * k} fill="#E8B84B" stroke="#B8860B" strokeWidth={1 * k} />
        <circle cx={-3 * k} cy={-1.5 * k} r={0.9 * k} fill="#5C4A2A" />
        <circle cx={3 * k} cy={-1.5 * k} r={0.9 * k} fill="#5C4A2A" />
        <path
          d={`M ${-3 * k} ${2.5 * k} Q 0 ${5 * k} ${3 * k} ${2.5 * k}`}
          fill="none"
          stroke="#5C4A2A"
          strokeWidth={1 * k}
          strokeLinecap="round"
        />
      </g>

      {/* Tapered shadow hand */}
      <polygon
        points={`${c - 2 * k},${c} ${c + 2 * k},${c} ${c + 0.4 * k},${c - (c - 46 * k)}`}
        fill="#4A3B22"
        opacity={0.8}
        transform={`rotate(${hourDeg} ${c} ${c})`}
      />
      <circle cx={c} cy={c} r={3.5 * k} fill="#4A3B22" />

      <text x={c} y={c + 46 * k} textAnchor="middle" className="font-serif font-semibold" style={{ fontSize: 20 * k, fill: "#4A3B22" }}>
        {timeLabel}
      </text>
      <text x={c} y={c + 66 * k} textAnchor="middle" className="font-serif" style={{ fontSize: 12 * k, fill: "#5C7A3F" }}>
        {"❦ "}
        {itemLabel}
        {" ❦"}
      </text>
    </svg>
  );
}

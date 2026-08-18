// A minimalist "retro smartwatch" face -- muted dusty-rose case, a single
// thin hand sweeping once per hour, and a small digital readout, styled
// after vintage Wear OS watch faces. Deliberately uses fixed literal colors
// rather than the app's theme tokens, the same way a photographed physical
// device wouldn't recolor itself for dark mode.

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function RetroTimer({
  elapsedMs,
  paused,
  itemLabel,
  timeLabel,
  size = 240,
}: {
  elapsedMs: number;
  paused: boolean;
  itemLabel: string;
  timeLabel: string;
  size?: number;
}) {
  const hourDeg = ((elapsedMs / 3_600_000) % 1) * 360;
  const c = size / 2;
  const nubW = size * 0.05;
  const nubH = size * 0.14;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={paused ? "opacity-40" : ""}
      role="img"
      aria-label="Elapsed session time"
    >
      {/* Case nubs (crown/button) */}
      <rect x={-nubW / 2} y={c - nubH / 2} width={nubW} height={nubH} rx={nubW / 3} fill="#9C9490" />
      <rect
        x={size - nubW / 2}
        y={c - nubH / 2}
        width={nubW}
        height={nubH}
        rx={nubW / 3}
        fill="#9C9490"
      />

      {/* Case + face */}
      <circle cx={c} cy={c} r={c - 2} fill="#A69D97" />
      <circle cx={c} cy={c} r={c - 8} fill="#DCCFC8" stroke="#C7B8B1" strokeWidth={1} />

      {/* Cardinal ticks only -- minimal, retro */}
      {[0, 90, 180, 270].map((deg) => {
        const outer = polarPoint(c, c, c - 16, deg);
        const inner = polarPoint(c, c, c - 22, deg);
        return (
          <line
            key={deg}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            strokeWidth={2}
            stroke="#7A716C"
            strokeLinecap="round"
          />
        );
      })}

      {/* Decorative accent dot, ~2 o'clock */}
      <circle cx={c + c * 0.5} cy={c - c * 0.42} r={size * 0.02} className="fill-accent" />

      {/* Digital readout */}
      <text
        x={c}
        y={c - size * 0.16}
        textAnchor="middle"
        style={{ fontSize: size * 0.09, fill: "#3A332F", fontFamily: "var(--font-notioninter, sans-serif)" }}
      >
        {timeLabel}
      </text>

      {/* Hand */}
      <line
        x1={c}
        y1={c}
        x2={c}
        y2={c - (c - 30)}
        strokeWidth={2}
        strokeLinecap="round"
        stroke="#2E2A28"
        transform={`rotate(${hourDeg} ${c} ${c})`}
      />
      <circle cx={c} cy={c} r={3} fill="#2E2A28" />

      {/* Item label */}
      <text
        x={c}
        y={c + size * 0.28}
        textAnchor="middle"
        style={{ fontSize: size * 0.055, fill: "#5C534E", fontFamily: "var(--font-notioninter, sans-serif)" }}
      >
        {itemLabel}
      </text>
    </svg>
  );
}

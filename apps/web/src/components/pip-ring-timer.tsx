// A minimalist digital-first face: a ring of dot "pips" fills in as the
// current hour elapses, framing a big digital readout -- no hands at all.

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const PIP_COUNT = 32;

export function PipRingTimer({
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
  const c = size / 2;
  const k = size / 264;
  const hourFrac = (elapsedMs / 3_600_000) % 1;
  const filled = Math.round(hourFrac * PIP_COUNT);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={paused ? "opacity-40" : ""}
      role="img"
      aria-label="Elapsed session time"
    >
      <circle cx={c} cy={c} r={c - 2 * k} className="fill-paper-warmth stroke-ink-black/12" strokeWidth={1.5 * k} />

      {Array.from({ length: PIP_COUNT }, (_, i) => i).map((i) => {
        const deg = (i / PIP_COUNT) * 360;
        const pos = polarPoint(c, c, c - 20 * k, deg);
        const isFilled = i < filled;
        return (
          <circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r={isFilled ? 3.2 * k : 2.6 * k}
            className={isFilled ? "fill-ink-black" : "fill-none stroke-ink-black/30"}
            strokeWidth={isFilled ? 0 : 1 * k}
          />
        );
      })}

      <text
        x={c}
        y={c - 4 * k}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink-black font-sans font-semibold"
        style={{ fontSize: 26 * k, letterSpacing: `${-0.5 * k}px` }}
      >
        {timeLabel}
      </text>
      <circle cx={c} cy={c + 22 * k} r={1.4 * k} className="fill-ink-black/40" />
      <text
        x={c}
        y={c + 38 * k}
        textAnchor="middle"
        className="fill-ink-black/70 font-sans font-medium"
        style={{ fontSize: 13 * k }}
      >
        {itemLabel}
      </text>
    </svg>
  );
}

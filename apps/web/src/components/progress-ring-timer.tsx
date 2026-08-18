// A weekly-progress watch face: a dotted ring shows how far into this
// week's target the current item is (filled dots = done, grey = remaining),
// with a marker circle at the current position -- literal progress, not
// just elapsed time.

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const DOT_COUNT = 40;

export function ProgressRingTimer({
  elapsedMs,
  paused,
  itemLabel,
  timeLabel,
  progressPct,
  size = 264,
}: {
  elapsedMs: number;
  paused: boolean;
  itemLabel: string;
  timeLabel: string;
  progressPct: number;
  size?: number;
}) {
  const hourDeg = ((elapsedMs / 3_600_000) % 1) * 360;
  const c = size / 2;
  const k = size / 264;
  const filledDots = Math.round((Math.min(100, Math.max(0, progressPct)) / 100) * DOT_COUNT);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={paused ? "opacity-40" : ""}
      role="img"
      aria-label="Elapsed session time and weekly progress"
    >
      <circle cx={c} cy={c} r={c - 2 * k} className="fill-paper-warmth stroke-ink-black/15" strokeWidth={2 * k} />

      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
        const major = deg % 90 === 0;
        const outer = polarPoint(c, c, c - 10 * k, deg);
        const inner = polarPoint(c, c, c - (major ? 20 : 15) * k, deg);
        return (
          <line
            key={deg}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            strokeWidth={(major ? 2 : 1) * k}
            className="stroke-ink-black/40"
          />
        );
      })}

      {[0, 90, 180, 270].map((deg) => {
        const pos = polarPoint(c, c, c - 34 * k, deg);
        return (
          <text
            key={deg}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-ink-black/55 font-sans font-medium"
            style={{ fontSize: 12 * k }}
          >
            {deg === 0 ? 12 : deg / 30}
          </text>
        );
      })}

      {/* Progress dot ring */}
      {Array.from({ length: DOT_COUNT }, (_, i) => i).map((i) => {
        const deg = (i / DOT_COUNT) * 360;
        const pos = polarPoint(c, c, c * 0.44, deg);
        const filled = i < filledDots;
        return (
          <circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r={filled ? 2.4 * k : 1.6 * k}
            className={filled ? "fill-signal-blue" : "fill-ink-black/15"}
          />
        );
      })}
      {filledDots > 0 && filledDots < DOT_COUNT ? (
        (() => {
          const pos = polarPoint(c, c, c * 0.44, (filledDots / DOT_COUNT) * 360);
          return (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={4.5 * k}
              className="fill-none stroke-signal-blue"
              strokeWidth={1.5 * k}
            />
          );
        })()
      ) : null}

      {/* Small cat-doodle mark, centered */}
      <g transform={`translate(${c} ${c - 30 * k})`} className="stroke-ink-black/70" fill="none" strokeWidth={1.5 * k} strokeLinecap="round">
        <path d={`M ${-12 * k} ${2 * k} Q ${-12 * k} ${-10 * k} ${0} ${-10 * k} Q ${12 * k} ${-10 * k} ${12 * k} ${2 * k}`} />
        <circle cx={-4.5 * k} cy={-3 * k} r={0.9 * k} fill="currentColor" stroke="none" />
        <circle cx={4.5 * k} cy={-3 * k} r={0.9 * k} fill="currentColor" stroke="none" />
      </g>

      <line
        x1={c}
        y1={c}
        x2={c}
        y2={c - (c - 40 * k)}
        strokeWidth={2.5 * k}
        strokeLinecap="round"
        className="stroke-ink-black"
        transform={`rotate(${hourDeg} ${c} ${c})`}
      />
      <circle cx={c} cy={c} r={4 * k} className="fill-ink-black" />

      <text
        x={c}
        y={c + 42 * k}
        textAnchor="middle"
        className="fill-ink-black font-sans font-semibold"
        style={{ fontSize: 20 * k }}
      >
        {timeLabel}
      </text>
      <text
        x={c}
        y={c + 62 * k}
        textAnchor="middle"
        className="fill-signal-blue font-serif"
        style={{ fontSize: 12 * k }}
      >
        {itemLabel}
      </text>
    </svg>
  );
}

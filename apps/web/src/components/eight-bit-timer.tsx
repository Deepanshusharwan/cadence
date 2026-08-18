// A retro LCD/handheld-console face: olive screen, blocky monospace digits,
// a day/date row, and a streak flame -- literal device colors, not the
// app's theme tokens (an LCD screen doesn't recolor for dark mode either).

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function EightBitTimer({
  paused,
  itemLabel,
  timeLabel,
  streak,
  size = 264,
}: {
  paused: boolean;
  itemLabel: string;
  timeLabel: string;
  streak: number;
  size?: number;
}) {
  const c = size / 2;
  const k = size / 264;
  const now = new Date();
  const dayLabel = WEEKDAYS[now.getDay()];
  const dateLabel = `${now.getMonth() + 1}/${now.getDate()}`;
  const gridId = "eight-bit-grid";

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
        <pattern id={gridId} width={6 * k} height={6 * k} patternUnits="userSpaceOnUse">
          <rect width={6 * k} height={6 * k} fill="#A8B48A" />
          <rect width={3 * k} height={3 * k} fill="#9FAC80" />
        </pattern>
      </defs>

      <circle cx={c} cy={c} r={c - 2 * k} fill="#8A9670" stroke="#3A3F2E" strokeWidth={3 * k} />
      <circle cx={c} cy={c} r={c - 10 * k} fill={`url(#${gridId})`} />
      <circle cx={c} cy={c} r={c - 10 * k} fill="#8A9670" opacity={0.25} />

      <text x={size * 0.24} y={size * 0.28} className="font-mono font-bold" style={{ fontSize: 13 * k, fill: "#2E3320" }}>
        {dayLabel}
      </text>
      <text
        x={size * 0.76}
        y={size * 0.28}
        textAnchor="end"
        className="font-mono font-bold"
        style={{ fontSize: 13 * k, fill: "#2E3320" }}
      >
        {dateLabel}
      </text>

      {/* Pixel flame + streak */}
      <g transform={`translate(${c} ${c - 38 * k})`}>
        <path
          d={`M 0 ${-8 * k} L ${5 * k} ${-1 * k} L ${3 * k} ${3 * k} L ${-3 * k} ${3 * k} L ${-5 * k} ${-1 * k} Z`}
          fill="#C4522E"
        />
        <text x={0} y={16 * k} textAnchor="middle" className="font-mono font-bold" style={{ fontSize: 11 * k, fill: "#2E3320" }}>
          {streak}
        </text>
      </g>

      <text
        x={c}
        y={c + 6 * k}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono font-bold"
        style={{ fontSize: 28 * k, letterSpacing: `${1 * k}px`, fill: "#2E3320" }}
      >
        {timeLabel}
      </text>

      <text
        x={c}
        y={c + 46 * k}
        textAnchor="middle"
        className="font-mono"
        style={{ fontSize: 9 * k, letterSpacing: `${2 * k}px`, fill: "#4A5238" }}
      >
        {"♦ ♦ ♦ ★ ♦ ♦ ♦"}
      </text>
      <text
        x={c}
        y={c + 64 * k}
        textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: 13 * k, fill: "#2E3320" }}
      >
        {itemLabel.toUpperCase()}
      </text>
    </svg>
  );
}

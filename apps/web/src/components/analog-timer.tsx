// A chronograph-style watch face for the running timer: the big dial sweeps
// smoothly once per hour (how far into the current hour this session is),
// while two smaller sub-dials track seconds (ticks once per second, like a
// real quartz movement) and minutes (a decorative to-and-fro sweep across a
// 180 degree arc, completing one traversal per second) -- giving the dial a
// "live" feel beyond just the digital readout underneath it.
//
// All offsets are expressed relative to `k`, a scale factor derived from the
// baseline 264px design, so the face stays proportioned at other sizes (the
// fullscreen toggle renders it much larger).

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function Hand({
  cx,
  cy,
  length,
  tail = 0,
  deg,
  width,
  className,
}: {
  cx: number;
  cy: number;
  length: number;
  tail?: number;
  deg: number;
  width: number;
  className: string;
}) {
  return (
    <line
      x1={cx}
      y1={cy + tail}
      x2={cx}
      y2={cy - length}
      strokeWidth={width}
      strokeLinecap="round"
      className={className}
      transform={`rotate(${deg} ${cx} ${cy})`}
    />
  );
}

function SubDial({
  cx,
  cy,
  r,
  k,
  deg,
  swing,
  label,
  handClassName,
}: {
  cx: number;
  cy: number;
  r: number;
  k: number;
  deg?: number;
  swing?: boolean;
  label: string;
  handClassName: string;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="fill-paper-warmth stroke-ink-black/20" strokeWidth={k} />
      <circle cx={cx} cy={cy} r={r - 3 * k} className="fill-none stroke-ink-black/10" strokeWidth={0.5 * k} />
      {Array.from({ length: 12 }, (_, i) => i * 30).map((tickDeg) => {
        const major = tickDeg % 90 === 0;
        const outer = polarPoint(cx, cy, r - 3 * k, tickDeg);
        const inner = polarPoint(cx, cy, r - (major ? 8 : 5.5) * k, tickDeg);
        return (
          <line
            key={tickDeg}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            strokeWidth={(major ? 1.25 : 0.75) * k}
            className="stroke-ink-black/35"
          />
        );
      })}
      <text
        x={cx}
        y={cy + r + 11 * k}
        textAnchor="middle"
        className="fill-ink-black/35 font-sans"
        style={{ fontSize: 7 * k, letterSpacing: `${0.5 * k}px` }}
      >
        {label}
      </text>
      {swing ? (
        <line
          x1={cx}
          y1={cy + 4 * k}
          x2={cx}
          y2={cy - (r - 7 * k)}
          strokeWidth={1.5 * k}
          strokeLinecap="round"
          className={handClassName}
          style={{
            transformBox: "view-box",
            transformOrigin: `${cx}px ${cy}px`,
            animation: "cadence-analog-swing 1s ease-in-out infinite alternate",
          }}
        />
      ) : (
        <Hand cx={cx} cy={cy} length={r - 7 * k} tail={4 * k} deg={deg ?? 0} width={1.5 * k} className={handClassName} />
      )}
      <circle cx={cx} cy={cy} r={1.75 * k} className="fill-ink-black/50" />
    </g>
  );
}

const BASELINE = 264;

export function AnalogTimer({
  elapsedMs,
  paused,
  size = BASELINE,
}: {
  elapsedMs: number;
  paused: boolean;
  size?: number;
}) {
  const hourDeg = ((elapsedMs / 3_600_000) % 1) * 360;
  const secDeg = (Math.floor(elapsedMs / 1000) % 60) * 6;

  const c = size / 2;
  const k = size / BASELINE;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={paused ? "opacity-40" : ""}
      role="img"
      aria-label="Elapsed session time"
    >
      {/* Bezel */}
      <circle cx={c} cy={c} r={c - 1 * k} className="fill-none stroke-ink-black/25" strokeWidth={2 * k} />
      <circle cx={c} cy={c} r={c - 5 * k} className="fill-pure-white stroke-ink-black/12" strokeWidth={1 * k} />
      <circle cx={c} cy={c} r={c - 9 * k} className="fill-none stroke-ink-black/8" strokeWidth={0.5 * k} />

      {/* 60 minute ticks, bold every 5th (hour positions) */}
      {Array.from({ length: 60 }, (_, i) => i * 6).map((deg) => {
        const major = deg % 30 === 0;
        const outer = polarPoint(c, c, c - 14 * k, deg);
        const inner = polarPoint(c, c, c - (major ? 26 : 19) * k, deg);
        return (
          <line
            key={deg}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            strokeWidth={(major ? 2 : 0.75) * k}
            className={major ? "stroke-ink-black/50" : "stroke-ink-black/25"}
          />
        );
      })}

      {/* Hour numerals -- 3 and 9 are skipped, real-watch style, since the
          sub-dials sit in those spots */}
      {Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
        .filter((num) => num !== 3 && num !== 9)
        .map((num) => {
          const i = num === 12 ? 0 : num;
          const pos = polarPoint(c, c, c - 40 * k, i * 30);
          return (
            <text
              key={num}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-ink-black/60 font-serif font-medium"
              style={{ fontSize: 12 * k }}
            >
              {num}
            </text>
          );
        })}

      <text
        x={c}
        y={c - 66 * k}
        textAnchor="middle"
        className="fill-ink-black/40 font-sans font-medium"
        style={{ fontSize: 8 * k, letterSpacing: `${1.5 * k}px` }}
      >
        CADENCE
      </text>

      <SubDial cx={c - 66 * k} cy={c} r={32 * k} k={k} deg={secDeg} label="SEC" handClassName="stroke-coral" />
      <SubDial cx={c + 66 * k} cy={c} r={32 * k} k={k} swing label="MIN" handClassName="stroke-signal-blue" />

      <Hand cx={c} cy={c} length={c - 58 * k} tail={10 * k} deg={hourDeg} width={4.5 * k} className="stroke-accent" />
      <circle cx={c} cy={c} r={5.5 * k} className="fill-accent" />
      <circle cx={c} cy={c} r={2 * k} className="fill-pure-white" />

      <style>{`
        @keyframes cadence-analog-swing {
          from { transform: rotate(-90deg); }
          to { transform: rotate(90deg); }
        }
      `}</style>
    </svg>
  );
}

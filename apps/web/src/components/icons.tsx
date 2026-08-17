import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

/* -------------------------------------------------------------------------- */
/* Category icons                                                             */
/* -------------------------------------------------------------------------- */

export function BookIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 4.5v17" />
      <path d="M8.5 6H15" />
      <path d="M8.5 9H16" />
    </svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 17l5-5 3.5 3.5L20 8" />
      <path d="M15 8h5v5" />
    </svg>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 8v8" />
      <path d="M17 8v8" />
      <path d="M4.5 10v4" />
      <path d="M19.5 10v4" />
      <path d="M7 12h10" />
      <path d="M3.5 10v4" />
      <path d="M20.5 10v4" />
    </svg>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 18h6" />
      <path d="M9.5 21h5" />
      <path d="M8.5 14.5A6 6 0 1 1 15.5 14" />
      <path d="M10 17v-2.5a4 4 0 0 1-2-3.5" />
      <path d="M14 17v-2.5a4 4 0 0 0 2-3.5" />
    </svg>
  );
}

export function GlassesIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="7" cy="13" r="3.5" />
      <circle cx="17" cy="13" r="3.5" />
      <path d="M10.5 13h3" />
      <path d="M3.5 12.5 2.5 10" />
      <path d="M20.5 12.5 21.5 10" />
    </svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 6.5A2 2 0 0 1 5 4.5h4l2 2h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3.5 9h17" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Client / platform icons                                                    */
/* -------------------------------------------------------------------------- */

export function BrowserIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
      <path d="M3 8.5h18" />
      <path d="M6 6.5h.01M9 6.5h.01" />
    </svg>
  );
}

export function SmartphoneIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick-action icons                                                         */
/* -------------------------------------------------------------------------- */

export function PlayIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function CalendarMinusIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
      <path d="M9 15h6" />
    </svg>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 8h13M13.5 4.5 17 8l-3.5 3.5" />
      <path d="M20 16H7M10.5 12.5 7 16l3.5 3.5" />
    </svg>
  );
}

export function BarChartIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 20l.9-3.6L16 5.3a1.5 1.5 0 0 1 2.1 0l.6.6a1.5 1.5 0 0 1 0 2.1L7.6 19.1 4 20Z" />
      <path d="M14.5 6.8 17.2 9.5" />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 2.5c1 3 .3 4.6-1 6.2-1.5 1.8-2.5 3.4-2.5 5.3a5.5 5.5 0 0 0 11 0c0-2.4-1.1-3.8-2-5-.2 1.6-.9 2.4-1.7 2.9.3-2.4-.5-4-2-6.2-.4 1-1 1.6-1.8 2.1.3-2 .3-3.4 0-5.3Z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Decorative marks                                                           */
/* -------------------------------------------------------------------------- */

export function SparkleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2c.6 3.7 2.3 5.4 6 6-3.7.6-5.4 2.3-6 6-.6-3.7-2.3-5.4-6-6 3.7-.6 5.4-2.3 6-6Z" />
      <path d="M19 15c.3 1.8 1.1 2.6 2.9 2.9-1.8.3-2.6 1.1-2.9 2.9-.3-1.8-1.1-2.6-2.9-2.9 1.8-.3 2.6-1.1 2.9-2.9Z" />
    </svg>
  );
}

export function SquiggleArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 90 50" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden {...props}>
      <path d="M4 8c14 22 38 32 62 30" />
      <path d="M56 30c4 3 8 6 10 8-1-4-1-9 0-13" />
    </svg>
  );
}

import Image from "next/image";

// Illustrated character marks — see apps/web/public/marks/README.md for
// provenance and the approval criteria used to pick this set. Shared
// between the landing page (decorative) and the app (avatar picker).
export const MARKS = {
  signpost: "/marks/signpost.png",
  folder: "/marks/folder.png",
  profileMan: "/marks/profile-man.png",
  cat: "/marks/cat.png",
  pinkHair: "/marks/pink-hair.png",
  beanie: "/marks/beanie.png",
  dog: "/marks/dog.png",
} as const;

export type MarkKey = keyof typeof MARKS;

// A larger avatar set reserved for Pro subscribers — kept as a separate
// export (not merged into MARKS) so the free/paid split lives in the data
// itself. Picker UIs (setup, dashboard/settings) only offer these when
// store.state.profile.plan === "pro"; use markSrc() below, not MARKS[key]
// directly, wherever a *stored* avatar value needs resolving back to an
// image, since that value may come from either set regardless of the
// viewer's current plan (a Pro user who gets downgraded still has a
// PRO_MARKS avatar saved until they change it).
export const PRO_MARKS = {
  headphones: "/marks/pro/headphones.png",
  curlyHeadphones: "/marks/pro/curly-headphones.png",
  sleepyCat: "/marks/pro/sleepy-cat.png",
  silverHairGlasses: "/marks/pro/silver-hair-glasses.png",
  pinkHairThinking: "/marks/pro/pink-hair-thinking.png",
  greenHeadband: "/marks/pro/green-headband.png",
  robotAstronaut: "/marks/pro/robot-astronaut.png",
  headphonesCoffee: "/marks/pro/headphones-coffee.png",
  beanieReader: "/marks/pro/beanie-reader.png",
  dinoSunglasses: "/marks/pro/dino-sunglasses.png",
  redCap: "/marks/pro/red-cap.png",
  duckCap: "/marks/pro/duck-cap.png",
  curlyDarkSkin: "/marks/pro/curly-dark-skin.png",
  shibaInu: "/marks/pro/shiba-inu.png",
  bobaTea: "/marks/pro/boba-tea.png",
  astronautPeace: "/marks/pro/astronaut-peace.png",
  frogNotepad: "/marks/pro/frog-notepad.png",
  coderGlasses: "/marks/pro/coder-glasses.png",
  ghostBlueCap: "/marks/pro/ghost-blue-cap.png",
  frogCrown: "/marks/pro/frog-crown.png",
  wizardWriting: "/marks/pro/wizard-writing.png",
  wizardWand: "/marks/pro/wizard-wand.png",
  beretBlonde: "/marks/pro/beret-blonde.png",
  dinoCostumeKid: "/marks/pro/dino-costume-kid.png",
  roundRobot: "/marks/pro/round-robot.png",
} as const;

export type ProMarkKey = keyof typeof PRO_MARKS;

const ALL_MARKS: Record<MarkKey | ProMarkKey, string> = { ...MARKS, ...PRO_MARKS };

/** Resolves a *stored* avatar key (from either MARKS or PRO_MARKS) to its image path. */
export function markSrc(key: MarkKey | ProMarkKey): string {
  return ALL_MARKS[key];
}

export function Mark({
  src,
  size = 48,
  className = "",
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

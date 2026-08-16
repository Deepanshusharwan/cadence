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
} as const;

export type MarkKey = keyof typeof MARKS;

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

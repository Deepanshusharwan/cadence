"use client";

import { useEffect, useState } from "react";

const WORDS = ["sustainable", "consistent", "balanced", "flexible", "realistic"];

export function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      key={WORDS[index]}
      className="animate-word-in inline-flex items-center rounded-full bg-marigold px-6 py-2 text-ink-black"
    >
      {WORDS[index]}
    </span>
  );
}

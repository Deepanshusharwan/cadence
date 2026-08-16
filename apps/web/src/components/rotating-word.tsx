"use client";

import { useEffect, useState } from "react";

// Warm/cool hues alternate so two similar colors never land back-to-back.
const WORDS = [
  { word: "sustainable", bg: "bg-marigold" },
  { word: "consistent", bg: "bg-denim" },
  { word: "balanced", bg: "bg-terracotta" },
  { word: "flexible", bg: "bg-sky-wash" },
  { word: "realistic", bg: "bg-orchid" },
];

export function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const current = WORDS[index];

  return (
    <span
      key={current.word}
      className={`animate-word-in inline-flex items-center rounded-full px-6 py-2 text-ink-black ${current.bg}`}
    >
      {current.word}
    </span>
  );
}

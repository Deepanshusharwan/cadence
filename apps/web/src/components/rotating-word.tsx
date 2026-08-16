"use client";

import { useEffect, useState } from "react";

const WORDS = [
  { word: "sustainable", bg: "bg-marigold", text: "text-ink-black" },
  { word: "consistent", bg: "bg-coral", text: "text-pure-white" },
  { word: "balanced", bg: "bg-sky-wash", text: "text-ink-black" },
  { word: "flexible", bg: "bg-signal-blue", text: "text-pure-white" },
  { word: "realistic", bg: "bg-mocha", text: "text-pure-white" },
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
      className={`animate-word-in inline-flex items-center rounded-full px-6 py-2 ${current.bg} ${current.text}`}
    >
      {current.word}
    </span>
  );
}

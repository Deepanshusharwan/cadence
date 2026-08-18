"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

// Applies the signed-in user's accent color (Settings, Plus-only) to
// <html data-accent="..."> once bootstrap loads it -- see globals.css's
// [data-accent="..."] blocks for how that repaints --color-accent.
// Unlike the light/dark theme script in layout.tsx, this can't run
// synchronously pre-paint: the value lives on the account (fetched over
// the network), not in localStorage, so a brief default-accent flash on
// first load is an accepted tradeoff.
export function AccentApplier() {
  const { state } = useStore();

  useEffect(() => {
    if (state.profile.accentColor && state.profile.accentColor !== "notion-blue") {
      document.documentElement.setAttribute("data-accent", state.profile.accentColor);
    } else {
      document.documentElement.removeAttribute("data-accent");
    }
  }, [state.profile.accentColor]);

  return null;
}

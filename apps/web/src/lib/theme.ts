// Light/dark/system mode -- deliberately a device-level preference (plain
// localStorage), not synced through the account like accentColor is. See
// globals.css's [data-theme] / prefers-color-scheme blocks for how the
// attribute this sets actually repaints the app.

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "cadence-theme";

// Light is the default until someone explicitly picks something else --
// "system" is still offered as a real choice in Settings, just not what a
// new visitor gets automatically (an OS/browser set to dark would
// otherwise silently flip the app dark before anyone chose that).
export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", mode);
  }
}

export function setStoredTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

// Runs synchronously in <head>, before first paint, so there's no flash of
// the wrong theme while React hydrates. Kept as a plain string (not a
// function serialized via toString()) so minification/bundling can't
// mangle the identifiers it depends on.
//
// Defaults to explicit "light" (not just leaving data-theme unset) when
// nothing is stored yet -- globals.css's dark-mode block only backs off
// when data-theme="light" is present, so a visitor whose OS/browser
// prefers dark would otherwise land on a dark app before ever choosing
// that. "system" stays a real, explicitly-stored choice that removes the
// attribute and genuinely follows the OS preference.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem("${STORAGE_KEY}");
    if (stored === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (stored !== "system") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

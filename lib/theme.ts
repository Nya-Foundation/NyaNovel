"use client";

/**
 * Theme application. Extracted from theme-controls so the command palette can drive the same
 * transition — two copies of this would be two chances for the DOM attribute, localStorage key,
 * and the `nya-theme-change` event (which AppToaster listens on) to drift apart.
 *
 * The inline no-flash script in app/layout.tsx reads the same two keys before first paint.
 */

export type Mode = "dark" | "light";

export const ACCENTS = [
  { key: "default", label: "Signal Coral", swatch: "#f35f52" },
  { key: "blue", label: "Signal Blue", swatch: "oklch(0.62 0.15 255)" },
  { key: "violet", label: "Violet", swatch: "oklch(0.6 0.17 292)" },
  { key: "emerald", label: "Emerald", swatch: "oklch(0.6 0.12 165)" },
  { key: "magenta", label: "Magenta", swatch: "oklch(0.62 0.18 350)" },
] as const;

export type AccentKey = (typeof ACCENTS)[number]["key"];

export function currentMode(): Mode {
  return (document.documentElement.getAttribute("data-mode") as Mode) || "dark";
}

export function currentAccent(): string {
  return document.documentElement.getAttribute("data-accent") || "default";
}

export function applyMode(next: Mode) {
  document.documentElement.setAttribute("data-mode", next);
  localStorage.setItem("nya-mode", next);
  window.dispatchEvent(new Event("nya-theme-change"));
}

export function applyAccent(next: string) {
  const d = document.documentElement;
  if (next === "default") {
    d.removeAttribute("data-accent");
    localStorage.removeItem("nya-accent");
  } else {
    d.setAttribute("data-accent", next);
    localStorage.setItem("nya-accent", next);
  }
  window.dispatchEvent(new Event("nya-theme-change"));
}

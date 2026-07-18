"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { focusRing } from "./ui/input";
import { cn } from "@/lib/utils";

type Mode = "dark" | "light";

const ACCENTS: { key: string; swatch: string }[] = [
  { key: "default", swatch: "oklch(0.62 0.15 255)" },
  { key: "violet", swatch: "oklch(0.6 0.17 292)" },
  { key: "emerald", swatch: "oklch(0.6 0.12 165)" },
  { key: "magenta", swatch: "oklch(0.62 0.18 350)" },
  { key: "coral", swatch: "oklch(0.64 0.17 35)" },
];

export function ThemeControls() {
  const [mode, setMode] = useState<Mode>("dark");
  const [accent, setAccent] = useState("default");

  useEffect(() => {
    // One-time sync from the DOM attributes the no-flash script set before hydration.
    const d = document.documentElement;
    /* eslint-disable react-hooks/set-state-in-effect */
    setMode((d.getAttribute("data-mode") as Mode) || "dark");
    setAccent(d.getAttribute("data-accent") || "default");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const applyMode = (m: Mode) => {
    document.documentElement.setAttribute("data-mode", m);
    localStorage.setItem("nya-mode", m);
    setMode(m);
  };

  const applyAccent = (a: string) => {
    const d = document.documentElement;
    if (a === "default") {
      d.removeAttribute("data-accent");
      localStorage.removeItem("nya-accent");
    } else {
      d.setAttribute("data-accent", a);
      localStorage.setItem("nya-accent", a);
    }
    setAccent(a);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {ACCENTS.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-label={`Accent ${a.key}`}
            onClick={() => applyAccent(a.key)}
            style={{ background: a.swatch }}
            className={cn(
              "size-4 rounded-full transition-transform duration-fast ease-out hover:scale-110",
              focusRing,
              "focus-visible:ring-offset-surface",
              accent === a.key ? "ring-2 ring-fg ring-offset-2 ring-offset-bg" : "opacity-70",
            )}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => applyMode(mode === "dark" ? "light" : "dark")}
        className={cn(
          "rounded-[8px] p-2 text-fg-2 transition-colors duration-instant hover:bg-surface-2 hover:text-fg",
          focusRing,
          "focus-visible:ring-offset-surface",
        )}
      >
        {mode === "dark" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
      </button>
    </div>
  );
}

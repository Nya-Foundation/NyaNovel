"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { focusRing } from "./ui/input";
import { cn } from "@/lib/utils";

type Mode = "dark" | "light";

const ACCENTS: { key: string; label: string; swatch: string }[] = [
  { key: "default", label: "Signal Coral", swatch: "#F35F52" },
  { key: "blue", label: "Signal Blue", swatch: "oklch(0.62 0.15 255)" },
  { key: "violet", label: "Violet", swatch: "oklch(0.6 0.17 292)" },
  { key: "emerald", label: "Emerald", swatch: "oklch(0.6 0.12 165)" },
  { key: "magenta", label: "Magenta", swatch: "oklch(0.62 0.18 350)" },
];

export function ThemeControls() {
  const [mode, setMode] = useState<Mode>("dark");
  const [accent, setAccent] = useState("default");

  useEffect(() => {
    // One-time sync from the DOM attributes the no-flash script set before hydration.
    const d = document.documentElement;
    /* eslint-disable react-hooks/set-state-in-effect */
    setMode((d.getAttribute("data-mode") as Mode) || "dark");
    const savedAccent = d.getAttribute("data-accent") || "default";
    // `coral` was formerly an optional near-match. Signal Coral is now the canonical default, so
    // migrate that saved preference to the exact brand value instead of showing two coral dots.
    if (savedAccent === "coral") {
      d.removeAttribute("data-accent");
      localStorage.removeItem("nya-accent");
      setAccent("default");
    } else {
      setAccent(savedAccent);
    }
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
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden items-center gap-1 md:flex">
        {ACCENTS.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-label={`Use ${a.label} accent`}
            title={a.label}
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
        title={mode === "dark" ? "Use light theme" : "Use dark theme"}
        onClick={() => applyMode(mode === "dark" ? "light" : "dark")}
        className={cn(
          "flex size-9 items-center justify-center rounded-[9px] text-fg-2 transition-colors duration-instant hover:bg-surface-2 hover:text-fg",
          focusRing,
          "focus-visible:ring-offset-surface",
        )}
      >
        {mode === "dark" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
      </button>
    </div>
  );
}

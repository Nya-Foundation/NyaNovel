"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { IconButton } from "./ui/icon-button";
import { focusRing } from "./ui/input";
import { cn } from "@/lib/utils";
import {
  ACCENTS,
  applyAccent as writeAccent,
  applyMode as writeMode,
  currentAccent,
  currentMode,
  type Mode,
} from "@/lib/theme";

export function ThemeControls() {
  const [mode, setMode] = useState<Mode>("dark");
  const [accent, setAccent] = useState("default");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = document.documentElement;
    /* eslint-disable react-hooks/set-state-in-effect */
    setMode((d.getAttribute("data-mode") as Mode) || "dark");
    const savedAccent = d.getAttribute("data-accent") || "default";
    if (savedAccent === "coral") {
      d.removeAttribute("data-accent");
      localStorage.removeItem("nya-accent");
      setAccent("default");
    } else {
      setAccent(savedAccent);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // The command palette can change mode/accent too. Without this the popover keeps rendering the
  // old pressed state until it remounts, so the two surfaces visibly disagree.
  useEffect(() => {
    const sync = () => {
      setMode(currentMode());
      setAccent(currentAccent());
    };
    window.addEventListener("nya-theme-change", sync);
    return () => window.removeEventListener("nya-theme-change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  // The shared helpers own the DOM/localStorage/event write; these wrappers only mirror the result
  // into local state so the popover's pressed states stay in sync.
  const applyMode = (next: Mode) => {
    writeMode(next);
    setMode(next);
  };

  const applyAccent = (next: string) => {
    writeAccent(next);
    setAccent(next);
  };

  const activeAccent = ACCENTS.find((item) => item.key === accent) ?? ACCENTS[0];

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        ref={triggerRef}
        label="Appearance"
        aria-expanded={open}
        aria-controls="appearance-menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(open && "bg-surface-2 text-fg")}
      >
        <Palette />
        <span
          aria-hidden
          className="absolute ml-4 mt-4 size-2.5 rounded-full border-2 border-surface"
          style={{ background: activeAccent.swatch }}
        />
      </IconButton>

      <div
        id="appearance-menu"
        inert={!open}
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-11 z-50 w-64 origin-top-right rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-pop)]",
          "transition-[opacity,transform] duration-fast ease-out",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.96] opacity-0",
        )}
      >
        <div className="mb-2.5">
          <p className="text-[13px] font-bold text-fg">Appearance</p>
          <p className="text-[11.5px] text-muted">Make the studio feel like yours.</p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-input)] bg-surface-2 p-1">
          {(["dark", "light"] as const).map((value) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => applyMode(value)}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-[7px] text-[12.5px] font-semibold transition-[background-color,color,box-shadow] duration-fast",
                  focusRing,
                  "focus-visible:ring-offset-1 focus-visible:ring-offset-surface-2",
                  active ? "bg-surface text-fg shadow-[var(--shadow-card)]" : "text-muted hover:text-fg",
                )}
              >
                {value === "dark" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                {value === "dark" ? "Dark" : "Light"}
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-2">Accent</p>
        <div className="grid grid-cols-5 gap-2">
          {ACCENTS.map((item) => {
            const active = accent === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-label={`Use ${item.label} accent`}
                aria-pressed={active}
                title={item.label}
                onClick={() => applyAccent(item.key)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-[9px] border transition-[transform,border-color,background-color] duration-fast hover:scale-105",
                  focusRing,
                  "focus-visible:ring-offset-surface",
                  active ? "border-fg bg-surface-2" : "border-border-soft hover:border-border",
                )}
              >
                <span className="flex size-6 items-center justify-center rounded-full" style={{ background: item.swatch }}>
                  {active && <Check className="size-3.5 text-white drop-shadow" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 truncate text-[11px] text-muted">{activeAccent.label}</p>
      </div>
    </div>
  );
}

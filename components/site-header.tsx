"use client";

import { useStore } from "@/lib/store";
import { ThemeControls } from "./theme-controls";
import { focusRing } from "./ui/input";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const connected = useStore((s) => Boolean(s.client));
  const setUI = useStore((s) => s.setUI);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-soft bg-surface px-4 shadow-[0_1px_0_0_var(--border-soft)]">
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-8 items-center justify-center rounded-[10px] text-[15px] font-black text-on-accent shadow-[var(--glow-accent)]"
          style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
          aria-hidden
        >
          N
        </span>
        <span className="font-[family-name:var(--font-display)] text-[20px] font-extrabold leading-none tracking-[-0.02em] text-fg">
          Nya<span className="text-accent">Novel</span>
        </span>
        <span className="mt-0.5 hidden text-[11px] text-muted sm:inline">part of latent.moe</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setUI({ showConnect: true })}
          className={cn(
            "flex items-center gap-2 rounded-[var(--radius-pill)] border border-border-soft bg-surface-2 px-3 py-1.5 text-[12.5px] font-medium text-fg-2 transition-colors duration-instant hover:bg-surface-3 hover:text-fg",
            focusRing,
            "focus-visible:ring-offset-surface",
          )}
        >
          <span
            className={cn("size-2 rounded-full", connected ? "bg-ok" : "bg-warn")}
            style={connected ? { boxShadow: "0 0 8px var(--ok)" } : undefined}
          />
          {connected ? "Connected" : "Connect"}
        </button>
        <ThemeControls />
      </div>
    </header>
  );
}

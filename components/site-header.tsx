"use client";

import { Images, PanelLeftOpen, Sparkles, Square } from "lucide-react";
import { useStore } from "@/lib/store";
import { BrandLogo } from "./brand-logo";
import { ThemeControls } from "./theme-controls";
import { focusRing } from "./ui/input";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const status = useStore((s) => s.connectionStatus);
  const isGenerating = useStore((s) => s.isGenerating);
  const imageCount = useStore((s) => s.images.length);
  const generate = useStore((s) => s.generate);
  const cancelGenerate = useStore((s) => s.cancelGenerate);
  const abortRequested = useStore((s) => s.abortRequested);
  const setUI = useStore((s) => s.setUI);
  const connected = status === "ok";

  const connectionLabel =
    status === "verifying" ? "Checking" : status === "invalid" ? "Reconnect" : connected ? "Connected" : "Connect";

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border-soft bg-surface/95 px-2.5 shadow-[0_1px_0_0_var(--border-soft)] backdrop-blur-xl sm:px-4">
      <button
        type="button"
        aria-label="Open settings"
        title="Open settings"
        onClick={() => setUI({ settingsCollapsed: false, galleryOpen: false })}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[9px] text-fg-2 transition-colors duration-instant hover:bg-surface-2 hover:text-fg xl:hidden",
          focusRing,
          "focus-visible:ring-offset-surface",
        )}
      >
        <PanelLeftOpen className="size-[18px]" />
      </button>

      <div className="flex min-w-0 items-center gap-2.5">
        <BrandLogo variant="mark" priority className="size-7 sm:hidden" />
        <BrandLogo priority className="hidden h-8 w-[120px] sm:inline-flex" />
        <span className="mt-0.5 hidden text-[11px] text-muted lg:inline">part of latent.moe</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
        <button
          type="button"
          onClick={() => isGenerating ? cancelGenerate() : void generate()}
          disabled={abortRequested}
          aria-label={isGenerating ? "Stop generation" : "Generate"}
          aria-keyshortcuts="Meta+Enter Control+Enter"
          title={isGenerating ? "Stop — finished images are kept" : "Generate — ⌘↵"}
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-[9px] bg-accent px-2.5 text-[12.5px] font-bold text-on-accent shadow-[var(--glow-accent)]",
            "transition-[filter,transform] duration-fast ease-out hover:brightness-[1.07] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-70 xl:hidden",
            focusRing,
            "focus-visible:ring-offset-surface",
          )}
        >
          {isGenerating ? <Square className="size-3.5" /> : <Sparkles className="size-4" />}
          <span className="hidden sm:inline">{abortRequested ? "Stopping" : isGenerating ? "Stop" : "Generate"}</span>
        </button>
        <button
          type="button"
          onClick={() => setUI({ showConnect: true })}
          aria-label={connectionLabel}
          title={connectionLabel}
          className={cn(
            "flex h-9 items-center gap-2 rounded-[var(--radius-pill)] border border-border-soft bg-surface-2 px-2.5 text-[12.5px] font-medium text-fg-2 transition-colors duration-instant hover:bg-surface-3 hover:text-fg sm:px-3",
            focusRing,
            "focus-visible:ring-offset-surface",
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              status === "invalid" ? "bg-danger" : status === "verifying" ? "animate-pulse bg-warn" : connected ? "bg-ok" : "bg-warn",
            )}
            style={connected ? { boxShadow: "0 0 8px var(--ok)" } : undefined}
          />
          <span className="hidden sm:inline">{connectionLabel}</span>
        </button>
        <ThemeControls />
        <button
          type="button"
          aria-label="Open gallery"
          title="Open gallery"
          onClick={() => setUI({ galleryOpen: true, settingsCollapsed: true })}
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-[9px] text-fg-2 transition-colors duration-instant hover:bg-surface-2 hover:text-fg xl:hidden",
            focusRing,
            "focus-visible:ring-offset-surface",
          )}
        >
          <Images className="size-[18px]" />
          {imageCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-[family-name:var(--font-mono)] text-[9px] font-bold text-on-accent">
              {imageCount > 99 ? "99+" : imageCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

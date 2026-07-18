"use client";

import { useEffect } from "react";
import { PanelLeftOpen, Images, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { SiteHeader } from "./site-header";
import { ConnectModal } from "./connect-modal";
import { SettingsSidebar } from "./sidebar/settings-sidebar";
import { Canvas } from "./canvas/canvas";
import { Lightbox } from "./canvas/lightbox";
import { DirectorModal } from "./canvas/director-modal";
import { GalleryPanel } from "./gallery/gallery-panel";
import { ProgressRing } from "./ui/progress-ring";
import { focusRing } from "./ui/input";
import { cn } from "@/lib/utils";

const railBtn = cn(
  "rounded-[8px] p-2 text-muted transition-colors duration-instant hover:bg-surface-2 hover:text-fg",
  focusRing,
  "focus-visible:ring-offset-surface",
);

export function Studio() {
  const init = useStore((s) => s.init);
  const collapsed = useStore((s) => s.settingsCollapsed);
  const galleryOpen = useStore((s) => s.galleryOpen);
  const imageCount = useStore((s) => s.images.length);
  const galleryStatus = useStore((s) => s.galleryStatus);
  const setUI = useStore((s) => s.setUI);
  const generate = useStore((s) => s.generate);
  const isGenerating = useStore((s) => s.isGenerating);
  const streaming = useStore((s) => s.streamingBatch);
  const prompt = useStore((s) => s.settings.prompt);
  const nSamples = useStore((s) => s.settings.nSamples);

  useEffect(() => {
    void init();
  }, [init]);

  // Global accelerators. Cmd/Ctrl+Enter is the commit gesture from anywhere — without it the only
  // way to generate is a mouse round-trip to the sidebar button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (s.showConnect || s.showDirector || s.focusedIndex !== null) return;

      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!s.isGenerating) void s.generate();
        return;
      }
      // Rail toggles — skip while typing, or they'd swallow the brackets.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "[") s.setUI({ settingsCollapsed: !s.settingsCollapsed });
      if (e.key === "]") s.setUI({ galleryOpen: !s.galleryOpen });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meanProgress = streaming?.length
    ? streaming.reduce((a, t) => a + t.progress, 0) / streaming.length
    : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SiteHeader />
      <main className="flex min-h-0 flex-1">
        {/* One element that tweens its width — collapsing used to swap two DOM subtrees, teleporting
            316px of layout in a single frame. */}
        <aside
          className={cn(
            "relative z-10 shrink-0 overflow-hidden border-r border-border-soft bg-surface shadow-[6px_0_30px_-20px_rgba(0,0,0,0.6)]",
            "transition-[width] duration-slow ease-standard",
            collapsed ? "w-11" : "w-[360px]",
          )}
        >
          {/* Rail: keeps the primary action instead of amputating it. */}
          {/* `inert` both hides this from AT and removes it from the tab order. It used to be
              aria-hidden only, so a keyboard user tabbed through invisible controls — and
              aria-hidden over a focusable element is itself an ARIA violation. */}
          <div
            inert={!collapsed}
            className={cn(
              "absolute inset-y-0 left-0 flex w-11 flex-col items-center gap-2 py-3 transition-opacity duration-fast",
              collapsed ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <button
              type="button"
              aria-label="Expand settings"
              title="Expand settings — ["
              onClick={() => setUI({ settingsCollapsed: false })}
              className={railBtn}
            >
              <PanelLeftOpen className="size-4" />
            </button>
            {isGenerating ? (
              <ProgressRing progress={meanProgress} size={32} stroke={2.5} />
            ) : (
              <button
                type="button"
                aria-label="Generate"
                title={`Generate${nSamples > 1 ? ` · ${nSamples}` : ""} — ⌘↵${prompt ? `\n${prompt.slice(0, 80)}` : ""}`}
                onClick={() => void generate()}
                className={cn(
                  "flex size-9 items-center justify-center rounded-[9px] bg-accent text-on-accent shadow-[var(--glow-accent)]",
                  "transition-[filter,transform] duration-fast ease-out hover:brightness-[1.07] active:scale-[0.96]",
                  focusRing,
                  "focus-visible:ring-offset-surface",
                )}
              >
                <Sparkles className="size-[18px]" />
              </button>
            )}
          </div>

          {/* Fixed-width inner wrapper so the sidebar's own layout doesn't squash during the tween. */}
          <div
            inert={collapsed}
            className={cn(
              "h-full w-[360px] transition-opacity duration-fast",
              collapsed ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <SettingsSidebar />
          </div>
        </aside>

        <section className="min-w-0 flex-1 bg-bg" aria-busy={isGenerating}>
          <Canvas />
        </section>

        <aside
          className={cn(
            "relative z-10 shrink-0 overflow-hidden border-l border-border-soft bg-surface shadow-[-6px_0_30px_-20px_rgba(0,0,0,0.6)]",
            "transition-[width] duration-slow ease-standard",
            galleryOpen ? "w-[280px]" : "w-11",
          )}
        >
          <div
            inert={galleryOpen}
            className={cn(
              "absolute inset-y-0 left-0 flex w-11 flex-col items-center py-3 transition-opacity duration-fast",
              galleryOpen ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <button
              type="button"
              aria-label="Open gallery"
              title="Open gallery — ]"
              onClick={() => setUI({ galleryOpen: true })}
              className={cn(railBtn, "relative")}
            >
              <Images className="size-4" />
              {galleryStatus === "ready" && imageCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-[family-name:var(--font-mono)] text-[10px] font-bold text-on-accent">
                  {imageCount > 99 ? "99+" : imageCount}
                </span>
              )}
            </button>
          </div>

          <div
            inert={!galleryOpen}
            className={cn(
              "h-full w-[280px] transition-opacity duration-fast",
              galleryOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <GalleryPanel />
          </div>
        </aside>
      </main>

      {/* Progress is otherwise silent for screen-reader users for the whole run. */}
      <div role="status" aria-live="polite" aria-atomic className="sr-only">
        {isGenerating ? `Generating ${streaming?.length ?? 0} images, ${Math.round(meanProgress * 100)} percent` : ""}
      </div>

      <ConnectModal />
      <DirectorModal />
      <Lightbox />
    </div>
  );
}

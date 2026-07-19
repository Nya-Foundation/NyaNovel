"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Search, Sparkles, Square, Wand2, Images, PanelLeftOpen, KeyRound, Moon, Sun,
  Palette, Hash, RotateCcw, Dices, Trash2, SlidersHorizontal, Users, CornerDownLeft,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { MODEL_OPTIONS, modelLabel } from "@/lib/nai/models";
import { applyAccent, applyMode, currentMode, ACCENTS } from "@/lib/theme";
import { spring, fade, usePrefersReducedMotion } from "@/lib/motion";
import { useFocusTrap } from "@/lib/use-overlay";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/db/gallery";

/** Display order for the grouped view. A command whose group isn't listed here won't render. */
const GROUPS = ["Actions", "Navigate", "Model", "Appearance", "Danger"] as const;

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ReactNode;
  /** Extra text folded into matching but never displayed — synonyms, so "dark" finds "Light mode". */
  keywords?: string;
  shortcut?: string;
  run: () => void;
};

/**
 * Subsequence match, the convention every palette shares: "upsc" hits "4x upscale", and "gcur"
 * hits "Generate · Curated". Returns a score so exact prefixes outrank scattered letters, and
 * -1 for no match. Contiguous runs are rewarded, so "v45" prefers "V4.5" over "V4 ... 5 steps".
 */
function score(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const direct = t.indexOf(q);
  if (direct === 0) return 1000;
  if (direct > 0) return 700 - direct;

  let ti = 0;
  let points = 0;
  let streak = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    streak = found === ti ? streak + 1 : 0;
    points += 10 + streak * 5 - Math.min(found - ti, 10);
    ti = found + 1;
  }
  return points;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  // Returns the ref to attach; it focuses the first control on open and restores focus on close.
  const panelRef = useFocusTrap<HTMLDivElement>(open);

  const store = useStore;
  const images = useStore((s) => s.images);
  const isGenerating = useStore((s) => s.isGenerating);
  const model = useStore((s) => s.settings.model);
  const seedLocked = useStore((s) => s.settings.seed !== 0);

  // ⌘K / Ctrl+K from anywhere, including inside the prompt textarea — the palette is the one
  // accelerator that must not be shadowed by a focused field.
  const close = useCallback(() => setOpen(false), []);

  // Reset happens on the way in, not in an effect watching `open` — that would cascade an extra
  // render on every open, and resetting on close would visibly repopulate the list mid-exit.
  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open) close();
        else openPalette();
      }
    };
    // Pointer users get here via the header's search affordance, which dispatches this event
    // rather than reaching into component state.
    window.addEventListener("keydown", onKey);
    window.addEventListener("nya-command-palette", openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nya-command-palette", openPalette);
    };
  }, [open, close, openPalette]);

  const commands = useMemo<Cmd[]>(() => {
    const s = store.getState();
    const go = (fn: () => void) => () => {
      fn();
      close();
    };

    const list: Cmd[] = [
      {
        id: "generate",
        label: isGenerating ? "Stop generation" : "Generate",
        hint: isGenerating ? "Finished images are kept" : `${s.settings.nSamples} image${s.settings.nSamples === 1 ? "" : "s"}`,
        group: "Actions",
        icon: isGenerating ? <Square /> : <Sparkles />,
        shortcut: "⌘↵",
        keywords: "run render create make dream",
        run: go(() => (isGenerating ? s.cancelGenerate() : void s.generate())),
      },
      {
        id: "director",
        label: "Director tools",
        hint: "Upscale, line art, colorize…",
        group: "Actions",
        icon: <Wand2 />,
        keywords: "upscale lineart sketch colorize declutter enhance emotion background",
        run: go(() => s.setUI({ showDirector: true })),
      },
      {
        id: "reuse",
        label: "Reuse settings from current image",
        group: "Actions",
        icon: <RotateCcw />,
        keywords: "recipe restore",
        run: go(() => {
          const img = s.selectedImage ?? s.selectedBatch?.[0];
          if (img) s.restoreSettings(img.settings);
        }),
      },
      {
        id: "seed-copy",
        label: "Copy seed from current image",
        group: "Actions",
        icon: <Hash />,
        run: go(() => {
          const img = s.selectedImage ?? s.selectedBatch?.[0];
          if (img) s.patchSettings({ seed: img.seed });
        }),
      },
      {
        id: "seed-random",
        label: seedLocked ? "Unlock seed (randomize)" : "Seed is already random",
        group: "Actions",
        icon: <Dices />,
        keywords: "random dice unpin",
        run: go(() => s.patchSettings({ seed: 0 })),
      },

      { id: "panel-settings", label: "Toggle settings panel", group: "Navigate", icon: <PanelLeftOpen />, shortcut: "[",
        run: go(() => s.setUI({ settingsCollapsed: !s.settingsCollapsed })) },
      { id: "panel-gallery", label: "Toggle gallery", group: "Navigate", icon: <Images />, shortcut: "]",
        run: go(() => s.setUI({ galleryOpen: !s.galleryOpen })) },
      { id: "tab-basic", label: "Go to Basic settings", group: "Navigate", icon: <SlidersHorizontal />,
        run: go(() => s.setUI({ settingsCollapsed: false, activeTab: "basic" })) },
      { id: "tab-advanced", label: "Go to Advanced settings", group: "Navigate", icon: <SlidersHorizontal />,
        keywords: "cfg scale noise threshold smea",
        run: go(() => s.setUI({ settingsCollapsed: false, activeTab: "advanced" })) },
      { id: "tab-characters", label: "Go to Characters", group: "Navigate", icon: <Users />,
        keywords: "multi character position",
        run: go(() => s.setUI({ settingsCollapsed: false, activeTab: "characters" })) },
      { id: "connect", label: "Connection settings", group: "Navigate", icon: <KeyRound />,
        keywords: "token api key host proxy login auth",
        run: go(() => s.setUI({ showConnect: true })) },

      ...MODEL_OPTIONS.map((opt) => ({
        id: `model-${opt.value}`,
        label: `Model · ${opt.label}`,
        hint: opt.value === model ? "Current" : undefined,
        group: "Model",
        icon: <Sparkles />,
        keywords: "switch diffusion",
        run: go(() => s.patchSettings({ model: opt.value })),
      })),

      { id: "theme-dark", label: "Dark mode", group: "Appearance", icon: <Moon />, keywords: "theme night",
        run: go(() => applyMode("dark")) },
      { id: "theme-light", label: "Light mode", group: "Appearance", icon: <Sun />, keywords: "theme day bright",
        run: go(() => applyMode("light")) },
      { id: "theme-toggle", label: "Toggle dark / light", group: "Appearance", icon: <Palette />,
        run: go(() => applyMode(currentMode() === "dark" ? "light" : "dark")) },
      ...ACCENTS.map((a) => ({
        id: `accent-${a.key}`,
        label: `Accent · ${a.label}`,
        group: "Appearance",
        icon: (
          <span className="size-3.5 rounded-full ring-1 ring-black/20" style={{ background: a.swatch }} />
        ),
        keywords: "color colour",
        run: go(() => applyAccent(a.key)),
      })),
    ];

    if (images.length) {
      list.push({
        id: "clear-gallery",
        label: "Clear entire gallery",
        hint: `${images.length} images · permanent`,
        group: "Danger",
        icon: <Trash2 />,
        keywords: "delete all wipe",
        run: go(() => void s.clearGallery()),
      });
    }

    return list;
  }, [store, close, isGenerating, model, seedLocked, images.length]);

  /**
   * Gallery results are searched separately: they're matched on prompt text (what a user actually
   * remembers about an image) and only surface once there's a query, so they never crowd out the
   * command list on open.
   */
  const imageHits = useMemo(() => {
    if (query.trim().length < 2) return [];
    const seen = new Set<number>();
    const unique: GalleryImage[] = [];
    for (const img of images) {
      if (seen.has(img.batchId)) continue;
      seen.add(img.batchId);
      unique.push(img);
    }
    return unique
      .map((img) => ({ img, s: score(query, img.settings.prompt || "untitled") }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((r) => r.img);
  }, [query, images]);

  const results = useMemo(() => {
    const scored = commands
      .map((c) => ({ c, s: Math.max(score(query, c.label), score(query, c.keywords ?? "") - 200) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s);
    return scored.map((r) => r.c);
  }, [commands, query]);

  // One flat, ordered list is what the arrow keys actually traverse — grouping is presentational
  // only, so the highlight never jumps unpredictably across a group boundary.
  const flat = useMemo(
    () => [
      ...results.map((c) => ({ kind: "cmd" as const, cmd: c })),
      ...imageHits.map((img) => ({ kind: "image" as const, img })),
    ],
    [results, imageHits],
  );

  /**
   * Presentational grouping, with each row's absolute index baked in. The arrow keys traverse the
   * flat list, so the two views have to agree on numbering — deriving both from the same order
   * here is what keeps the highlight from desyncing from the keyboard cursor.
   */
  const sections = useMemo(() => {
    let n = 0;
    const out: { title: string; rows: ({ idx: number } & (typeof flat)[number])[] }[] = [];
    for (const group of GROUPS) {
      const rows = results
        .filter((c) => c.group === group)
        .map((cmd) => ({ idx: n++, kind: "cmd" as const, cmd }));
      if (rows.length) out.push({ title: group, rows });
    }
    if (imageHits.length) {
      out.push({
        title: "From your gallery",
        rows: imageHits.map((img) => ({ idx: n++, kind: "image" as const, img })),
      });
    }
    return out;
    // `flat` appears above only as a type, never as a value — it is deliberately not a dependency.
  }, [results, imageHits]);

  // Clamped at read time rather than corrected in an effect: filtering can shrink the list below
  // the stored index, and a render-phase clamp avoids a frame where `active` points past the end.
  const activeIdx = Math.min(active, Math.max(0, flat.length - 1));

  const runAt = (i: number) => {
    const item = flat[i];
    if (!item) return;
    if (item.kind === "cmd") item.cmd.run();
    else {
      store.getState().selectBatch(item.img.batchId, true);
      close();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(1, flat.length));
    } else if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
      e.preventDefault();
      setActive((a) => (a - 1 + flat.length) % Math.max(1, flat.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(activeIdx);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  // Keep the highlighted row in view during keyboard traversal.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]"
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <motion.div
            aria-hidden
            onClick={close}
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 }, exit: { opacity: 0 } }}
            transition={fade}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-[560px] overflow-hidden rounded-[var(--radius-card-lg)] border border-border bg-surface shadow-[var(--shadow-pop)]"
            variants={{
              hidden: { opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : -8 },
              show: { opacity: 1, scale: 1, y: 0, transition: reduced ? fade : spring.soft },
              exit: { opacity: 0, scale: reduced ? 1 : 0.98, y: reduced ? 0 : -4, transition: fade },
            }}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2.5 border-b border-border-soft px-4">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search commands, models, or your gallery…"
                aria-label="Search commands"
                aria-controls="cmdk-list"
                aria-activedescendant={flat.length ? `cmdk-opt-${active}` : undefined}
                className="h-13 min-w-0 flex-1 bg-transparent py-4 text-[14.5px] text-fg outline-none placeholder:text-muted"
              />
              <kbd className="hidden shrink-0 rounded-[6px] border border-border-soft bg-surface-2 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px] text-muted sm:block">
                ESC
              </kbd>
            </div>

            <div
              ref={listRef}
              id="cmdk-list"
              role="listbox"
              aria-label="Results"
              className="max-h-[52vh] overflow-y-auto overscroll-contain p-1.5"
            >
              {flat.length === 0 && (
                <p className="px-3 py-8 text-center text-[13px] text-muted">
                  Nothing matches “{query}”.
                </p>
              )}

              {sections.map((section) => (
                <div key={section.title} className="mb-1 last:mb-0">
                  <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted">
                    {section.title}
                  </p>
                  {section.rows.map((row) => {
                    const isActive = row.idx === activeIdx;
                    return (
                      <button
                        key={row.kind === "cmd" ? row.cmd.id : `img-${row.img.batchId}`}
                        id={`cmdk-opt-${row.idx}`}
                        data-idx={row.idx}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        tabIndex={-1}
                        onClick={() => runAt(row.idx)}
                        onPointerMove={() => setActive(row.idx)}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-[9px] px-2.5 text-left outline-none",
                          row.kind === "cmd" ? "py-2" : "py-1.5",
                          isActive ? "text-fg" : "text-fg-2",
                        )}
                      >
                        {/* One shared layoutId across every row: the highlight slides between
                            results instead of blinking out and in. */}
                        {isActive && (
                          <motion.span
                            layoutId="cmdk-active"
                            aria-hidden
                            className="absolute inset-0 -z-0 rounded-[9px] bg-surface-2 ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                            transition={reduced ? { duration: 0 } : spring.snap}
                          />
                        )}

                        {row.kind === "cmd" ? (
                          <>
                            <span
                              className={cn(
                                "relative z-10 flex size-5 items-center justify-center [&_svg]:size-4",
                                isActive ? "text-accent" : "text-muted",
                              )}
                            >
                              {row.cmd.icon}
                            </span>
                            <span className="relative z-10 min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-semibold">{row.cmd.label}</span>
                              {row.cmd.hint && (
                                <span className="block truncate text-[11.5px] text-muted">{row.cmd.hint}</span>
                              )}
                            </span>
                            {row.cmd.shortcut ? (
                              <kbd className="relative z-10 shrink-0 rounded-[6px] border border-border-soft bg-surface-2 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px] text-muted">
                                {row.cmd.shortcut}
                              </kbd>
                            ) : (
                              isActive && <CornerDownLeft className="relative z-10 size-3.5 shrink-0 text-muted" />
                            )}
                          </>
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={row.img.dataUrl}
                              alt=""
                              className="relative z-10 size-8 shrink-0 rounded-[6px] object-cover ring-1 ring-border-soft"
                            />
                            <span className="relative z-10 min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">
                                {row.img.settings.prompt || "Untitled generation"}
                              </span>
                              <span className="block truncate font-[family-name:var(--font-mono)] text-[10.5px] text-muted">
                                {modelLabel(row.img.settings.model, true)} · {row.img.settings.width}×
                                {row.img.settings.height}
                              </span>
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border-soft bg-surface-2/60 px-3 py-2 text-[11px] text-muted">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded-[5px] border border-border-soft bg-surface px-1 font-[family-name:var(--font-mono)]">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded-[5px] border border-border-soft bg-surface px-1 font-[family-name:var(--font-mono)]">↵</kbd>
                  run
                </span>
              </span>
              <span className="font-[family-name:var(--font-mono)]">{flat.length} result{flat.length === 1 ? "" : "s"}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

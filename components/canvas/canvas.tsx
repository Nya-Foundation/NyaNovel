"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Copy, Trash2, Wand2, RotateCcw, Hash, Maximize2, AlertTriangle, KeyRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { fade, listContainer, listItem, spring, usePrefersReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { BrandLogo } from "@/components/brand-logo";
import { focusRing } from "@/components/ui/input";
import { modelLabel } from "@/lib/nai/models";
import { downloadDataUrl, copyImageToClipboard } from "@/lib/image-actions";
import { StreamingGrid } from "./streaming-grid";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/db/gallery";

const EXAMPLES = [
  { title: "Soft portrait", prompt: "1girl, cat ears, cherry blossoms, soft light, masterpiece" },
  { title: "Neon city", prompt: "cyberpunk city, neon rain, cinematic, ultra detailed" },
  { title: "Cozy watercolor", prompt: "cozy cafe, warm afternoon, watercolor, wlop" },
];

/** Rotating inspiration line — the stage is otherwise completely static before the first run. */
const MUSES = [
  "a fox spirit in a rain-soaked shrine",
  "brutalist library, dust in the light shafts",
  "a mecha resting in a wheat field",
  "portrait lit only by an aquarium",
  "storm rolling over a paper town",
];

function AmbientField() {
  const reduced = usePrefersReducedMotion();

  // Two counter-drifting accent blooms. Static gradients read as a flat backdrop; slow parallax
  // makes the stage feel like a live surface waiting for output rather than a dead panel. Frozen
  // (not removed) under reduced motion — the depth survives, the drift doesn't.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-1/2 h-[520px] w-[520px] rounded-full blur-[110px]"
        style={{ background: "var(--accent)", opacity: 0.17 }}
        initial={{ x: "-50%", y: "-50%" }}
        animate={reduced ? { x: "-50%", y: "-50%" } : { x: ["-58%", "-42%", "-58%"], y: ["-56%", "-44%", "-56%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[380px] w-[380px] rounded-full blur-[100px]"
        style={{ background: "var(--cat-lora)", opacity: 0.1 }}
        initial={{ x: "-50%", y: "-50%" }}
        animate={reduced ? { x: "-50%", y: "-50%" } : { x: ["-38%", "-60%", "-38%"], y: ["-40%", "-58%", "-40%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function EmptyState() {
  const patch = useStore((s) => s.patchSettings);
  const prompt = useStore((s) => s.settings.prompt);
  const setUI = useStore((s) => s.setUI);
  const [muse, setMuse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMuse((i) => (i + 1) % MUSES.length), 4200);
    return () => clearInterval(t);
  }, []);

  // Appends rather than replaces: this screen also renders for a returning user who has already
  // typed a prompt, and the chip used to destroy it with no undo. Expanding the sidebar and
  // focusing the field makes the result visible — with the sidebar collapsed via `[`, the
  // destination isn't on screen at all and the click looked dead.
  const applyExample = (ex: string) => {
    patch({ prompt: prompt.trim() ? `${prompt.replace(/,\s*$/, "")}, ${ex}` : ex });
    setUI({ settingsCollapsed: false, activeTab: "basic" });
    requestAnimationFrame(() => {
      const el = document.getElementById("prompt") as HTMLTextAreaElement | null;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  };

  return (
    <motion.div
      className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden p-8 text-center"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      <AmbientField />

      <motion.div variants={listItem} className="relative">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border-soft bg-surface-2 shadow-[var(--shadow-card)]">
          <BrandLogo variant="mark" className="size-10" />
        </div>
      </motion.div>

      <motion.div variants={listItem} className="relative">
        <h2 className="font-[family-name:var(--font-display)] text-[24px] font-bold tracking-[-0.02em] text-fg">
          What should we imagine?
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-muted">
          Describe your image and hit Generate. It streams in here and lands in your gallery.
        </p>
        {/* Fixed height: the line swaps under an absolutely-positioned crossfade, so a longer muse
            must not reflow the buttons below it mid-rotation. */}
        <div className="relative mx-auto mt-3 h-5 w-full max-w-sm">
          <AnimatePresence mode="wait">
            <motion.p
              key={muse}
              className="absolute inset-x-0 truncate text-[12.5px] italic text-muted/80"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={fade}
            >
              try “{MUSES[muse]}”
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div variants={listItem} className="relative grid w-full max-w-2xl gap-2 sm:grid-cols-3">
        {EXAMPLES.map((example) => (
          <motion.button
            key={example.title}
            type="button"
            onClick={() => applyExample(example.prompt)}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={spring.snap}
            className={cn(
              "group rounded-[var(--radius-card)] border border-border-soft bg-surface-2 px-3.5 py-3 text-left shadow-[var(--shadow-card)]",
              "transition-[color,border-color,background-color] duration-fast hover:border-accent/50 hover:bg-surface-3",
              focusRing,
            )}
          >
            <span className="block text-[12.5px] font-bold text-fg">{example.title}</span>
            <span className="mt-0.5 block truncate text-[11.5px] text-muted group-hover:text-fg-2">
              {example.prompt}
            </span>
          </motion.button>
        ))}
      </motion.div>

      <motion.p variants={listItem} className="relative text-[11.5px] text-muted">
        Press{" "}
        <kbd className="rounded-[5px] border border-border-soft bg-surface-2 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px]">
          ⌘K
        </kbd>{" "}
        for commands ·{" "}
        <kbd className="rounded-[5px] border border-border-soft bg-surface-2 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px]">
          ⌘↵
        </kbd>{" "}
        to generate
      </motion.p>
    </motion.div>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-chip)] bg-surface-2 px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11.5px] tabular-nums text-fg-2">
      {children}
    </span>
  );
}

function BatchView({ batch, selected }: { batch: GalleryImage[]; selected: GalleryImage | null }) {
  const img = selected ?? batch[0];
  const selectImage = useStore((s) => s.selectImage);
  const setUI = useStore((s) => s.setUI);
  const patchSettings = useStore((s) => s.patchSettings);
  const restoreSettings = useStore((s) => s.restoreSettings);
  const deleteImage = useStore((s) => s.deleteImage);
  const lightboxOpen = useStore((s) => s.focusedIndex !== null);
  const reduced = usePrefersReducedMotion();

  const focusThis = () => setUI({ focusedIndex: Math.max(0, batch.findIndex((b) => b.id === img.id)) });

  return (
    <div className="flex h-full flex-col">
      {/* stage with ambient backdrop */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6">
        {/* The backdrop crossfades on its own track — swapping it in the same frame as the stage
            image made the whole panel flash when stepping through a batch. */}
        <AnimatePresence>
          <motion.img
            key={`bg-${img.id}`}
            src={img.dataUrl}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-3xl saturate-150"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        </AnimatePresence>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg/70" />

        {/* Deliberately NOT wrapped in AnimatePresence, and unmounted while the lightbox is open.
            A layoutId identifies exactly one element at a time — if this stayed mounted (or lingered
            through an exit animation) the lightbox's copy would be a second claimant to `img-<id>`
            and the flight would collapse into a flicker. Unmounting hands the identity over cleanly,
            so the picture travels from the stage into fullscreen and back. */}
        {!lightboxOpen && (
          <motion.img
            key={img.id}
            layoutId={`img-${img.id}`}
            src={img.dataUrl}
            alt=""
            onClick={focusThis}
            className="relative max-h-full max-w-full cursor-zoom-in rounded-[var(--radius-card)] object-contain shadow-[var(--shadow-pop)] ring-1 ring-white/10"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? fade : spring.fluid}
            whileHover={reduced ? undefined : { scale: 1.006 }}
          />
        )}

        <IconButton
          variant="overlay"
          label="Open fullscreen preview"
          onClick={focusThis}
          className="absolute right-4 top-4 sm:right-8 sm:top-8"
        >
          <Maximize2 />
        </IconButton>
      </div>

      {batch.length > 1 && (
        <div
          role="listbox"
          aria-label="Batch results"
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const i = batch.findIndex((b) => b.id === img.id);
            const next = e.key === "ArrowRight" ? (i + 1) % batch.length : (i - 1 + batch.length) % batch.length;
            selectImage(batch[next], true);
            // Focus follows selection so the ring tracks the arrow keys.
            (document.getElementById(`batch-opt-${batch[next].id}`) as HTMLButtonElement | null)?.focus();
          }}
          className="flex shrink-0 justify-start gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center sm:px-4"
        >
          {batch.map((b, i) => {
            const active = b.id === img.id;
            return (
              <motion.button
                key={b.id}
                id={`batch-opt-${b.id}`}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={`Result ${i + 1} of ${batch.length}, seed ${b.seed}`}
                tabIndex={active ? 0 : -1}
                onClick={() => selectImage(b, true)}
                whileHover={reduced ? undefined : { scale: 1.07, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={spring.snap}
                className={cn(
                  // Same radius as the stage image above it — both frame the same picture and are
                  // on screen together, so a 10px-vs-14px disagreement is actually visible.
                  "relative size-14 shrink-0 cursor-pointer rounded-[var(--radius-card)]",
                  "transition-opacity duration-fast",
                  focusRing,
                  active ? "opacity-100" : "opacity-55 hover:opacity-100",
                )}
              >
                {/* The ring is one element that slides between thumbnails, so the selection reads as
                    a single marker moving rather than two rings blinking in and out. */}
                {active && (
                  <motion.span
                    layoutId="batch-marker"
                    aria-hidden
                    className="absolute -inset-[3px] rounded-[17px] ring-2 ring-accent"
                    transition={reduced ? { duration: 0 } : spring.snap}
                  />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.dataUrl}
                  alt=""
                  className="h-full w-full rounded-[var(--radius-card)] object-cover"
                />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* toolbar */}
      <div className="shrink-0 border-t border-border-soft bg-surface/80 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-fg" title={img.settings.prompt || "Untitled generation"}>
              {img.settings.prompt || "Untitled generation"}
            </p>
            <p className="truncate text-[11px] text-muted">{modelLabel(img.settings.model)}</p>
          </div>
          <span className="hidden rounded-[var(--radius-pill)] border border-border-soft bg-surface-2 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-2 sm:inline">
            Result {Math.max(0, batch.findIndex((b) => b.id === img.id)) + 1} / {batch.length}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Meta>
              <Hash className="size-3 opacity-60" />
              {img.seed}
            </Meta>
            <Meta>{img.settings.width}×{img.settings.height}</Meta>
            <Meta>{img.settings.steps} steps</Meta>
            <Meta>CFG {img.settings.scale}</Meta>
          </div>

          <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setUI({ showDirector: true })}
            className={cn(
              "mr-0.5 inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-surface-2 px-2.5 text-[12.5px] font-semibold text-fg transition-colors duration-instant hover:bg-surface-3 sm:px-3 sm:text-[13px]",
              focusRing,
              "focus-visible:ring-offset-surface",
            )}
          >
            {/* 3.1: no text-accent here — accent is reserved for the primary action. */}
            <Wand2 className="size-4" /> <span className="hidden sm:inline">Director</span>
          </button>
          {/* Promoted from a bare 17px glyph in a row of five identical icons — reuse is the whole
              point of storing per-image param snapshots. */}
          <button
            type="button"
            onClick={() => restoreSettings(img.settings)}
            aria-label="Reuse settings"
            title="Reuse settings"
            className={cn(
              "mr-0.5 inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-surface-2 px-2.5 text-[12.5px] font-semibold text-fg transition-colors duration-instant hover:bg-surface-3 sm:px-3 sm:text-[13px]",
              focusRing,
              "focus-visible:ring-offset-surface",
            )}
          >
            <RotateCcw className="size-4" /> <span className="hidden lg:inline">Reuse settings</span>
          </button>
          <IconButton size="sm" label="Copy seed to settings" onClick={() => patchSettings({ seed: img.seed })}>
            <Hash />
          </IconButton>
          <IconButton size="sm" label="Download" onClick={() => downloadDataUrl(img.dataUrl, img.filename)}>
            <Download />
          </IconButton>
          <IconButton size="sm" label="Copy image" onClick={() => copyImageToClipboard(img.dataUrl)}>
            <Copy />
          </IconButton>
          <IconButton size="sm" label="Delete" className="hover:text-danger" onClick={() => img.id && deleteImage(img.id)}>
            <Trash2 />
          </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Maps an opaque API failure onto something the user can act on. Status codes are forwarded
 * verbatim whether the host is NovelAI directly or a proxy, so the copy stays neutral about which
 * credential was rejected and which side ran out of capacity.
 */
function explain(message: string): { title: string; detail: string; reconnect: boolean } {
  const m = message.toLowerCase();
  if (/401|403|unauthor|forbidden|token/.test(m))
    return {
      title: "Your credentials were rejected",
      detail: "The key may have expired, been copied incompletely, or lost access. Re-enter it to try again.",
      reconnect: true,
    };
  if (/402|429|quota|rate limit|too many/.test(m))
    return {
      title: "Out of capacity",
      detail: "The account is out of credit or too many requests are in flight. Wait a moment and retry.",
      reconnect: false,
    };
  if (/5\d\d|network|fetch|timeout|econn/.test(m))
    return {
      title: "Couldn't reach the server",
      detail: "The host didn't respond. Check your connection, or the Host URL under Connect.",
      reconnect: true,
    };
  return { title: "Generation failed", detail: "The request didn't complete. Your settings are untouched.", reconnect: false };
}

function ErrorState({ message }: { message: string }) {
  const generate = useStore((s) => s.generate);
  const setUI = useStore((s) => s.setUI);
  const clearError = useStore((s) => s.clearError);
  const { title, detail, reconnect } = explain(message);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border-soft bg-surface-2 shadow-[var(--shadow-card)]">
        <AlertTriangle className="size-6 text-danger" />
      </div>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold tracking-[-0.02em] text-fg">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-muted">{detail}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => void generate()}>
          <RotateCcw className="size-4" /> Try again
        </Button>
        {reconnect && (
          <Button variant="secondary" onClick={() => setUI({ showConnect: true })}>
            <KeyRound className="size-4" /> Reconnect
          </Button>
        )}
        <Button variant="ghost" onClick={clearError}>Dismiss</Button>
      </div>
      <details className="max-w-md text-left">
        <summary className={cn("cursor-pointer list-none text-[12px] text-muted hover:text-fg-2", focusRing)}>Details</summary>
        <pre className="mt-2 overflow-x-auto rounded-[var(--radius-chip)] bg-surface-2 p-3 font-[family-name:var(--font-mono)] text-[11.5px] text-fg-2">
          {message}
        </pre>
      </details>
    </div>
  );
}

export function Canvas() {
  const streaming = useStore((s) => s.streamingBatch);
  const batch = useStore((s) => s.selectedBatch);
  const selected = useStore((s) => s.selectedImage);
  const lastError = useStore((s) => s.lastError);

  // Streaming keeps the previous image as its backdrop, so committing never blanks the stage.
  if (streaming) return <StreamingGrid tiles={streaming} backdrop={(selected ?? batch?.[0])?.dataUrl ?? null} />;
  if (lastError) return <ErrorState message={lastError.message} />;
  if (batch && batch.length) return <BatchView batch={batch} selected={selected} />;
  return <EmptyState />;
}

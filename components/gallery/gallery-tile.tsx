"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Hash, RotateCcw, Layers } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { listItem, spring, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/db/gallery";

export type GalleryBatchPreview = GalleryImage & { count: number; siblings: GalleryImage[] };

function relativeTime(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function GalleryTile({
  batch,
  selected,
  onOpen,
  onRestore,
  onUseSeed,
}: {
  batch: GalleryBatchPreview;
  selected: boolean;
  onOpen: () => void;
  onRestore: () => void;
  onUseSeed: () => void;
}) {
  const age = relativeTime(batch.timestamp);
  const prompt = batch.settings.prompt || "Untitled generation";
  const reduced = usePrefersReducedMotion();

  const multi = batch.count > 1;
  const [hovered, setHovered] = useState(false);
  const [scrub, setScrub] = useState(0);

  /**
   * Hover-scrub: a multi-image batch cycles its members under the pointer, so you can identify a
   * batch by its contents without opening it.
   *
   * The guard matters — without `multi` this would run one interval per tile across the whole
   * history to animate a single frame onto itself. Disabled under reduced motion too: this is
   * decorative autoplay, and unlike the streaming spinner it isn't proving anything is still alive.
   */
  useEffect(() => {
    if (!hovered || !multi || reduced) return;
    const timer = setInterval(() => setScrub((i) => (i + 1) % batch.count), 700);
    return () => clearInterval(timer);
  }, [hovered, multi, reduced, batch.count]);

  // Derived, not reset in an effect: at rest the tile always shows the representative frame, so it
  // matches what clicking it will actually open. A stale `scrub` left over from the last hover is
  // simply ignored rather than needing to be cleared.
  const shown = (hovered && batch.siblings[scrub]) || batch;

  return (
    <motion.article
      variants={listItem}
      // Deliberately no `layout` prop: motion's layout projection measures against the normal flow,
      // which CSS multi-column breaks — tiles would animate toward positions the column algorithm
      // then overrides. The stagger-in covers the arrival; reflow is left to the browser.
      whileHover={reduced ? undefined : { y: -3 }}
      transition={spring.smooth}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        "group relative mb-2 block break-inside-avoid overflow-hidden rounded-[12px] border bg-surface-2 shadow-[var(--shadow-card)]",
        "transition-[border-color,box-shadow] duration-fast",
        selected
          ? "border-accent ring-1 ring-accent"
          : "border-border-soft hover:border-border hover:shadow-[var(--shadow-panel)]",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        title={prompt}
        aria-label={`Load batch of ${batch.count} and its recipe, seed ${batch.seed}, ${age}`}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        {/* The real aspect ratio, not a forced square — this is what turns the two-column grid into
            a masonry wall once the panel switches to CSS columns. */}
        <span
          className="relative block overflow-hidden"
          style={{ aspectRatio: `${batch.settings.width} / ${batch.settings.height}` }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.img
              key={shown.id ?? shown.batchIndex}
              src={shown.dataUrl}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-base ease-standard group-hover:scale-[1.045]"
            />
          </AnimatePresence>

          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

          {multi && (
            <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-[6px] bg-black/65 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold text-white backdrop-blur-sm">
              <Layers className="size-2.5" />
              {batch.count}
            </span>
          )}

          {/* Scrub position, so a cycling thumbnail reads as deliberate rather than as a glitch. */}
          {multi && !reduced && (
            <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex gap-0.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100">
              {batch.siblings.map((s, i) => (
                <span
                  key={s.id ?? i}
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors duration-instant",
                    i === scrub ? "bg-white" : "bg-white/35",
                  )}
                />
              ))}
            </span>
          )}

          {batch.processedWith && (
            <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-[5px] bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {batch.processedWith}
            </span>
          )}
        </span>

        <span className="block px-2 py-1.5">
          <span className="block truncate text-[11.5px] font-semibold text-fg" title={prompt}>{prompt}</span>
          <span className="mt-0.5 flex items-center justify-between gap-1 font-[family-name:var(--font-mono)] text-[9.5px] tabular-nums text-muted">
            <span className="truncate">{batch.settings.width}×{batch.settings.height}</span>
            <span className="shrink-0">{age}</span>
          </span>
        </span>
      </button>

      <div className="pointer-events-none absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity duration-fast group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
        <IconButton variant="overlay" size="sm" label="Use these settings" onClick={onRestore}>
          <RotateCcw />
        </IconButton>
        <IconButton variant="overlay" size="sm" label="Use this seed" onClick={onUseSeed}>
          <Hash />
        </IconButton>
      </div>
    </motion.article>
  );
}

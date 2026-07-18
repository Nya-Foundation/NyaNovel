"use client";

import { Hash, RotateCcw } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/db/gallery";

export type GalleryBatchPreview = GalleryImage & { count: number };

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

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[12px] border bg-surface-2 shadow-[var(--shadow-card)]",
        "transition-[border-color,box-shadow,transform] duration-fast ease-out hover:-translate-y-0.5",
        selected ? "border-accent ring-1 ring-accent" : "border-border-soft hover:border-border",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        title={prompt}
        aria-label={`Load batch of ${batch.count} and its recipe, seed ${batch.seed}, ${age}`}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="relative block overflow-hidden" style={{ aspectRatio: `${batch.settings.width} / ${batch.settings.height}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={batch.dataUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-base ease-standard group-hover:scale-[1.045]"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          {batch.count > 1 && (
            <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-black/65 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold text-white backdrop-blur-sm">
              {batch.count} images
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
    </article>
  );
}

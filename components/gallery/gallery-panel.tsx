"use client";

import { useMemo } from "react";
import { Trash2, PanelRightClose, ImageOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { focusRing } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/db/gallery";

/** One representative entry per batch, newest first. */
function groupByBatch(images: GalleryImage[]) {
  const seen = new Set<number>();
  const groups: (GalleryImage & { count: number })[] = [];
  for (const img of images) {
    if (seen.has(img.batchId)) continue;
    seen.add(img.batchId);
    groups.push({ ...img, count: images.filter((i) => i.batchId === img.batchId).length });
  }
  return groups;
}

export function GalleryPanel() {
  const images = useStore((s) => s.images);
  const selectedBatchId = useStore((s) => s.selectedBatch?.[0]?.batchId ?? null);
  const selectBatch = useStore((s) => s.selectBatch);
  const clearGallery = useStore((s) => s.clearGallery);
  const setUI = useStore((s) => s.setUI);

  const groups = useMemo(() => groupByBatch(images), [images]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-soft p-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-fg">Gallery</span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted">{images.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {images.length > 0 && (
            <button
              type="button"
              aria-label="Clear all"
              title="Clear all"
              onClick={() => {
                if (confirm("Delete all images? This can't be undone.")) void clearGallery();
              }}
              className={cn(
              "rounded-[8px] p-1.5 text-muted transition-colors duration-instant hover:bg-surface-2 hover:text-danger",
              focusRing,
              "focus-visible:ring-offset-surface",
            )}
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Collapse gallery"
            onClick={() => setUI({ galleryOpen: false })}
            className={cn(
              "rounded-[8px] p-1.5 text-muted transition-colors duration-instant hover:bg-surface-2 hover:text-fg",
              focusRing,
              "focus-visible:ring-offset-surface",
            )}
          >
            <PanelRightClose className="size-4" />
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <ImageOff className="size-6 text-muted" />
          <p className="text-[12.5px] text-muted">Your generations will appear here.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          <div className="grid grid-cols-2 gap-2">
            {groups.map((g) => (
              <button
                key={g.batchId}
                type="button"
                onClick={() => selectBatch(g.batchId)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-[10px] border",
                  "transition-[border-color,box-shadow] duration-fast",
                  // Focus gets the offset halo so it never reads as selection.
                  focusRing,
                  "focus-visible:ring-offset-surface",
                  g.batchId === selectedBatchId ? "border-accent ring-2 ring-accent" : "border-border-soft hover:border-border",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.dataUrl} alt="" className="h-full w-full object-cover" />
                {g.count > 1 && (
                  <span className="absolute right-1 top-1 rounded-[6px] bg-black/60 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-white">
                    ×{g.count}
                  </span>
                )}
                {g.processedWith && (
                  <span className="absolute bottom-1 left-1 rounded-[5px] bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {g.processedWith}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

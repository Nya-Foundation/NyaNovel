"use client";

import { useMemo, useState } from "react";
import { Trash2, PanelRightClose, ImageOff, RotateCcw, Hash, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
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

function relative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const railBtn = cn(
  "rounded-[8px] p-1.5 text-muted transition-colors duration-instant hover:bg-surface-2",
  focusRing,
  "focus-visible:ring-offset-surface",
);

export function GalleryPanel() {
  const images = useStore((s) => s.images);
  const status = useStore((s) => s.galleryStatus);
  const galleryError = useStore((s) => s.galleryError);
  const selectedBatchId = useStore((s) => s.selectedBatch?.[0]?.batchId ?? null);
  const selectBatch = useStore((s) => s.selectBatch);
  const clearGallery = useStore((s) => s.clearGallery);
  const loadGallery = useStore((s) => s.loadGallery);
  const restoreSettings = useStore((s) => s.restoreSettings);
  const patchSettings = useStore((s) => s.patchSettings);
  const setUI = useStore((s) => s.setUI);
  const [confirmClear, setConfirmClear] = useState(false);

  const groups = useMemo(() => groupByBatch(images), [images]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-soft p-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-fg">Gallery</span>
          {status === "ready" && (
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted">{images.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {status === "ready" && images.length > 0 && (
            <button
              type="button"
              aria-label="Clear all"
              title="Clear all"
              onClick={() => setConfirmClear(true)}
              className={cn(railBtn, "hover:text-danger")}
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Collapse gallery"
            title="Collapse gallery — ]"
            onClick={() => setUI({ galleryOpen: false })}
            className={cn(railBtn, "hover:text-fg")}
          >
            <PanelRightClose className="size-4" />
          </button>
        </div>
      </div>

      {status === "loading" ? (
        <div className="min-h-0 flex-1 overflow-hidden p-2.5">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="motion-keep aspect-square rounded-[10px]"
                style={{
                  background: "linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)",
                  backgroundSize: "460px 100%",
                  animation: "shimmer 1.4s linear infinite",
                }}
              />
            ))}
          </div>
        </div>
      ) : status === "error" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="size-6 text-danger" />
          <div>
            <p className="text-[13px] font-semibold text-fg">Couldn&apos;t open local gallery storage</p>
            <p className="mt-1 text-[12px] text-muted">{galleryError}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void loadGallery()}>
            <RotateCcw className="size-4" /> Retry
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <ImageOff className="size-6 text-muted" />
          <p className="text-[12.5px] text-muted">Your generations will appear here.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          <div className="grid grid-cols-2 gap-2">
            {groups.map((g) => (
              <div key={g.batchId} className="group relative">
                <button
                  type="button"
                  onClick={() => selectBatch(g.batchId)}
                  title={g.settings.prompt || "(no prompt)"}
                  aria-label={`Batch of ${g.count}, seed ${g.seed}, ${relative(g.timestamp)}`}
                  className={cn(
                    "relative block w-full overflow-hidden rounded-[10px] border",
                    "transition-[border-color,box-shadow] duration-fast",
                    focusRing,
                    "focus-visible:ring-offset-surface",
                    g.batchId === selectedBatchId ? "border-accent ring-2 ring-accent" : "border-border-soft hover:border-border",
                  )}
                  // True aspect, not a hardcoded square — the default 832×1216 is 2:3.
                  style={{ aspectRatio: `${g.settings.width} / ${g.settings.height}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.dataUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-base ease-standard group-hover:scale-[1.06]"
                  />
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
                  {/* At ~125px the mono line carries the recognition value, not the prompt. */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-left opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100">
                    <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-white/90">
                      {g.seed} · {g.settings.width}×{g.settings.height}
                    </span>
                    <span className="text-[10px] text-white/60">{relative(g.timestamp)}</span>
                  </span>
                </button>

                {/* Reuse was a three-gesture path ending at an unlabelled glyph in the canvas
                    toolbar; surface it where people actually look at images. */}
                <div className="pointer-events-none absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity duration-fast group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label="Use these settings"
                    title="Use these settings"
                    onClick={() => restoreSettings(g.settings)}
                    className={cn("rounded-[6px] bg-black/65 p-1.5 text-white backdrop-blur-sm transition-colors duration-instant hover:bg-black/85", focusRing, "focus-visible:ring-offset-black")}
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Copy seed to settings"
                    title="Copy seed to settings"
                    onClick={() => patchSettings({ seed: g.seed })}
                    className={cn("rounded-[6px] bg-black/65 p-1.5 text-white backdrop-blur-sm transition-colors duration-instant hover:bg-black/85", focusRing, "focus-visible:ring-offset-black")}
                  >
                    <Hash className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Replaces a native confirm() that broke the visual surface. */}
      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Delete all images?"
        description={`This permanently removes all ${images.length} images from local storage. It can't be undone.`}
        className="max-w-sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void clearGallery();
              setConfirmClear(false);
            }}
          >
            <Trash2 className="size-4" /> Delete all
          </Button>
        </div>
      </Modal>
    </div>
  );
}

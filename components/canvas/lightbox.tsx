"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { downloadDataUrl } from "@/lib/image-actions";
import { useFocusTrap, useDelayedUnmount } from "@/lib/use-overlay";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export function Lightbox() {
  const batch = useStore((s) => s.selectedBatch);
  const focusedIndex = useStore((s) => s.focusedIndex);
  const setUI = useStore((s) => s.setUI);
  const restoreSettings = useStore((s) => s.restoreSettings);
  const selectImage = useStore((s) => s.selectImage);
  const [zoom, setZoom] = useState(1);

  const open = focusedIndex !== null && !!batch && focusedIndex < batch.length;
  const mounted = useDelayedUnmount(open, 160);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  const close = () => {
    setZoom(1);
    setUI({ focusedIndex: null });
  };
  const nav = (d: number) => {
    if (!batch || focusedIndex === null) return;
    setZoom(1);
    const nextIndex = Math.min(batch.length - 1, Math.max(0, focusedIndex + d));
    setUI({ focusedIndex: nextIndex });
    if (nextIndex !== focusedIndex) selectImage(batch[nextIndex], true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") nav(-1);
      if (e.key === "ArrowRight") nav(1);
      // Zoom was pointer-only — the two magnifier buttons were the sole way to reach it.
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(0.5, z - 0.25));
      if (e.key === "0") setZoom(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusedIndex, batch]);

  if (!mounted || typeof document === "undefined" || !batch) return null;
  const idx = Math.min(focusedIndex ?? 0, batch.length - 1);
  const img = batch[idx];
  if (!img) return null;

  return createPortal(
    <div
      ref={trapRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${idx + 1} of ${batch.length}, seed ${img.seed}`}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-black/90 outline-none transition-[opacity,transform]",
        open ? "opacity-100 scale-100 duration-base ease-out" : "opacity-0 scale-[0.98] duration-fast ease-in",
      )}
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
        <span className="font-[family-name:var(--font-mono)] text-[12px] text-white/70">
          {idx + 1} / {batch.length} · seed {img.seed}
        </span>
        <div className="flex items-center gap-1">
          <IconButton variant="lightbox" label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
            <ZoomOut />
          </IconButton>
          <IconButton variant="lightbox" label="Zoom in" disabled={zoom >= 4} onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
            <ZoomIn />
          </IconButton>
          <IconButton variant="lightbox" label="Reuse settings" onClick={() => restoreSettings(img.settings)}>
            <RotateCcw />
          </IconButton>
          <IconButton variant="lightbox" label="Download" onClick={() => downloadDataUrl(img.dataUrl, img.filename)}>
            <Download />
          </IconButton>
          <IconButton variant="lightbox" label="Close" onClick={close}>
            <X />
          </IconButton>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        {batch.length > 1 && (
          <IconButton variant="lightbox" size="lg" label="Previous" disabled={idx === 0} onClick={() => nav(-1)} className="absolute left-3 top-1/2 -translate-y-1/2">
            <ChevronLeft />
          </IconButton>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.dataUrl}
          alt=""
          style={{ transform: `scale(${zoom})` }}
          className="max-h-full max-w-full object-contain transition-transform duration-base ease-out"
        />
        {batch.length > 1 && (
          <IconButton variant="lightbox" size="lg" label="Next" disabled={idx === batch.length - 1} onClick={() => nav(1)} className="absolute right-3 top-1/2 -translate-y-1/2">
            <ChevronRight />
          </IconButton>
        )}
      </div>
    </div>,
    document.body,
  );
}

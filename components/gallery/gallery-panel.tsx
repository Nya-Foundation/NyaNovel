"use client";

import { useMemo, useState } from "react";
import { Trash2, PanelRightClose, ImageOff, RotateCcw, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PanelHeader } from "@/components/ui/panel-header";
import { GalleryTile } from "./gallery-tile";
import type { GalleryImage } from "@/lib/db/gallery";

/** One representative entry per batch, newest first. */
function groupByBatch(images: GalleryImage[]) {
  const batches = new Map<number, GalleryImage[]>();
  for (const img of images) {
    const batch = batches.get(img.batchId) ?? [];
    batch.push(img);
    batches.set(img.batchId, batch);
  }
  return [...batches.values()].map((batch) => {
    // selectBatch opens batchIndex 0, so the gallery tile must preview that same result. New
    // in-memory batches are stored in reverse display order and previously showed the final sample
    // while opening/loading the first sample and its unrelated seed.
    const representative = batch.reduce((first, image) => image.batchIndex < first.batchIndex ? image : first);
    return { ...representative, count: batch.length };
  });
}

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
  const openBatch = (batchId: number) => {
    selectBatch(batchId, true);
    // On compact layouts the gallery is a drawer over the stage; selecting a result should reveal
    // it immediately. The persistent desktop panel stays open for rapid history browsing.
    if (window.matchMedia("(max-width: 1279px)").matches) setUI({ galleryOpen: false });
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Gallery"
        subtitle={status === "ready"
          ? `${groups.length} batch${groups.length === 1 ? "" : "es"} · ${images.length} image${images.length === 1 ? "" : "s"}`
          : "Local history"}
        actions={
          <>
          {status === "ready" && images.length > 0 && (
            <IconButton
              label="Clear all"
              size="sm"
              onClick={() => setConfirmClear(true)}
              className="hover:text-danger"
            >
              <Trash2 />
            </IconButton>
          )}
          <IconButton
            label="Collapse gallery"
            size="sm"
            title="Collapse gallery — ]"
            onClick={() => setUI({ galleryOpen: false })}
          >
            <PanelRightClose />
          </IconButton>
          </>
        }
      />

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
              <GalleryTile
                key={g.batchId}
                batch={g}
                selected={g.batchId === selectedBatchId}
                onOpen={() => openBatch(g.batchId)}
                onRestore={() => restoreSettings(g.settings)}
                onUseSeed={() => patchSettings({ seed: g.seed })}
              />
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

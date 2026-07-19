"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileImage } from "lucide-react";
import { importRecipeFile } from "@/lib/recipe-import";
import { spring, usePrefersReducedMotion } from "@/lib/motion";

/** True only for a drag carrying files — dragging selected text or an image within the page must
 *  not arm a full-stage import target. */
function isFileDrag(e: DragEvent) {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

/**
 * Whole-window drop target for NovelAI PNG recipes.
 *
 * Listening on `window` rather than on the stage element means the drop lands wherever the user
 * releases — over the canvas, the sidebar, the gallery — which is what people actually do. The
 * overlay is only *drawn* over the canvas, so the invitation still points at the centre.
 */
export function RecipeDropzone() {
  const [active, setActive] = useState(false);
  const reduced = usePrefersReducedMotion();

  // dragenter/dragleave fire for every nested element the pointer crosses, so a boolean flickers
  // as the cursor moves between children. Counting enters against leaves is the standard fix.
  const depth = useRef(0);

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      depth.current += 1;
      setActive(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    // Without preventDefault on dragover the browser navigates to the dropped file and the whole
    // studio — unsaved prompt included — is replaced by a raw PNG.
    const onOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      depth.current = 0;
      setActive(false);
      void importRecipeFile(e.dataTransfer?.files?.[0]);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          // Purely an indicator: the window listeners above own the actual drop, so this must never
          // intercept pointer events or it would swallow the event it exists to advertise.
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
          <motion.div
            className="relative flex flex-col items-center gap-4 rounded-[var(--radius-card-lg)] border-2 border-dashed border-accent bg-surface/90 px-10 py-9 text-center shadow-[var(--shadow-pop)]"
            initial={{ scale: reduced ? 1 : 0.94, y: reduced ? 0 : 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: reduced ? 1 : 0.97, opacity: 0 }}
            transition={reduced ? { duration: 0 } : spring.soft}
          >
            <motion.span
              className="flex size-14 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-[var(--glow-accent)]"
              animate={reduced ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <FileImage className="size-7" />
            </motion.span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-[19px] font-bold tracking-[-0.01em] text-fg">
                Drop to load this recipe
              </p>
              <p className="mt-1 max-w-xs text-[12.5px] text-muted">
                A NovelAI PNG restores its prompt, seed, model, and sampling into the composer.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

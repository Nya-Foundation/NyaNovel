"use client";

import { toast } from "sonner";
import { useStore } from "./store";

/**
 * Import a NovelAI PNG recipe into the composer.
 *
 * Lifted out of the old sidebar-only RecipeImporter so the canvas drop zone, the command palette,
 * and the file picker all run the same path — including the same validation, the same toast ids,
 * and the same dynamic import boundary. Three copies of this would be three chances to diverge.
 *
 * Returns whether the recipe was applied, so callers can decide what to do with focus afterwards.
 */
export async function importRecipeFile(file: File | null | undefined): Promise<boolean> {
  if (!file) return false;

  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
  if (!isPng) {
    toast.error("Choose a NovelAI PNG — generation metadata is not reliably preserved in other formats.");
    return false;
  }

  const { restoreSettings, setUI } = useStore.getState();
  // One toast id for the whole operation: the success and error toasts below reuse it, so each
  // replaces this spinner in place rather than stacking a second card next to it. Nothing dismisses
  // it explicitly — a dismiss here would race the replacement and blank the result.
  const TOAST_ID = "recipe-import";
  toast.loading("Reading generation metadata…", { id: TOAST_ID });

  try {
    // PNG/EXIF/stealth decoders are substantial and only needed after this deliberate gesture.
    // Keep them out of the initial studio bundle.
    const { importNovelAIRecipe } = await import("@/lib/nai/import-recipe");
    const recipe = await importNovelAIRecipe(file);

    restoreSettings(recipe.settings, {
      message: `Imported ${recipe.importedFields.length} recipe fields from ${file.name}`,
      toastId: TOAST_ID,
    });
    // Reveal the composer — the recipe just rewrote it, and on compact layouts (or with the rail
    // collapsed via `[`) the destination is off screen, so the import looks like it did nothing.
    setUI({ activeTab: "basic", settingsCollapsed: false });

    if (recipe.omittedReferences) {
      toast.warning(
        "Reference strengths were found, but source reference images are not embedded in NovelAI PNGs.",
      );
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The image could not be read.";
    toast.error(message, { id: TOAST_ID });
    return false;
  }
}

/**
 * Opens a native file picker and imports the chosen PNG. This is the keyboard-reachable path to
 * the same feature — drag-and-drop alone would make recipe import unusable without a pointer.
 */
export function pickRecipeFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,.png";
  input.addEventListener("change", () => {
    void importRecipeFile(input.files?.[0]);
  });
  input.click();
}

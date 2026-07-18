"use client";

import { useRef, useState } from "react";
import { FileImage, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { focusRing } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function RecipeImporter() {
  const restoreSettings = useStore((s) => s.restoreSettings);
  const setUI = useStore((s) => s.setUI);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const importFile = async (file: File | undefined) => {
    if (!file || loading) return;
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    if (!isPng) {
      toast.error("Choose a NovelAI PNG — generation metadata is not reliably preserved in other formats.");
      return;
    }

    setLoading(true);
    try {
      // PNG/EXIF/stealth decoders are substantial and only needed after this deliberate gesture.
      // Keep them out of the initial studio bundle.
      const { importNovelAIRecipe } = await import("@/lib/nai/import-recipe");
      const recipe = await importNovelAIRecipe(file);
      restoreSettings(recipe.settings, {
        message: `Imported ${recipe.importedFields.length} recipe fields from ${file.name}`,
        toastId: "recipe-loaded",
      });
      setUI({ activeTab: "basic", settingsCollapsed: false });
      if (recipe.omittedReferences) {
        toast.warning("Reference strengths were found, but source reference images are not embedded in NovelAI PNGs.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The image could not be read.";
      toast.error(message);
    } finally {
      setLoading(false);
      setDragging(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,.png"
        className="hidden"
        onChange={(event) => void importFile(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={loading}
        aria-busy={loading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          void importFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-dashed px-3 py-2.5 text-left",
          "transition-[background-color,border-color,transform] duration-fast ease-out disabled:pointer-events-none disabled:opacity-60",
          dragging
            ? "border-accent bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] scale-[1.01]"
            : "border-border bg-surface-2 hover:border-accent/70 hover:bg-surface-3",
          focusRing,
          "focus-visible:ring-offset-surface",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-surface text-accent shadow-[var(--shadow-card)]">
          {loading ? <Loader2 className="motion-keep size-4 animate-spin" /> : dragging ? <FileImage className="size-4" /> : <Upload className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-semibold text-fg">
            {loading ? "Reading generation metadata…" : dragging ? "Drop to import this recipe" : "Drop a NovelAI PNG"}
          </span>
          <span className="block truncate text-[11.5px] text-muted">or browse · prompt, seed, model, sampling and more</span>
        </span>
      </button>
    </div>
  );
}

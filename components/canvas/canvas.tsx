"use client";

import { Download, Copy, Trash2, Wand2, RotateCcw, Hash, Maximize2, AlertTriangle, KeyRound } from "lucide-react";
import { useStore } from "@/lib/store";
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

function EmptyState() {
  const patch = useStore((s) => s.patchSettings);
  const prompt = useStore((s) => s.settings.prompt);
  const setUI = useStore((s) => s.setUI);

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
    <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden p-8 text-center">
      {/* soft ambient accent glow so the stage is never a dead black void */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.18] blur-[100px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative flex size-16 items-center justify-center rounded-2xl border border-border-soft bg-surface-2 shadow-[var(--shadow-card)]">
        <BrandLogo variant="mark" className="size-10" />
      </div>
      <div className="relative">
        <h2 className="font-[family-name:var(--font-display)] text-[24px] font-bold tracking-[-0.02em] text-fg">
          What should we imagine?
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-muted">
          Describe your image and hit Generate. It streams in here and lands in your gallery.
        </p>
      </div>
      <div className="relative grid w-full max-w-2xl gap-2 sm:grid-cols-3">
        {EXAMPLES.map((example) => (
          <button
            key={example.title}
            type="button"
            onClick={() => applyExample(example.prompt)}
            className={cn(
              "group rounded-[var(--radius-card)] border border-border-soft bg-surface-2 px-3.5 py-3 text-left shadow-[var(--shadow-card)]",
              "transition-[color,border-color,background-color,transform] duration-fast ease-out hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-3",
              focusRing,
            )}
          >
            <span className="block text-[12.5px] font-bold text-fg">{example.title}</span>
            <span className="mt-0.5 block truncate text-[11.5px] text-muted group-hover:text-fg-2">
              {example.prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
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

  const focusThis = () => setUI({ focusedIndex: Math.max(0, batch.findIndex((b) => b.id === img.id)) });

  return (
    <div className="flex h-full flex-col">
      {/* stage with ambient backdrop */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`bg-${img.id}`}
          src={img.dataUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-3xl saturate-150"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg/70" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={img.id}
          src={img.dataUrl}
          alt=""
          onClick={focusThis}
          className="relative max-h-full max-w-full cursor-zoom-in rounded-[var(--radius-card)] object-contain shadow-[var(--shadow-pop)] ring-1 ring-white/10"
          style={{ animation: "fadeIn var(--duration-base) var(--ease-out)" }}
        />
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
              <button
                key={b.id}
                id={`batch-opt-${b.id}`}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={`Result ${i + 1} of ${batch.length}, seed ${b.seed}`}
                tabIndex={active ? 0 : -1}
                onClick={() => selectImage(b, true)}
                className={cn(
                  // Same radius as the stage image above it — both frame the same picture and are
                  // on screen together, so a 10px-vs-14px disagreement is actually visible.
                  "size-14 shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-card)]",
                  "transition-[opacity,transform,box-shadow] duration-fast ease-out",
                  focusRing,
                  active
                    ? "ring-2 ring-accent ring-offset-2 ring-offset-bg"
                    : "opacity-55 hover:opacity-100 hover:scale-105",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.dataUrl} alt="" className="h-full w-full object-cover" />
              </button>
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

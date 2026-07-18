"use client";

import { Download, Copy, Trash2, Wand2, RotateCcw, Hash, Sparkles, Maximize2, AlertTriangle, KeyRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { focusRing } from "@/components/ui/input";
import { MODEL_OPTIONS } from "@/lib/nai/models";
import { downloadDataUrl, copyImageToClipboard } from "@/lib/image-actions";
import { StreamingGrid } from "./streaming-grid";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/db/gallery";

const modelLabel = (v: string) => MODEL_OPTIONS.find((m) => m.value === v)?.label ?? v;

const EXAMPLES = [
  "1girl, cat ears, cherry blossoms, soft light, masterpiece",
  "cyberpunk city, neon rain, cinematic, ultra detailed",
  "cozy cafe, warm afternoon, watercolor, wlop",
];

function EmptyState() {
  const patch = useStore((s) => s.patchSettings);
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden p-8 text-center">
      {/* soft ambient accent glow so the stage is never a dead black void */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.18] blur-[100px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border-soft bg-surface-2 shadow-[var(--shadow-card)]">
        <Sparkles className="size-6 text-accent" />
      </div>
      <div className="relative">
        <h2 className="font-[family-name:var(--font-display)] text-[24px] font-bold tracking-[-0.02em] text-fg">
          What should we imagine?
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-muted">
          Describe your image and hit Generate. It streams in here and lands in your gallery.
        </p>
      </div>
      <div className="relative flex max-w-lg flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => patch({ prompt: ex })}
            className={cn(
              "max-w-[220px] truncate rounded-[var(--radius-pill)] border border-border-soft bg-surface-2 px-3.5 py-1.5 text-[12.5px] text-fg-2 shadow-[var(--shadow-card)]",
              "transition-[color,border-color,transform] duration-fast ease-out hover:border-border hover:text-fg hover:-translate-y-0.5",
              focusRing,
            )}
          >
            {ex}
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

function ActionBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-[8px] text-fg-2 transition-colors duration-instant hover:bg-surface-3 [&_svg]:size-[17px]",
        focusRing,
        "focus-visible:ring-offset-surface",
        danger ? "hover:text-danger" : "hover:text-fg",
      )}
    >
      {children}
    </button>
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
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
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
          style={{ animation: "fadeIn 240ms ease-out" }}
        />
        <button
          type="button"
          onClick={focusThis}
          aria-label="Expand"
          className={cn(
            "absolute right-8 top-8 flex size-9 items-center justify-center rounded-[10px] bg-black/45 text-white/90 backdrop-blur-md",
            "transition-[background-color,transform] duration-fast ease-out hover:bg-black/65 hover:scale-105",
            focusRing,
          )}
        >
          <Maximize2 className="size-[18px]" />
        </button>
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
            selectImage(batch[next]);
            // Focus follows selection so the ring tracks the arrow keys.
            (document.getElementById(`batch-opt-${batch[next].id}`) as HTMLButtonElement | null)?.focus();
          }}
          className="flex shrink-0 justify-center gap-2 px-4 pb-2"
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
                onClick={() => selectImage(b)}
                className={cn(
                  "size-14 shrink-0 cursor-pointer overflow-hidden rounded-[10px]",
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
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-t border-border-soft bg-surface/60 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <Meta>
            <Hash className="size-3 opacity-60" />
            {img.seed}
          </Meta>
          <Meta>{img.settings.width}×{img.settings.height}</Meta>
          <Meta>{img.settings.steps} steps</Meta>
          <Meta>CFG {img.settings.scale}</Meta>
          <span className="hidden pl-1 text-[12px] text-muted lg:inline">{modelLabel(img.settings.model)}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setUI({ showDirector: true })}
            className={cn(
              "mr-1 inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-surface-2 px-3 text-[13px] font-semibold text-fg transition-colors duration-instant hover:bg-surface-3",
              focusRing,
              "focus-visible:ring-offset-surface",
            )}
          >
            {/* 3.1: no text-accent here — accent is reserved for the primary action. */}
            <Wand2 className="size-4" /> Director
          </button>
          {/* Promoted from a bare 17px glyph in a row of five identical icons — reuse is the whole
              point of storing per-image param snapshots. */}
          <button
            type="button"
            onClick={() => restoreSettings(img.settings)}
            className={cn(
              "mr-1 inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-surface-2 px-3 text-[13px] font-semibold text-fg transition-colors duration-instant hover:bg-surface-3",
              focusRing,
              "focus-visible:ring-offset-surface",
            )}
          >
            <RotateCcw className="size-4" /> Reuse settings
          </button>
          <ActionBtn label="Copy seed to settings" onClick={() => patchSettings({ seed: img.seed })}>
            <Hash />
          </ActionBtn>
          <ActionBtn label="Download" onClick={() => downloadDataUrl(img.dataUrl, img.filename)}>
            <Download />
          </ActionBtn>
          <ActionBtn label="Copy image" onClick={() => copyImageToClipboard(img.dataUrl)}>
            <Copy />
          </ActionBtn>
          <ActionBtn label="Delete" danger onClick={() => img.id && deleteImage(img.id)}>
            <Trash2 />
          </ActionBtn>
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

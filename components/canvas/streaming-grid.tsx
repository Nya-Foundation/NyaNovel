"use client";

import { useStore, type StreamTile } from "@/lib/store";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

function gridCols(n: number) {
  if (n <= 1) return "grid-cols-1";
  if (n <= 4) return "grid-cols-2";
  if (n <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

/** Live streaming previews — each sample denoises in place behind a progress ring. */
export function StreamingGrid({ tiles, backdrop }: { tiles: StreamTile[]; backdrop?: string | null }) {
  const steps = useStore((s) => s.settings.steps);

  return (
    <div className="relative flex h-full items-center justify-center overflow-auto p-6">
      {/* The image you were looking at when you pressed Generate, held as ambient context so the
          stage never blanks mid-commit. Same treatment as the BatchView backdrop. */}
      {backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backdrop}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.18] blur-3xl saturate-150"
        />
      )}
      <div className={cn("relative grid w-full max-w-4xl gap-4", gridCols(tiles.length))}>
        {tiles.map((t) => (
          <div
            key={t.sampleIndex}
            className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface-2"
          >
            {t.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.dataUrl}
                alt=""
                className={cn(
                  "h-full w-full object-cover transition-[filter] duration-base ease-out",
                  t.status !== "done" && "blur-[6px]",
                )}
              />
            ) : (
              <div
                className="motion-keep absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)",
                  backgroundSize: "460px 100%",
                  animation: "shimmer 1.4s linear infinite",
                }}
              />
            )}
            {t.status !== "done" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <ProgressRing progress={t.progress} size={52}>
                  {t.stepIndex}/{steps}
                </ProgressRing>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

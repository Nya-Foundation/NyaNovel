"use client";

import { useEffect, useState } from "react";
import { useStore, type StreamTile } from "@/lib/store";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

function gridCols(n: number) {
  if (n <= 1) return "grid-cols-1";
  if (n <= 4) return "grid-cols-2";
  if (n <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Ticks once a second while a run is in flight, so waits show elapsed time rather than a frozen ring. */
function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return startedAt ? now - startedAt : 0;
}

/** Live streaming previews — each sample denoises in place behind a progress ring. */
export function StreamingGrid({ tiles, backdrop }: { tiles: StreamTile[]; backdrop?: string | null }) {
  const steps = useStore((s) => s.settings.steps);
  const startedAt = useStore((s) => s.runStartedAt);
  const elapsed = useElapsed(startedAt);

  const done = tiles.filter((t) => t.status === "done").length;
  const mean = tiles.length ? tiles.reduce((a, t) => a + t.progress, 0) / tiles.length : 0;
  // Retries on 429/5xx use a 2s base delay, so "queued" can legitimately last tens of seconds.
  const stalled = tiles.every((t) => t.status === "initializing") && elapsed > 15000;

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-auto p-6">
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

      <div className="relative mb-3 flex items-center gap-2 text-[12.5px]">
        <span className="font-semibold text-fg">
          {stalled ? "Still waiting — NovelAI may be busy" : done === tiles.length ? "Finishing up" : "Generating"}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[12px] tabular-nums text-muted">
          {done}/{tiles.length} · {Math.round(mean * 100)}% · {mmss(elapsed)}
        </span>
      </div>

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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/25">
                {t.status === "initializing" ? (
                  <>
                    {/* An indeterminate arc, not a 0/28 ring frozen over a shimmer — that was
                        indistinguishable from a dead request. */}
                    <span
                      className="motion-keep size-[26px] rounded-full border-2 border-white/25 border-t-accent"
                      style={{ animation: "spin 0.9s linear infinite" }}
                    />
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-white/80">Queued</span>
                  </>
                ) : (
                  <ProgressRing progress={t.progress} size={52}>
                    {t.stepIndex}/{steps}
                  </ProgressRing>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useStore, type StreamTile } from "@/lib/store";
import { DEFAULT_CONNECTION } from "@/lib/nai/client";
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
  const width = useStore((s) => s.settings.width);
  const height = useStore((s) => s.settings.height);
  const elapsed = useElapsed(startedAt);
  // Don't attribute a stall to NovelAI when the user pointed the client at their own proxy.
  const isDirect = useStore((s) => (s.connection?.host ?? DEFAULT_CONNECTION.host) === DEFAULT_CONNECTION.host);

  // Blur scales with tile size. A flat radius that reads as "resolving" on a single large tile
  // erases composition entirely across a 9-up grid — during exactly the window where the user is
  // deciding whether to hit Stop.
  const maxBlur = tiles.length <= 1 ? 14 : tiles.length <= 4 ? 9 : 6;

  const done = tiles.filter((t) => t.status === "done").length;
  const mean = tiles.length ? tiles.reduce((a, t) => a + t.progress, 0) / tiles.length : 0;
  // Retries on 429/5xx use a 2s base delay, so "queued" can legitimately last tens of seconds.
  const stalled = tiles.every((t) => t.status === "initializing") && elapsed > 15000;

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-auto p-3 sm:p-6">
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

      <div className="relative mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[12.5px]">
        <span className="font-semibold text-fg">
          {stalled
            ? `Still waiting — ${isDirect ? "NovelAI" : "the host"} may be busy`
            : done === tiles.length
              ? "Finishing up"
              : "Generating"}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[12px] tabular-nums text-muted">
          {done}/{tiles.length} · {Math.round(mean * 100)}% · {mmss(elapsed)}
        </span>
      </div>

      <div className={cn("relative grid w-full max-w-4xl gap-2 sm:gap-4", gridCols(tiles.length))}>
        {tiles.map((t) => (
          <div
            key={t.sampleIndex}
            // The real target aspect, not a hardcoded 3:4 — a landscape batch used to preview in
            // portrait boxes and then reflow the moment it committed.
            style={{ aspectRatio: `${width} / ${height}` }}
            className="relative flex items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface-2"
          >
            {t.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.dataUrl}
                alt=""
                // THE SIGNATURE: blur radius is bound to denoise progress, so the picture pulls
                // into focus as the model resolves it rather than sitting behind a flat frost and
                // popping. `(1-p)^1.5` sits below linear throughout — composition becomes legible
                // early (so you can abort sooner) and the tail is gentle, so the tile settles
                // instead of lurching at the end.
                //
                // duration-fast, NOT duration-base: intermediates arrive ~200ms apart, so a 240ms
                // transition would never settle and the blur would permanently lag real progress.
                //
                // Under prefers-reduced-motion the global rule collapses the transition and the
                // blur steps instead of gliding. That is the correct degradation — the information
                // survives, the animation doesn't — so this deliberately does not opt out via
                // .motion-keep the way the spinner and shimmer do.
                className="h-full w-full object-cover transition-[filter] duration-fast ease-out"
                style={{
                  filter:
                    t.status === "done"
                      ? undefined
                      : `blur(${((1 - t.progress) ** 1.5 * maxBlur).toFixed(1)}px)`,
                }}
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

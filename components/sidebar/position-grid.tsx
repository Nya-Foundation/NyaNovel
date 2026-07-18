"use client";

import { useRef } from "react";

/** Click/drag to place a character's center as (x,y) in 0..1. */
export function PositionGrid({
  center,
  onChange,
}: {
  center: { x: number; y: number };
  onChange: (c: { x: number; y: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const pick = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    onChange({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  };

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        pick(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) pick(e.clientX, e.clientY);
      }}
      className="relative aspect-[3/4] w-full cursor-crosshair overflow-hidden rounded-[var(--radius-input)] border border-border bg-surface-2"
      style={{
        backgroundImage:
          "linear-gradient(var(--border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--border-soft) 1px, transparent 1px)",
        backgroundSize: "20% 20%",
      }}
    >
      <div
        className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow"
        style={{ left: `${center.x * 100}%`, top: `${center.y * 100}%` }}
      />
    </div>
  );
}

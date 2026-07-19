"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { spring, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SliderProps = {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (v: number) => void;
  /** Format the numeric readout (defaults to the raw value). Also spoken via aria-valuetext. */
  format?: (v: number) => string;
  /** Show the min/max endpoints under the track — for knobs whose scale isn't obvious. */
  showRange?: boolean;
  className?: string;
  disabled?: boolean;
};

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onValueChange,
  format,
  showRange,
  className,
  disabled,
}: SliderProps) {
  const id = useId();
  const text = format ? format(value) : String(value);
  const reduced = usePrefersReducedMotion();
  const [engaged, setEngaged] = useState(false);

  // Guard the degenerate min === max case, which would otherwise divide by zero and place the
  // thumb at NaN% — CSS then drops the declaration and the thumb parks at the far left.
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={cn("w-full", className)}>
      {/* The readout is always rendered. It used to be nested inside the label guard, so the six
          call sites that supply their label via <Field> showed a bare track with no number. */}
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        {label !== undefined ? (
          <label htmlFor={id} className="text-[12px] font-medium text-fg-2">
            {label}
          </label>
        ) : (
          <span aria-hidden />
        )}
        <span
          className={cn(
            "font-[family-name:var(--font-mono)] text-[12px] tabular-nums transition-colors duration-instant",
            engaged ? "text-accent" : "text-muted",
          )}
        >
          {text}
        </span>
      </div>

      {/* The native input stays the only interactive element — it keeps keyboard stepping, the
          range role, and touch behaviour for free. It's rendered transparent on top of the painted
          track below, so the visuals are ours and the semantics are the platform's. */}
      <div className="relative h-4">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-surface-3"
        >
          <span
            className={cn("absolute inset-y-0 left-0 rounded-full bg-accent", disabled && "opacity-50")}
            style={{ width: `${pct}%` }}
          />
        </span>

        <motion.span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface shadow-[var(--shadow-card)]",
            disabled && "opacity-50",
          )}
          style={{ left: `${pct}%` }}
          animate={{ scale: engaged && !reduced ? 1.25 : 1 }}
          transition={spring.snap}
        />

        {/* Value bubble — only while engaged, so the resting control stays quiet. */}
        <AnimatePresence>
          {engaged && !disabled && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute bottom-[calc(100%+6px)] -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-fg px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px] font-semibold tabular-nums text-bg shadow-[var(--shadow-pop)]"
              style={{ left: `${pct}%` }}
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.95 }}
              transition={reduced ? { duration: 0 } : spring.snap}
            >
              {text}
            </motion.span>
          )}
        </AnimatePresence>

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          // Without this the formatted readout is visible but never spoken — "slider, 0.6"
          // instead of "Guidance rescale, 0.60".
          aria-valuetext={text}
          onChange={(e) => onValueChange(Number(e.target.value))}
          onPointerDown={() => setEngaged(true)}
          onPointerUp={() => setEngaged(false)}
          onPointerCancel={() => setEngaged(false)}
          // Keyboard users get the bubble too — it's tied to focus, not just to dragging.
          onFocus={() => setEngaged(true)}
          onBlur={() => setEngaged(false)}
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent outline-none",
            "disabled:cursor-not-allowed",
            // The painted thumb above is the visible one; the native thumb is sized to match so the
            // grab target stays where it looks like it is, but is fully transparent.
            "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent",
            "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent",
            "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:rounded-full",
          )}
        />
      </div>

      {showRange && (
        <div className="mt-1 flex justify-between font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-muted/70">
          <span>{format ? format(min) : min}</span>
          <span>{format ? format(max) : max}</span>
        </div>
      )}
    </div>
  );
}

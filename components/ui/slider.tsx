"use client";

import { useId } from "react";
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
        <span className="font-[family-name:var(--font-mono)] text-[12px] tabular-nums text-muted">{text}</span>
      </div>
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
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 outline-none",
          "accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        )}
      />
      {showRange && (
        <div className="mt-1 flex justify-between font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-muted/70">
          <span>{format ? format(min) : min}</span>
          <span>{format ? format(max) : max}</span>
        </div>
      )}
    </div>
  );
}

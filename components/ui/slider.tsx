import { cn } from "@/lib/utils";

type SliderProps = {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (v: number) => void;
  /** Format the numeric readout (defaults to the raw value). */
  format?: (v: number) => string;
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
  className,
  disabled,
}: SliderProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* The readout is always rendered. It used to be nested inside the label guard, so the six
          call sites that supply their label via <Field> showed a bare track with no number. */}
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        {label !== undefined ? (
          <span className="text-[13px] font-semibold text-fg-2">{label}</span>
        ) : (
          <span aria-hidden />
        )}
        <span className="font-[family-name:var(--font-mono)] text-[12px] tabular-nums text-muted">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 outline-none",
          "accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        )}
      />
    </div>
  );
}

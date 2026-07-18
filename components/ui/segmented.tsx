import { useId } from "react";
import { focusRing } from "./input";
import { cn } from "@/lib/utils";

type SegmentedProps<T extends string> = {
  options: { value: T; label: string; badge?: number }[];
  value: T;
  onValueChange: (v: T) => void;
  className?: string;
  /** Tab semantics are only correct when this control switches panels. Off by default so the
      Aspect / Size-tier rows don't get announced as "Portrait, tab, 1 of 3". */
  asTabs?: boolean;
  "aria-label"?: string;
};

export function Segmented<T extends string>({
  options,
  value,
  onValueChange,
  className,
  asTabs = false,
  "aria-label": ariaLabel,
}: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const baseId = useId();
  const segId = (i: number) => `${baseId}-seg-${i}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % options.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next === null) return;
    e.preventDefault();
    onValueChange(options[next].value);
    // Move focus with the selection. Only the active segment is a tab stop, so without this focus
    // stranded on a button that had just been given tabIndex={-1}.
    requestAnimationFrame(() => document.getElementById(segId(next))?.focus());
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-[var(--radius-input)] border border-border-soft bg-surface-2 p-1",
        className,
      )}
      role={asTabs ? "tablist" : "radiogroup"}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {/* The pill travels instead of blinking between segments. */}
      <span
        aria-hidden
        className="absolute inset-y-1 rounded-[7px] bg-surface shadow-[var(--shadow-card)] ring-1 ring-[color-mix(in_oklab,var(--accent)_45%,transparent)] transition-[transform,width] duration-base ease-standard"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(calc(${index} * 100%))`,
        }}
      />
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            id={segId(i)}
            type="button"
            role={asTabs ? "tab" : "radio"}
            aria-selected={asTabs ? active : undefined}
            aria-checked={asTabs ? undefined : active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold",
              "transition-colors duration-fast",
              // This was the one control in the app without a ring offset, so its focus ring landed
              // exactly on the travelling pill's own accent ring and all but vanished — and since
              // only the active segment is a tab stop, that was the *only* focus signal a keyboard
              // user ever got on the sidebar's primary nav.
              // Deliberate exception: offset-1, not the usual offset-2. The container gutter is 4px,
              // so ring-2 + offset-2 would sit flush against its border and read as the whole strip
              // filling in. Offset colour is surface-2 because that's the container behind it.
              focusRing,
              "focus-visible:ring-offset-1 focus-visible:ring-offset-surface-2",
              active ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {opt.label}
            {opt.badge ? (
              <span className="rounded-[var(--radius-pill)] bg-accent px-1.5 font-[family-name:var(--font-mono)] text-[10px] font-bold leading-[15px] text-on-accent">
                {opt.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

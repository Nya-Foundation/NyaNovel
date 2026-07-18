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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (index + 1) % options.length : (index - 1 + options.length) % options.length;
    onValueChange(options[next].value);
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
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role={asTabs ? "tab" : "radio"}
            aria-selected={asTabs ? active : undefined}
            aria-checked={asTabs ? undefined : active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold",
              "transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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

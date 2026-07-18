import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full bg-surface-2 text-fg placeholder:text-muted border border-border outline-none transition-[border-color,box-shadow] duration-fast focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_22%,transparent)] disabled:opacity-50";

/**
 * The one keyboard-focus treatment. Every hand-rolled `<button>` gets this — the `ui/` primitives
 * already carry it, so without it focus visibly changes shape depending on which file you're in.
 * Override `ring-offset-*` to match the surface behind the control (surface inside panels,
 * black inside the lightbox).
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(fieldBase, "h-11 rounded-[var(--radius-input)] px-3.5 text-[14px]", className)}
      {...props}
    />
  );
}

/** Numeric field: mono digits, right-aligned — for seed, W/H, steps, CFG, etc. */
export function NumberInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="number"
      className={cn(
        fieldBase,
        "h-11 rounded-[var(--radius-input)] px-3.5 text-right font-[family-name:var(--font-mono)] text-[13px] tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

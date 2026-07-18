import { cn } from "@/lib/utils";

/** Static pill/badge. */
export function Chip({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border border-border-soft bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-fg-2",
        className,
      )}
      {...props}
    />
  );
}

/** Pressable chip that reflects an on/off state (used for toggles + quick selects). */
export function ToggleChip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-chip)] border px-3 py-1.5 text-[13px] font-medium transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        active
          ? "border-accent bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-fg"
          : "border-border bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

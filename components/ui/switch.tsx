import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Switch({ checked, onCheckedChange, disabled, className, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-[var(--radius-pill)] transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // The off state needs a border: on light mode `surface-3` sits a hair off the panel behind
        // it, so a borderless track read as a disabled control rather than an off one.
        // Border is always present, only its colour changes — otherwise the content box resizes
        // between states and the knob jumps a pixel mid-transition.
        "border",
        checked ? "border-transparent bg-accent" : "border-border bg-surface-3",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full shadow-[var(--shadow-card)] transition-transform duration-fast ease-standard",
          // A hardcoded white knob vanished against the light-mode off track. On accent it stays
          // white by using the accent's own foreground; off, it uses the raised surface token.
          checked ? "bg-on-accent translate-x-[19px]" : "bg-surface translate-x-[3px]",
        )}
      />
    </button>
  );
}

/** Label + switch row, the common form pattern. */
export function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  // The whole row is the target. It used to be a plain <div>, so the label was dead and only the
  // 40px pill could be hit — the smallest target in the app sitting next to the largest dead zone.
  return (
    <div
      // Ignore clicks that already landed on the Switch, or the row would toggle it straight back.
      onClick={(e) => {
        if (disabled) return;
        if ((e.target as HTMLElement).closest("[role=switch]")) return;
        onCheckedChange(!checked);
      }}
      className={cn(
        "-mx-1 flex items-center justify-between gap-3 rounded-[var(--radius-input)] px-1 py-0.5 transition-colors duration-instant",
        disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-2",
      )}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-fg-2">{label}</div>
        {hint && <div className="text-[12px] text-muted">{hint}</div>}
      </div>
      {/* Stays fully functional so Space/Enter still toggle it when focused. */}
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

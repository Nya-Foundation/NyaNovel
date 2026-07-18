import { cn } from "@/lib/utils";

/** Thin accent ring that fills with progress (0–1). Used on streaming sample tiles. */
export function ProgressRing({
  progress,
  size = 44,
  stroke = 3,
  className,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-base ease-out"
        />
      </svg>
      {children && (
        <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-fg">
          {children}
        </span>
      )}
    </div>
  );
}

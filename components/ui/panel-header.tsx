import { cn } from "@/lib/utils";

export function PanelHeader({
  title,
  subtitle,
  leading,
  actions,
  className,
}: {
  title: string;
  subtitle: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2 border-b border-border-soft px-3 py-3", className)}>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-fg">{title}</p>
        <div className="truncate text-[11px] text-muted">{subtitle}</div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}

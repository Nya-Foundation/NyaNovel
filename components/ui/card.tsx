import { cn } from "@/lib/utils";

export function Card({
  className,
  lg,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { lg?: boolean }) {
  return (
    <div
      className={cn(
        "bg-surface border border-border-soft text-fg",
        lg ? "rounded-[var(--radius-card-lg)]" : "rounded-[var(--radius-card)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-[family-name:var(--font-display)] text-[19px] font-bold leading-tight tracking-[-0.02em]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13.5px] text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

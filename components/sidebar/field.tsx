import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Labeled form field with optional hint. */
export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mb-4 last:mb-0", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && <p className="mt-1.5 text-[12px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

/** Titled section group inside a settings tab. */
export function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border-soft px-4 py-4 last:border-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

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
    <section className="border-b border-border-soft px-4 py-3 last:border-0">
      <div className="mb-2 flex items-center justify-between">
        {/* Groups must read before the fields they contain — this was the smallest text in the
            sidebar, in the same colour role as hint copy. */}
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-fg-2">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

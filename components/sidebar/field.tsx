"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { focusRing } from "@/components/ui/input";

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
  description,
  right,
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="border-b border-border-soft px-4 py-3 last:border-0">
      <div className={cn("flex items-center justify-between gap-2", open && "mb-2")}>
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "-ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-[7px] px-1 py-0.5 text-left",
              focusRing,
              "focus-visible:ring-offset-surface",
            )}
          >
            <ChevronDown
              className={cn("size-3.5 shrink-0 text-muted transition-transform duration-fast", !open && "-rotate-90")}
            />
            <span className="min-w-0">
              <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-fg-2">{title}</span>
              {description && <span className="block truncate text-[11px] text-muted">{description}</span>}
            </span>
          </button>
        ) : (
          <div className="min-w-0">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-fg-2">{title}</h3>
            {description && <p className="text-[11px] text-muted">{description}</p>}
          </div>
        )}
        {right}
      </div>
      <div id={contentId} hidden={!open} style={open ? { animation: "fadeIn var(--duration-fast) var(--ease-out)" } : undefined}>
        {children}
      </div>
    </section>
  );
}

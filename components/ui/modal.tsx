"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap, useDelayedUnmount } from "@/lib/use-overlay";
import { IconButton } from "./icon-button";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose?: () => void;
  /** Hide the close button and ignore Escape/backdrop — for required flows like first-run connect. */
  dismissible?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** For dialogs that render their own heading in `children` instead of passing `title`. */
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
};

export function Modal({
  open,
  onClose,
  dismissible = true,
  title,
  description,
  ariaLabel,
  className,
  children,
}: ModalProps) {
  const mounted = useDelayedUnmount(open, 160);
  const panelRef = useFocusTrap<HTMLDivElement>(open);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, dismissible, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-state={open ? "open" : "closed"}>
      <div
        className={cn(
          "absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity ease-in",
          open ? "opacity-100 duration-fast" : "opacity-0 duration-fast",
        )}
        style={open ? { animation: "fadeIn var(--duration-fast) var(--ease-out)" } : undefined}
        onClick={() => dismissible && onClose?.()}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-[var(--radius-card-lg)] border border-border bg-surface p-6 shadow-2xl outline-none",
          "transition-[opacity,transform]",
          open ? "opacity-100 translate-y-0 duration-base ease-out" : "opacity-0 translate-y-1.5 duration-fast ease-in",
        )}
        style={open ? { animation: "fadeUp var(--duration-base) var(--ease-out)" } : undefined}
      >
        {(title || (dismissible && onClose)) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 id={titleId} className="font-[family-name:var(--font-display)] text-[20px] font-bold tracking-[-0.02em] text-fg">
                  {title}
                </h2>
              )}
              {description && <p id={descId} className="mt-1 text-[13.5px] text-muted">{description}</p>}
            </div>
            {dismissible && onClose && (
              <IconButton
                label="Close"
                size="sm"
                onClick={onClose}
                className="-mr-1 -mt-1"
              >
                <X />
              </IconButton>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

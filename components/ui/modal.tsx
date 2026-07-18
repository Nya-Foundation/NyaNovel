"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { focusRing } from "./input";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose?: () => void;
  /** Hide the close button and ignore Escape/backdrop — for required flows like first-run connect. */
  dismissible?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function Modal({
  open,
  onClose,
  dismissible = true,
  title,
  description,
  className,
  children,
}: ModalProps) {
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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        style={{ animation: "fadeIn var(--duration-fast) var(--ease-out)" }}
        onClick={() => dismissible && onClose?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg rounded-[var(--radius-card-lg)] border border-border bg-surface p-6 shadow-2xl",
          className,
        )}
        style={{ animation: "fadeUp var(--duration-base) var(--ease-out)" }}
      >
        {(title || (dismissible && onClose)) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 className="font-[family-name:var(--font-display)] text-[20px] font-bold tracking-[-0.02em] text-fg">
                  {title}
                </h2>
              )}
              {description && <p className="mt-1 text-[13.5px] text-muted">{description}</p>}
            </div>
            {dismissible && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={cn(
                  "-mr-1 -mt-1 rounded-[8px] p-1.5 text-muted transition-colors duration-instant hover:bg-surface-2 hover:text-fg",
                  focusRing,
                  "focus-visible:ring-offset-surface",
                )}
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

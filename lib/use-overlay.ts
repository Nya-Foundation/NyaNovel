"use client";

import { useEffect, useRef, useState } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

/**
 * Focus trap + restore for a modal overlay.
 *
 * Without this, the first Tab out of a dialog lands on the sidebar *behind* the scrim — during the
 * first-run connect flow the user ends up operating controls they cannot see — and on close focus
 * drops to <body>, so the next Tab restarts from the top of the document.
 */
export function useFocusTrap<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const restoreTo = document.activeElement as HTMLElement | null;

    // Prefer the first real control; fall back to the container itself (needs tabIndex={-1}).
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreTo?.focus?.();
    };
  }, [open]);

  return ref;
}

/**
 * Keeps an overlay mounted for `ms` after `open` flips false so it can animate out. Both the modal
 * and the lightbox previously returned null on close, unmounting in a single frame — a fullscreen
 * black scrim blinking out to a bright canvas reads as a crash rather than a dismissal.
 */
export function useDelayedUnmount(open: boolean, ms = 160) {
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Derive the closing flag during render rather than in an effect — setState in an effect body
  // would cascade an extra render on every open/close.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setClosing(true);
  }

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setClosing(false), ms);
    return () => clearTimeout(t);
  }, [closing, ms]);

  return open || closing;
}

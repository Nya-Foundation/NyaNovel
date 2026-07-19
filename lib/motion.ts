"use client";

import { useSyncExternalStore } from "react";
import type { Transition, Variants } from "motion/react";

/**
 * Spring vocabulary — the runtime counterpart to the `--duration-*` / `--ease-*` tokens in
 * globals.css. Those still govern everything CSS drives (hover tints, focus rings, panel width);
 * these govern anything `motion` drives.
 *
 * Assignment rule mirrors the CSS one, one tier up in expressiveness:
 *   snap   -> discrete state flips that should feel mechanical (pills, toggles, indicators)
 *   smooth -> the default for entering/leaving content
 *   soft   -> large surfaces and anything crossing a lot of distance (drawers, palette)
 *   fluid  -> shared-element flights, where overshoot would tear the illusion of one object
 */
export const spring = {
  snap: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
  smooth: { type: "spring", stiffness: 320, damping: 34, mass: 0.9 },
  soft: { type: "spring", stiffness: 210, damping: 30, mass: 1 },
  /** Critically damped on purpose: a shared element that bounces reads as two objects, not one. */
  fluid: { type: "spring", stiffness: 280, damping: 40, mass: 1 },
} satisfies Record<string, Transition>;

/** Non-spring tween for opacity-only changes, where a spring's tail just looks like lag. */
export const fade: Transition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] };

/**
 * Reduced motion. The global CSS rule in globals.css neutralises CSS transitions, but `motion`
 * animates via JS and is unaffected by it — this hook is how JS-driven motion honours the same
 * preference. Live and re-subscribing, because the OS setting can flip mid-session.
 */
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  // useSyncExternalStore rather than useState+useEffect: the preference is external state, so this
  // reads it during render instead of flashing one animated frame before an effect corrects it —
  // exactly the frame a reduced-motion user is trying to avoid. The server snapshot is `false`
  // because the media query is unknowable until hydration, and `false` matches the CSS default.
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Staggered list reveal. Children opt in by using `listItem` as their variants — the parent drives
 * the timing, so items never need to know their own index.
 */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring.smooth },
};

/** Overlay panels (palette, modals): scale from slightly under so they feel like they arrive. */
export const overlayPanel: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: -6 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring.soft },
  exit: { opacity: 0, scale: 0.98, y: -4, transition: fade },
};

"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { focusRing } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Movement in px before a press becomes a scrub instead of a click-to-type. */
const DRAG_THRESHOLD = 3;
/** px of horizontal travel per step. Tuned so a full sidebar-width drag spans the useful range. */
const PX_PER_STEP = 6;

const clampSnap = (v: number, min: number, max: number, step: number) =>
  Math.min(max, Math.max(min, Math.round(v / step) * step));

type Props = {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
};

/**
 * Numeric field for width/height.
 *
 * Replaces a native `<input type="number">`, whose spinner arrows are ~10px tall, require pixel
 * accuracy, and move the value one step per click — unusable for a range that spans 64…2048 in
 * increments of 64. Three input paths replace it, so the control fits whichever intent the user has:
 *
 *   drag  — press the number and move horizontally to scrub (the fast, approximate path)
 *   type  — click and type an exact value (the precise path)
 *   step  — flanking +/- buttons with real hit areas, and Up/Down/PageUp/PageDown while focused
 *
 * Every path funnels through `clampSnap`, because NovelAI only accepts multiples of 64 — typing
 * 1000 previously sent an invalid request that failed server-side.
 */
export function DimensionInput({ id, label, value, min, max, step, onCommit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // While focused the field shows raw keystrokes; a half-typed "10" must not be snapped to 0 mid
  // entry, so the committed value is only derived on blur or Enter.
  const [draft, setDraft] = useState<string | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null);

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(parsed)) onCommit(clampSnap(parsed, min, max, step));
    setDraft(null);
  };

  const nudge = (dir: number) => onCommit(clampSnap(value + dir * step, min, max, step));

  const onPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (e.button !== 0) return;
    // Suppress the default focus/caret placement so a drag doesn't also select text. Focus is
    // restored by hand in onPointerUp when the gesture turns out to have been a click.
    e.preventDefault();
    drag.current = { x: e.clientX, from: value, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    d.moved = true;
    setScrubbing(true);
    onCommit(clampSnap(d.from + Math.round(dx / PX_PER_STEP) * step, min, max, step));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    const d = drag.current;
    drag.current = null;
    setScrubbing(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    // A press that never moved was a click: hand focus to the input and select it so typing a
    // replacement value doesn't require clearing the old one first.
    if (d && !d.moved) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-fg-2">
        {label}
      </label>
      <div
        className={cn(
          "flex h-11 items-center rounded-[var(--radius-input)] border bg-surface-2 transition-[border-color,box-shadow] duration-fast",
          "focus-within:border-accent focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_22%,transparent)]",
          scrubbing ? "border-accent" : "border-border",
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => nudge(-1)}
          className={cn(
            "flex h-full w-8 shrink-0 items-center justify-center rounded-l-[var(--radius-input)] text-muted",
            "transition-colors duration-instant hover:bg-surface-3 hover:text-fg disabled:pointer-events-none disabled:opacity-30",
          )}
        >
          <Minus className="size-3.5" />
        </button>

        <input
          ref={inputRef}
          id={id}
          // `inputMode` rather than type="number": this is the control that exists specifically to
          // replace the native spinner, so re-rendering it here would defeat the point.
          type="text"
          inputMode="numeric"
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          value={draft ?? value}
          title="Drag to scrub · click to type"
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
              inputRef.current?.blur();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              setDraft(null);
              nudge(e.key === "ArrowUp" ? 1 : -1);
            } else if (e.key === "PageUp" || e.key === "PageDown") {
              e.preventDefault();
              setDraft(null);
              nudge(e.key === "PageUp" ? 4 : -4);
            }
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent text-center font-[family-name:var(--font-mono)] text-[13.5px] tabular-nums text-fg outline-none",
            // The cursor is the only resting hint that this field is draggable, so it stays
            // ew-resize until the field is actually focused for typing.
            "cursor-ew-resize focus:cursor-text",
            "touch-none select-none",
          )}
        />

        <button
          type="button"
          tabIndex={-1}
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => nudge(1)}
          className={cn(
            "flex h-full w-8 shrink-0 items-center justify-center rounded-r-[var(--radius-input)] text-muted",
            "transition-colors duration-instant hover:bg-surface-3 hover:text-fg disabled:pointer-events-none disabled:opacity-30",
          )}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Aspect-lock toggle that sits between the two dimension fields. */
export function AspectLock({ locked, onToggle }: { locked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={locked}
      aria-label="Lock aspect ratio"
      title={locked ? "Aspect ratio locked — changing one side scales the other" : "Lock aspect ratio"}
      onClick={onToggle}
      className={cn(
        "mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-[7px] border transition-colors duration-instant",
        focusRing,
        "focus-visible:ring-offset-surface",
        locked
          ? "border-accent bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent"
          : "border-border-soft text-muted hover:border-border hover:text-fg-2",
      )}
    >
      {/* A link glyph drawn to span both fields — a padlock would read as "frozen", which is the
          opposite of what this does. */}
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M6.5 9.5a3 3 0 0 0 4.24 0l2-2a3 3 0 1 0-4.24-4.25l-.7.7" strokeLinecap="round" />
        <path d="M9.5 6.5a3 3 0 0 0-4.24 0l-2 2a3 3 0 1 0 4.24 4.25l.7-.7" strokeLinecap="round" />
        {!locked && <path d="M2 14 14 2" strokeLinecap="round" />}
      </svg>
    </button>
  );
}

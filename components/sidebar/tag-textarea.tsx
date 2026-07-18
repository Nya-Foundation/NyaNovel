"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TagSuggestion } from "nekoai-js";
import { useStore } from "@/lib/store";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** The comma/newline-delimited token immediately before the cursor. */
function currentToken(value: string, cursor: number) {
  const before = value.slice(0, cursor);
  const start = Math.max(before.lastIndexOf(","), before.lastIndexOf("\n")) + 1;
  return { token: before.slice(start).trim(), start };
}

type Props = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
};

/** Textarea with inline NovelAI tag autocomplete (suggestTags). */
export function TagTextarea({ id, value, onChange, placeholder, className }: Props) {
  const client = useStore((s) => s.client);
  const listId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  // -1 means "nothing chosen yet". This used to initialise to 0, so the top suggestion was
  // pre-selected the instant the popover opened — and Enter, the newline key in a multi-line
  // prompt, silently replaced the token you were typing with a tag you never picked. Enter and Tab
  // now pass through to native behaviour until you explicitly arrow into the list.
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const tokenStart = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = (val: string, cursor: number) => {
    if (!client) return;
    const { token, start } = currentToken(val, cursor);
    tokenStart.current = start;
    if (timer.current) clearTimeout(timer.current);
    if (token.length < 2) {
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await client.suggestTags(token);
        setSuggestions(res.slice(0, 8));
        setActive(-1);
        setOpen(res.length > 0);
      } catch {
        setOpen(false);
      }
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const accept = (s: TagSuggestion) => {
    const el = ref.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const display = s.tag.replace(/_/g, " ");
    const left = value.slice(0, tokenStart.current).replace(/\s*$/, "");
    const right = value.slice(cursor).replace(/^\s*,?\s*/, "");
    const sep = left === "" ? "" : " ";
    const inserted = `${left}${sep}${display}, `;
    const next = inserted + right;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(inserted.length, inserted.length);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      // From -1 this lands on 0 rather than wrapping to the end.
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length : a) - 1);
    } else if ((e.key === "Enter" && !e.metaKey && !e.ctrlKey) || e.key === "Tab") {
      // Nothing is selected until the user arrows into the list, so Enter still inserts a newline
      // and Tab still moves focus — the popover no longer traps either.
      // Cmd/Ctrl+Enter belongs to the global Generate accelerator.
      if (active < 0) return;
      const chosen = suggestions[active];
      // `suggestions` can be replaced by an in-flight query between the keystroke and this handler.
      if (!chosen) return;
      e.preventDefault();
      accept(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        id={id}
        ref={ref}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          query(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && (
        // tabIndex={-1} is load-bearing: `overflow-y-auto` makes this a scrollable container, and
        // Chrome puts those in the tab order. Tab from the prompt landed here instead of the next
        // field, then the popover closed underneath it and dropped focus to <body>. Selection is
        // driven by aria-activedescendant, so the list must never be a tab stop.
        <ul id={listId} role="listbox" tabIndex={-1} className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-[var(--radius-input)] border border-border bg-surface-3 py-1 shadow-xl">
          {suggestions.map((s, i) => (
            <li
              key={s.tag}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => accept(s)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left text-[13px]",
                i === active ? "bg-accent/15 text-fg" : "text-fg-2 hover:bg-surface-2",
              )}
            >
              <span className="truncate">{s.tag.replace(/_/g, " ")}</span>
              {typeof s.count === "number" && (
                <span className="shrink-0 font-[family-name:var(--font-mono)] text-[11px] text-muted">
                  {s.count.toLocaleString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

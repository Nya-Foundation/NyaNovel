"use client";

import { useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [active, setActive] = useState(0);
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
        setActive(0);
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
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if ((e.key === "Enter" && !e.metaKey && !e.ctrlKey) || e.key === "Tab") {
      // Cmd/Ctrl+Enter belongs to the global Generate accelerator — without this guard the
      // keystroke would both accept a suggestion and fire a generation.
      e.preventDefault();
      accept(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        id={id}
        ref={ref}
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
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-[var(--radius-input)] border border-border bg-surface-3 py-1 shadow-xl">
          {suggestions.map((s, i) => (
            <li key={s.tag}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => accept(s)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[13px]",
                  i === active ? "bg-accent/15 text-fg" : "text-fg-2 hover:bg-surface-2",
                )}
              >
                <span className="truncate">{s.tag.replace(/_/g, " ")}</span>
                {typeof s.count === "number" && (
                  <span className="shrink-0 font-[family-name:var(--font-mono)] text-[11px] text-muted">
                    {s.count.toLocaleString()}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

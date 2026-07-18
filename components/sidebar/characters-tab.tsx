"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { useStore } from "@/lib/store";
import { isV4Model } from "@/lib/nai/models";
import { Section, Field } from "./field";
import { TagTextarea } from "./tag-textarea";
import { focusRing } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PositionGrid } from "./position-grid";

export function CharactersTab() {
  const characters = useStore((s) => s.settings.characters);
  const model = useStore((s) => s.settings.model);
  const add = useStore((s) => s.addCharacter);
  const update = useStore((s) => s.updateCharacter);
  const remove = useStore((s) => s.removeCharacter);
  const supported = isV4Model(model);

  return (
    <Section title="Characters">
      {!supported && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-warn/40 bg-[color-mix(in_oklab,var(--warn)_10%,transparent)] px-3 py-2 text-[12px] text-fg-2">
          Multi-character prompts need a V4 or V4.5 model.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {characters.map((c, i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-border-soft bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-fg-2">
                <GripVertical className="size-3.5 text-muted" />
                Character {i + 1}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={c.enabled} onCheckedChange={(v) => update(i, { enabled: v })} aria-label="Enable character" />
                <button
                  type="button"
                  aria-label="Remove character"
                  onClick={() => remove(i)}
                  className={cn(
                    "rounded-[6px] p-1 text-muted transition-colors duration-instant hover:bg-surface-3 hover:text-danger",
                    focusRing,
                    "focus-visible:ring-offset-surface",
                  )}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="flex flex-col gap-2">
                <TagTextarea
                  className="min-h-[56px]"
                  placeholder="Character prompt"
                  aria-label={`Character ${i + 1} prompt`}
                  value={c.prompt}
                  onChange={(prompt) => update(i, { prompt })}
                />
                <TagTextarea
                  className="min-h-[44px]"
                  placeholder="Character undesired content"
                  aria-label={`Character ${i + 1} undesired content`}
                  value={c.uc}
                  onChange={(uc) => update(i, { uc })}
                />
              </div>
              <div className="w-20">
                <div className="mb-1 text-[11px] text-muted">Position</div>
                <PositionGrid label={`Character ${i + 1} position`} center={c.center} onChange={(center) => update(i, { center })} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Field className="mt-3">
        <Button variant="outline" size="sm" className="w-full" onClick={add}>
          <Plus className="size-4" /> Add character
        </Button>
      </Field>
    </Section>
  );
}

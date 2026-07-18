"use client";

import { useEffect, useRef } from "react";
import { Dices, Lock, LockOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  MODEL_OPTIONS,
  SAMPLER_OPTIONS,
  UC_PRESET_OPTIONS,
  SIZE_TIERS,
  presetDims,
  tierAspectForSize,
  aspectsForTier,
  sizeSummary,
} from "@/lib/nai/models";
import { Field, Section } from "./field";
import { TagTextarea } from "./tag-textarea";
import { Select } from "@/components/ui/select";
import { NumberInput } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SwitchRow } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SEED = 4294967295;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function BasicTab() {
  const s = useStore((st) => st.settings);
  const patch = useStore((st) => st.patchSettings);
  const lastSeed = useStore((st) => st.selectedImage?.seed);
  const [tier, aspect] = tierAspectForSize(s.width, s.height);
  const isRandom = s.seed < 0;

  // Where "Custom" returns to. Tracks the last size that matched a real preset.
  const lastPreset = useRef({ w: s.width, h: s.height });
  useEffect(() => {
    if (tier !== null) lastPreset.current = { w: s.width, h: s.height };
  }, [tier, s.width, s.height]);

  const setPreset = (t: string, a: string) => {
    const p = presetDims(t, a) ?? presetDims(t, "portrait") ?? presetDims("normal", a);
    if (p) patch({ width: p.w, height: p.h });
  };

  return (
    <>
      <Section title="Model">
        <Select value={s.model} onChange={(e) => patch({ model: e.target.value as typeof s.model })}>
          {MODEL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Section>

      <Section title="Prompt">
        <Field htmlFor="prompt">
          <TagTextarea
            id="prompt"
            placeholder="1girl, cherry blossoms, soft light, masterpiece…"
            value={s.prompt}
            onChange={(prompt) => patch({ prompt })}
          />
        </Field>
        <Field label="Undesired content" htmlFor="uc">
          <TagTextarea
            id="uc"
            className="min-h-[64px]"
            placeholder="lowres, bad anatomy, worst quality…"
            value={s.negativePrompt}
            onChange={(negativePrompt) => patch({ negativePrompt })}
          />
        </Field>
      </Section>

      <Section title="Resolution">
        <div className="mb-3 flex flex-col gap-2">
          {/* Only the aspects this tier actually has — Wallpaper has no Square, and offering it
              made clicking Wallpaper silently rewrite your aspect. */}
          <Segmented
            className="w-full"
            aria-label="Aspect ratio"
            options={aspectsForTier(tier ?? "normal").map((a) => ({ value: a as string, label: cap(a) }))}
            value={aspect ?? ""}
            onValueChange={(a) => setPreset(tier ?? "normal", a)}
          />
          {/* A non-preset size used to leave BOTH rows with zero active segments, which reads as a
              rendering bug. "Custom" gives that state a name; re-clicking returns to the last preset. */}
          <Segmented
            className="w-full"
            aria-label="Size"
            options={[
              ...SIZE_TIERS.map((t) => ({ value: t as string, label: cap(t) })),
              ...(tier === null ? [{ value: "custom", label: "Custom" }] : []),
            ]}
            value={tier ?? "custom"}
            onValueChange={(t) => {
              if (t === "custom") {
                patch({ width: lastPreset.current.w, height: lastPreset.current.h });
                return;
              }
              setPreset(t, aspect ?? "portrait");
            }}
          />
        </div>
        <div className="flex items-end gap-2">
          <Field className="mb-0 flex-1" label="Width" htmlFor="w">
            <NumberInput id="w" min={64} max={2048} step={64} value={s.width} onChange={(e) => patch({ width: Number(e.target.value) })} />
          </Field>
          <span className="pb-3 text-muted">×</span>
          <Field className="mb-0 flex-1" label="Height" htmlFor="h">
            <NumberInput id="h" min={64} max={2048} step={64} value={s.height} onChange={(e) => patch({ height: Number(e.target.value) })} />
          </Field>
        </div>
        <p className="mt-2 text-right font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-muted">
          {sizeSummary(s.width, s.height)}
        </p>
      </Section>

      <Section title="Sampling">
        <Field label="Seed">
          <div className="flex gap-2">
            <NumberInput
              min={0}
              max={MAX_SEED}
              disabled={isRandom}
              value={isRandom ? "" : s.seed}
              placeholder={lastSeed !== undefined ? `random · last ${lastSeed}` : "random"}
              onChange={(e) => patch({ seed: Number(e.target.value) })}
              className="flex-1"
            />
            {/* Fixed two-control row. Previously this went 2->3 children on toggle, resizing the
                input under the cursor, and the icons named the action rather than the state —
                so Dices *pinned* a seed and Lock *unlocked* it. */}
            <Button
              variant="outline"
              size="icon"
              aria-label="Roll a new seed"
              title="Roll a new seed"
              onClick={() => patch({ seed: Math.floor(Math.random() * MAX_SEED) })}
            >
              <Dices className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={isRandom ? "Seed is random — click to pin" : "Seed is pinned — click to randomize"}
              title={isRandom ? "Seed is random — click to pin" : "Seed is pinned — click to randomize"}
              className={cn(!isRandom && "border-accent text-accent")}
              onClick={() => patch({ seed: isRandom ? Math.floor(Math.random() * MAX_SEED) : -1 })}
            >
              {isRandom ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
            </Button>
          </div>
        </Field>
        <Field>
          <Slider label="Batch size" min={1} max={8} value={s.nSamples} onValueChange={(v) => patch({ nSamples: v })} format={(v) => `${v} image${v > 1 ? "s" : ""}`} />
        </Field>
        <Field hint="More steps means finer detail and a slower run. 23–28 is typical.">
          <Slider label="Steps" showRange min={1} max={50} value={s.steps} onValueChange={(v) => patch({ steps: v })} />
        </Field>
        <Field label="Sampler" htmlFor="sampler">
          <Select id="sampler" value={s.sampler} onChange={(e) => patch({ sampler: e.target.value as typeof s.sampler })}>
            {SAMPLER_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Quality">
        <Field>
          <SwitchRow
            label="Quality tags"
            hint="Append model quality tags"
            checked={s.qualityToggle}
            onCheckedChange={(v) => patch({ qualityToggle: v })}
          />
        </Field>
        <Field label="Undesired content preset" htmlFor="ucpreset">
          <Select id="ucpreset" value={String(s.ucPreset)} onChange={(e) => patch({ ucPreset: Number(e.target.value) as 0 | 1 | 2 | 3 })}>
            {UC_PRESET_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>
    </>
  );
}

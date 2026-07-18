"use client";

import { Dices, Lock, LockOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  MODEL_OPTIONS,
  SAMPLER_OPTIONS,
  UC_PRESET_OPTIONS,
  SIZE_TIERS,
  ASPECTS,
  presetDims,
  tierAspectForSize,
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
        <Field label="Prompt" htmlFor="prompt">
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
          <Segmented
            className="w-full"
            aria-label="Aspect ratio"
            options={ASPECTS.map((a) => ({ value: a, label: cap(a) }))}
            value={aspect ?? ""}
            onValueChange={(a) => setPreset(tier ?? "normal", a)}
          />
          <Segmented
            className="w-full"
            aria-label="Size"
            options={SIZE_TIERS.map((t) => ({ value: t, label: cap(t) }))}
            value={tier ?? ""}
            onValueChange={(t) => setPreset(t, aspect ?? "portrait")}
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
      </Section>

      <Section title="Sampling">
        <Field label="Batch size">
          <Slider min={1} max={8} value={s.nSamples} onValueChange={(v) => patch({ nSamples: v })} format={(v) => `${v} image${v > 1 ? "s" : ""}`} />
        </Field>
        <Field label="Steps">
          <Slider min={1} max={50} value={s.steps} onValueChange={(v) => patch({ steps: v })} />
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

"use client";

import { useStore } from "@/lib/store";
import { NOISE_OPTIONS } from "@/lib/nai/models";
import { Field, Section } from "./field";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SwitchRow } from "@/components/ui/switch";
import { ReferenceUploader } from "./reference-uploader";

export function AdvancedTab() {
  const s = useStore((st) => st.settings);
  const patch = useStore((st) => st.patchSettings);

  return (
    <>
      <Section title="Guidance">
        <Field hint="Higher follows the prompt more literally and leaves less room for invention. 4–7 is typical.">
          <Slider label="Prompt guidance (CFG)" showRange min={1} max={10} step={0.1} value={s.scale} onValueChange={(v) => patch({ scale: v })} format={(v) => v.toFixed(1)} />
        </Field>
        <Field hint="Softens over-saturation at high guidance. Leave at 0 unless colours look burnt.">
          <Slider label="Guidance rescale" showRange min={0} max={1} step={0.01} value={s.cfgRescale} onValueChange={(v) => patch({ cfgRescale: v })} format={(v) => v.toFixed(2)} />
        </Field>
        <Field label="Noise schedule" htmlFor="noise">
          <Select id="noise" value={s.noiseSchedule} onChange={(e) => patch({ noiseSchedule: e.target.value as typeof s.noiseSchedule })}>
            {NOISE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Options">
        <Field>
          <SwitchRow
            label="Dynamic thresholding"
            hint="Rescues detail lost to very high guidance. Usually off."
            checked={s.dynamicThresholding}
            onCheckedChange={(v) => patch({ dynamicThresholding: v })}
          />
        </Field>
        <Field>
          <SwitchRow
            label="Auto SMEA"
            hint="Improves coherence at large resolutions. Ignored on small sizes."
            checked={s.autoSmea}
            onCheckedChange={(v) => patch({ autoSmea: v })}
          />
        </Field>
      </Section>

      <Section title="Vibe transfer">
        <ReferenceUploader field="vibe" emptyLabel="Transfer the vibe of reference images." />
      </Section>

      <Section title="Director / character reference">
        <ReferenceUploader field="directorReference" emptyLabel="Guide character features from a reference." />
      </Section>
    </>
  );
}

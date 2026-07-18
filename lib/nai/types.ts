import { Model, Sampler, Noise } from "nekoai-js";
import type { Metadata, CharacterPrompt } from "nekoai-js";

// ---- App-facing generation settings (mirrors the form; serializable for the gallery) ----

export type CharacterSetting = {
  prompt: string;
  uc: string;
  center: { x: number; y: number };
  enabled: boolean;
};

export type ReferenceImage = {
  /** base64 (no data-url prefix) as returned by parseImage */
  base64: string;
  /** small data-url for previewing in the form */
  preview: string;
  strength: number;
  informationExtracted: number;
};

export type GenerationSettings = {
  prompt: string;
  negativePrompt: string;
  model: Model;
  width: number;
  height: number;
  steps: number;
  /** -1 means "random each generation" */
  seed: number;
  sampler: Sampler;
  scale: number;
  cfgRescale: number;
  noiseSchedule: Noise;
  ucPreset: 0 | 1 | 2 | 3;
  qualityToggle: boolean;
  nSamples: number;
  dynamicThresholding: boolean;
  autoSmea: boolean;
  characters: CharacterSetting[];
  vibe: ReferenceImage[];
  directorReference: ReferenceImage[];
};

export const DEFAULT_SETTINGS: GenerationSettings = {
  prompt: "",
  negativePrompt: "",
  model: Model.V4_5,
  width: 832,
  height: 1216,
  steps: 28,
  seed: -1,
  sampler: Sampler.EULER_ANC,
  scale: 5.5,
  cfgRescale: 0,
  noiseSchedule: Noise.KARRAS,
  ucPreset: 0,
  qualityToggle: true,
  nSamples: 1,
  dynamicThresholding: false,
  autoSmea: false,
  characters: [],
  vibe: [],
  directorReference: [],
};

/**
 * Map app settings + a resolved seed into a nekoai-js Metadata payload.
 * The seed is resolved by the caller (client.generate) so the concrete value can
 * be persisted alongside the resulting image.
 */
export function toMetadata(s: GenerationSettings, resolvedSeed: number): Metadata {
  const meta: Metadata = {
    prompt: s.prompt,
    negative_prompt: s.negativePrompt,
    model: s.model,
    width: s.width,
    height: s.height,
    steps: s.steps,
    seed: resolvedSeed,
    sampler: s.sampler,
    scale: s.scale,
    cfg_rescale: s.cfgRescale,
    noise_schedule: s.noiseSchedule,
    ucPreset: s.ucPreset,
    qualityToggle: s.qualityToggle,
    n_samples: s.nSamples,
    dynamic_thresholding: s.dynamicThresholding,
    autoSmea: s.autoSmea,
  };

  const enabledChars = s.characters.filter((c) => c.enabled && c.prompt.trim());
  if (enabledChars.length > 0) {
    meta.characterPrompts = enabledChars.map<CharacterPrompt>((c) => ({
      prompt: c.prompt.trim(),
      uc: c.uc.trim(),
      center: c.center,
    }));
  }

  if (s.vibe.length > 0) {
    meta.reference_image_multiple = s.vibe.map((v) => v.base64);
    meta.reference_strength_multiple = s.vibe.map((v) => v.strength);
    meta.reference_information_extracted_multiple = s.vibe.map((v) => v.informationExtracted);
  }

  if (s.directorReference.length > 0) {
    meta.director_reference_images = s.directorReference.map((v) => v.base64);
    meta.director_reference_strength_values = s.directorReference.map((v) => v.strength);
    meta.director_reference_information_extracted = s.directorReference.map(
      (v) => v.informationExtracted,
    );
  }

  return meta;
}

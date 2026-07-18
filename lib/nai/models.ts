// UI option lists for the generation form. Values come straight from nekoai-js enums
// (so they stay in sync with the SDK); labels mirror the wording of NovelAI's own UI.
import { Model, Sampler, Noise, Resolution, EmotionOptions, RESOLUTION_DIMENSIONS } from "nekoai-js";

type Option<T extends string> = { value: T; label: string };

export const MODEL_OPTIONS: Option<Model>[] = [
  { value: Model.V4_5, label: "NAI Diffusion V4.5 Full" },
  { value: Model.V4_5_CUR, label: "NAI Diffusion V4.5 Curated" },
  { value: Model.V4, label: "NAI Diffusion V4 Full" },
  { value: Model.V4_CUR, label: "NAI Diffusion V4 Curated" },
  { value: Model.V3, label: "NAI Diffusion Anime V3" },
  { value: Model.FURRY, label: "NAI Diffusion Furry V3" },
];

export function modelLabel(value: string, compact = false): string {
  const label = MODEL_OPTIONS.find((option) => option.value === value)?.label ?? value;
  return compact ? label.replace(/^NAI Diffusion /, "").replace(/ Full$/, "") : label;
}

/** V4/V4.5 models support multi-character prompts + positional coords. */
export const V4_MODELS = new Set<Model>([
  Model.V4_5,
  Model.V4_5_CUR,
  Model.V4,
  Model.V4_CUR,
]);

export const isV4Model = (m: Model) => V4_MODELS.has(m);

export const SAMPLER_OPTIONS: Option<Sampler>[] = [
  { value: Sampler.EULER, label: "Euler" },
  { value: Sampler.EULER_ANC, label: "Euler Ancestral" },
  { value: Sampler.DPM2S_ANC, label: "DPM++ 2S Ancestral" },
  { value: Sampler.DPM2M, label: "DPM++ 2M" },
  { value: Sampler.DPMSDE, label: "DPM++ SDE" },
  { value: Sampler.DPM2MSDE, label: "DPM++ 2M SDE" },
  { value: Sampler.DDIM, label: "DDIM" },
];

export const NOISE_OPTIONS: Option<Noise>[] = [
  { value: Noise.KARRAS, label: "Karras" },
  { value: Noise.NATIVE, label: "Native" },
  { value: Noise.EXPONENTIAL, label: "Exponential" },
  { value: Noise.POLYEXPONENTIAL, label: "Polyexponential" },
];

export const UC_PRESET_OPTIONS: Option<string>[] = [
  { value: "0", label: "Heavy" },
  { value: "1", label: "Light" },
  { value: "2", label: "Human Focus" },
  { value: "3", label: "None" },
];

export const SIZE_TIERS = ["small", "normal", "large", "wallpaper"] as const;
const ASPECTS = ["portrait", "landscape", "square"] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];
export type Aspect = (typeof ASPECTS)[number];

type ResolutionPreset = { value: Resolution; label: string; w: number; h: number };

// Derive the preset table from the SDK rather than duplicating every enum and dimension. The SDK
// intentionally has no wallpaper-square entry, so that combination is filtered out.
const ALL_PRESETS: ResolutionPreset[] = SIZE_TIERS.flatMap((tier) =>
  ASPECTS.flatMap((aspect) => {
    const value = `${tier}_${aspect}` as Resolution;
    const dimensions = RESOLUTION_DIMENSIONS[value];
    return dimensions
      ? [{ value, label: aspect.charAt(0).toUpperCase() + aspect.slice(1), w: dimensions[0], h: dimensions[1] }]
      : [];
  }),
);

const PRESET_BY_KEY: Record<string, ResolutionPreset> = Object.fromEntries(
  ALL_PRESETS.map((preset) => [preset.value as string, preset]),
);

/** Preset dimensions for a tier + aspect (Resolution values are `${tier}_${aspect}`). */
export function presetDims(tier: string, aspect: string): ResolutionPreset | undefined {
  return PRESET_BY_KEY[`${tier}_${aspect}`];
}

/** Find the preset whose dimensions match the given size, if any (else "custom"). */
function presetForSize(w: number, h: number): Resolution | null {
  return ALL_PRESETS.find((p) => p.w === w && p.h === h)?.value ?? null;
}

/** Split a size into [tier, aspect] if it matches a preset, else [null, null]. */
export function tierAspectForSize(w: number, h: number): [SizeTier | null, Aspect | null] {
  const preset = presetForSize(w, h);
  if (!preset) return [null, null];
  const [tier, aspect] = (preset as string).split("_");
  return [tier as SizeTier, aspect as Aspect];
}

/** Aspects that actually exist for a tier — Wallpaper has no Square, so offering it would force a
 *  silent fallback that changes the user's aspect behind their back. */
export function aspectsForTier(tier: string): Aspect[] {
  return ASPECTS.filter((a) => presetDims(tier, a) !== undefined);
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** "1.01 MP · 1:1.46" — the cost and shape of the current size, for the custom W/H row. */
export function sizeSummary(w: number, h: number): string {
  if (!w || !h) return "—";
  const mp = (w * h) / 1_000_000;
  const g = gcd(w, h) || 1;
  const [rw, rh] = [w / g, h / g];
  // Only show an integer ratio when it's one a human recognises. 832x1216 reduces to 13:19, which
  // is exact and completely unreadable — normalise those to 1:n instead.
  const ratio =
    rw <= 16 && rh <= 16
      ? `${rw}:${rh}`
      : w >= h
        ? `${(w / h).toFixed(2)}:1`
        : `1:${(h / w).toFixed(2)}`;
  return `${mp.toFixed(2)} MP · ${ratio}`;
}

export const EMOTION_OPTIONS: Option<EmotionOptions>[] = Object.values(EmotionOptions).map((e) => ({
  value: e,
  label: e.charAt(0).toUpperCase() + e.slice(1),
}));

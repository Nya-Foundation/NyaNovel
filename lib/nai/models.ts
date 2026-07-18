// UI option lists for the generation form. Values come straight from nekoai-js enums
// (so they stay in sync with the SDK); labels mirror the wording of NovelAI's own UI.
import { Model, Sampler, Noise, Resolution, EmotionOptions, RESOLUTION_DIMENSIONS } from "nekoai-js";

export type Option<T extends string> = { value: T; label: string };

export const MODEL_OPTIONS: Option<Model>[] = [
  { value: Model.V4_5, label: "NAI Diffusion V4.5 Full" },
  { value: Model.V4_5_CUR, label: "NAI Diffusion V4.5 Curated" },
  { value: Model.V4, label: "NAI Diffusion V4 Full" },
  { value: Model.V4_CUR, label: "NAI Diffusion V4 Curated" },
  { value: Model.V3, label: "NAI Diffusion Anime V3" },
  { value: Model.FURRY, label: "NAI Diffusion Furry V3" },
];

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

// Resolution presets, grouped by tier. Dimensions come from the SDK so a preset
// selection can populate the width/height fields directly.
export type ResolutionPreset = { value: Resolution; label: string; w: number; h: number };

const dim = (r: Resolution): [number, number] => RESOLUTION_DIMENSIONS[r];

export const RESOLUTION_GROUPS: { group: string; presets: ResolutionPreset[] }[] = [
  {
    group: "Normal",
    presets: [
      { value: Resolution.NORMAL_PORTRAIT, label: "Portrait", w: dim(Resolution.NORMAL_PORTRAIT)[0], h: dim(Resolution.NORMAL_PORTRAIT)[1] },
      { value: Resolution.NORMAL_LANDSCAPE, label: "Landscape", w: dim(Resolution.NORMAL_LANDSCAPE)[0], h: dim(Resolution.NORMAL_LANDSCAPE)[1] },
      { value: Resolution.NORMAL_SQUARE, label: "Square", w: dim(Resolution.NORMAL_SQUARE)[0], h: dim(Resolution.NORMAL_SQUARE)[1] },
    ],
  },
  {
    group: "Small",
    presets: [
      { value: Resolution.SMALL_PORTRAIT, label: "Portrait", w: dim(Resolution.SMALL_PORTRAIT)[0], h: dim(Resolution.SMALL_PORTRAIT)[1] },
      { value: Resolution.SMALL_LANDSCAPE, label: "Landscape", w: dim(Resolution.SMALL_LANDSCAPE)[0], h: dim(Resolution.SMALL_LANDSCAPE)[1] },
      { value: Resolution.SMALL_SQUARE, label: "Square", w: dim(Resolution.SMALL_SQUARE)[0], h: dim(Resolution.SMALL_SQUARE)[1] },
    ],
  },
  {
    group: "Large",
    presets: [
      { value: Resolution.LARGE_PORTRAIT, label: "Portrait", w: dim(Resolution.LARGE_PORTRAIT)[0], h: dim(Resolution.LARGE_PORTRAIT)[1] },
      { value: Resolution.LARGE_LANDSCAPE, label: "Landscape", w: dim(Resolution.LARGE_LANDSCAPE)[0], h: dim(Resolution.LARGE_LANDSCAPE)[1] },
      { value: Resolution.LARGE_SQUARE, label: "Square", w: dim(Resolution.LARGE_SQUARE)[0], h: dim(Resolution.LARGE_SQUARE)[1] },
    ],
  },
  {
    group: "Wallpaper",
    presets: [
      { value: Resolution.WALLPAPER_PORTRAIT, label: "Portrait", w: dim(Resolution.WALLPAPER_PORTRAIT)[0], h: dim(Resolution.WALLPAPER_PORTRAIT)[1] },
      { value: Resolution.WALLPAPER_LANDSCAPE, label: "Landscape", w: dim(Resolution.WALLPAPER_LANDSCAPE)[0], h: dim(Resolution.WALLPAPER_LANDSCAPE)[1] },
    ],
  },
];

export const ALL_PRESETS: ResolutionPreset[] = RESOLUTION_GROUPS.flatMap((g) => g.presets);

const PRESET_BY_KEY: Record<string, ResolutionPreset> = Object.fromEntries(
  ALL_PRESETS.map((p) => [p.value as string, p]),
);

export const SIZE_TIERS = ["small", "normal", "large", "wallpaper"] as const;
export const ASPECTS = ["portrait", "landscape", "square"] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];
export type Aspect = (typeof ASPECTS)[number];

/** Preset dimensions for a tier + aspect (Resolution values are `${tier}_${aspect}`). */
export function presetDims(tier: string, aspect: string): ResolutionPreset | undefined {
  return PRESET_BY_KEY[`${tier}_${aspect}`];
}

/** Find the preset whose dimensions match the given size, if any (else "custom"). */
export function presetForSize(w: number, h: number): Resolution | null {
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

export { Model, Sampler, Noise, Resolution, EmotionOptions };

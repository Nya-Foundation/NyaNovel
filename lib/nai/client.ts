import {
  NovelAI,
  EventType,
  parseImage,
  Host,
  type Image,
  type ImageInput,
  MsgpackEvent,
  type EmotionOptions,
} from "nekoai-js";
import { DEFAULT_SETTINGS, type GenerationSettings, toMetadata } from "./types";
import { isV4Model } from "./models";

// ---- Connection config (persisted in localStorage; the token never leaves the browser) ----

export type ConnectionConfig = {
  token: string;
  host: string;
  maxRetries: number;
  baseDelay: number;
};

const KEYS = {
  token: "nya-token",
  host: "nya-host",
  maxRetries: "nya-retry-max",
  baseDelay: "nya-retry-base",
} as const;

export const DEFAULT_CONNECTION: Omit<ConnectionConfig, "token"> = {
  host: Host.WEB,
  maxRetries: 3,
  baseDelay: 2000,
};

export function loadConnection(): ConnectionConfig | null {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem(KEYS.token);
  if (!token) return null;
  return {
    token,
    host: localStorage.getItem(KEYS.host) || DEFAULT_CONNECTION.host,
    maxRetries: Number(localStorage.getItem(KEYS.maxRetries)) || DEFAULT_CONNECTION.maxRetries,
    baseDelay: Number(localStorage.getItem(KEYS.baseDelay)) || DEFAULT_CONNECTION.baseDelay,
  };
}

export function saveConnection(cfg: ConnectionConfig) {
  localStorage.setItem(KEYS.token, cfg.token);
  localStorage.setItem(KEYS.host, cfg.host);
  localStorage.setItem(KEYS.maxRetries, String(cfg.maxRetries));
  localStorage.setItem(KEYS.baseDelay, String(cfg.baseDelay));
}

export function clearConnection() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// ---- Settings persistence ----
//
// Deliberately hand-rolled rather than zustand's `persist` middleware: the store is created at
// module scope under SSR, and `persist` rehydrates synchronously at creation, so the server HTML
// (defaults) and the first client render (restored) would disagree. Deferring the read into
// `init()` is the same pattern `loadConnection` already uses.

const SETTINGS_KEY = "nya-settings";

/** Reference images are dropped on save — see saveSettings. */
type PersistedSettings = Omit<GenerationSettings, "vibe" | "directorReference">;

export function loadSettings(): GenerationSettings | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    // Merged over the defaults so a field added to GenerationSettings later can never come back
    // as undefined from an older stored payload.
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GenerationSettings>) };
  } catch {
    return null;
  }
}

export function saveSettings(s: GenerationSettings) {
  if (typeof localStorage === "undefined") return;
  // `vibe` and `directorReference` each carry a full base64 payload *and* a preview data-URL, so a
  // handful of references blows the ~5MB quota. A QuotaExceededError here would take down
  // persistence of everything else — including the prompt — so dropping them is the correct
  // behaviour rather than a compromise.
  const { vibe: _v, directorReference: _d, ...rest } = s;
  const persisted: PersistedSettings = rest;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(persisted));
  } catch {
    // Persistence the user never asked for must not interrupt them.
  }
}

const UI_KEY = "nya-ui";

export type UIPrefs = { settingsCollapsed: boolean; activeTab: "basic" | "advanced" | "characters"; galleryOpen: boolean };

export function loadUIPrefs(): UIPrefs | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(UI_KEY);
    return raw ? (JSON.parse(raw) as UIPrefs) : null;
  } catch {
    return null;
  }
}

/**
 * Panel layout only. Notably absent: `focusedIndex` — restoring an open lightbox over an image the
 * user didn't ask to see is hostile — and `showConnect`, which is derived from whether a client exists.
 */
export function saveUIPrefs(p: UIPrefs) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(p));
  } catch {
    /* non-essential */
  }
}

export type TokenVerdict = "ok" | "invalid" | "unknown";

/**
 * Cheap authentication probe, so the UI can stop claiming "Connected" about a token it never
 * checked. Constructing a NaiClient performs zero I/O, so without this a truncated token gets a
 * green dot and a success toast, then fails forty seconds later behind a shimmer.
 *
 * Deliberately NOT `suggestTags`: that endpoint is unauthenticated and returns real results for a
 * garbage token, so it would wave every bad key through.
 *
 * Returns "unknown" — never "invalid" — for anything that isn't a hard 401/403. A network blip or
 * a CORS failure must not lock a user out of their own client. And the probe is skipped entirely
 * for custom hosts: a proxy that forwards only the image endpoints has no reason to serve
 * api.novelai.net's account routes, so probing it would punish exactly the setup we support.
 */
export async function verifyToken(cfg: ConnectionConfig): Promise<TokenVerdict> {
  if (cfg.host !== Host.WEB) return "unknown";
  try {
    const res = await fetch(`${Host.API}/user/subscription`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) return "invalid";
    return "ok";
  } catch {
    return "unknown";
  }
}

// ---- Client wrapper ----

const MAX_SEED = 4294967295;
const randomSeed = () => Math.floor(Math.random() * MAX_SEED);

export type GenerateHandle = {
  /** The concrete seed used (a random one is drawn when settings.seed is -1). */
  seed: number;
  /** V4/V4.5 stream intermediate frames; V3 resolves once with final images. */
  streaming: boolean;
  events: AsyncGenerator<MsgpackEvent, void, unknown>;
};

async function* finalImageEvents(images: Image[], steps: number) {
  for (const [sampleIndex, image] of images.entries()) {
    yield new MsgpackEvent({
      event_type: EventType.FINAL,
      samp_ix: sampleIndex,
      step_ix: steps,
      gen_id: "non-streaming",
      sigma: 0,
      image,
    });
  }
}

export class NaiClient {
  readonly raw: NovelAI;

  constructor(cfg: ConnectionConfig) {
    this.raw = new NovelAI({
      token: cfg.token,
      host: cfg.host,
      retry: {
        enabled: true,
        maxRetries: cfg.maxRetries,
        baseDelay: cfg.baseDelay,
        maxDelay: 60000,
        retryStatusCodes: [429, 500, 502, 503, 504],
      },
    });
  }

  /** Start a streaming generation. Returns the resolved seed and the event stream. */
  async generate(settings: GenerationSettings): Promise<GenerateHandle> {
    const seed = settings.seed >= 0 ? settings.seed : randomSeed();
    const meta = toMetadata(settings, seed);
    const streaming = isV4Model(settings.model);
    if (streaming) {
      const events = await this.raw.generateImage(meta, true);
      return { seed, streaming, events };
    }

    // NovelAI's V3 endpoints return a ZIP containing only final images. Adapt that array to the
    // same event contract used by the store so persistence, batches, and per-sample seeds stay on
    // one path without pretending that V3 supports intermediate previews.
    const images = await this.raw.generateImage(meta, false);
    return { seed, streaming, events: finalImageEvents(images, settings.steps) };
  }

  suggestTags(prompt: string) {
    return this.raw.suggestTags(prompt);
  }

  // Director tools (operate on an existing image).
  lineArt = (img: ImageInput) => this.raw.lineArt(img);
  sketch = (img: ImageInput) => this.raw.sketch(img);
  backgroundRemoval = (img: ImageInput) => this.raw.backgroundRemoval(img);
  declutter = (img: ImageInput) => this.raw.declutter(img);
  colorize = (img: ImageInput, prompt?: string, defry?: number) =>
    this.raw.colorize(img, prompt, defry);
  changeEmotion = (img: ImageInput, emotion?: EmotionOptions, prompt?: string, level?: number) =>
    this.raw.changeEmotion(img, emotion, prompt, level);
  upscale = (img: ImageInput, scale: 2 | 4 = 4) => this.raw.upscale(img, scale);
  enhance = (img: ImageInput) => this.raw.enhance(img);
}

export { EventType, parseImage };
export type { Image, MsgpackEvent };

/** Parse a File/Blob into base64 + a preview data-url for the vibe/reference form. */
export async function parseReference(file: File | Blob) {
  const parsed = await parseImage(file);
  return { base64: parsed.base64, preview: `data:image/png;base64,${parsed.base64}` };
}

import {
  NovelAI,
  EventType,
  parseImage,
  Host,
  type Image,
  type ImageInput,
  type MsgpackEvent,
  type EmotionOptions,
} from "nekoai-js";
import { type GenerationSettings, toMetadata } from "./types";

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
  events: AsyncGenerator<MsgpackEvent, void, unknown>;
};

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
    const events = await this.raw.generateImage(meta, true);
    return { seed, events };
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

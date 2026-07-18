"use client";

import { create } from "zustand";
import { toast } from "sonner";
import {
  NaiClient,
  EventType,
  loadConnection,
  saveConnection,
  clearConnection,
  type ConnectionConfig,
} from "@/lib/nai/client";
import { DEFAULT_SETTINGS, type GenerationSettings, type ReferenceImage, type CharacterSetting } from "@/lib/nai/types";
import type { EmotionOptions, Image } from "nekoai-js";
import {
  loadImages,
  saveImage,
  deleteImage as dbDelete,
  clearImages,
  type GalleryImage,
} from "@/lib/db/gallery";

export type SettingsTab = "basic" | "advanced" | "characters";

export type StreamTile = {
  sampleIndex: number;
  dataUrl: string | null;
  stepIndex: number;
  progress: number; // 0..1
  status: "initializing" | "generating" | "done";
};

type ReferenceField = "vibe" | "directorReference";

export type DirectorKind =
  | "lineArt"
  | "sketch"
  | "backgroundRemoval"
  | "declutter"
  | "colorize"
  | "emotion"
  | "upscale"
  | "enhance";

export type DirectorOpts = { prompt?: string; defry?: number; emotion?: EmotionOptions; level?: number };

type Store = {
  // ---- connection ----
  connection: ConnectionConfig | null;
  client: NaiClient | null;
  connect: (cfg: ConnectionConfig) => void;
  disconnect: () => void;

  // ---- settings ----
  settings: GenerationSettings;
  patchSettings: (patch: Partial<GenerationSettings>) => void;
  resetSettings: () => void;
  restoreSettings: (s: GenerationSettings) => void;
  addCharacter: () => void;
  updateCharacter: (i: number, patch: Partial<CharacterSetting>) => void;
  removeCharacter: (i: number) => void;
  addReference: (field: ReferenceField, ref: ReferenceImage) => void;
  updateReference: (field: ReferenceField, i: number, patch: Partial<ReferenceImage>) => void;
  removeReference: (field: ReferenceField, i: number) => void;

  // ---- gallery ----
  images: GalleryImage[];
  /** Distinguishes first-paint, genuinely empty, and IDB-unavailable — they used to render alike. */
  galleryStatus: "loading" | "ready" | "error";
  galleryError: string | null;
  selectedBatch: GalleryImage[] | null;
  selectedImage: GalleryImage | null;
  loadGallery: () => Promise<void>;
  selectBatch: (batchId: number) => void;
  selectImage: (img: GalleryImage) => void;
  deleteImage: (id: number) => Promise<void>;
  clearGallery: () => Promise<void>;

  // ---- generation ----
  isGenerating: boolean;
  streamingBatch: StreamTile[] | null;
  /** Last failure, kept so the canvas can explain it after the toast fades. */
  lastError: { message: string; at: number } | null;
  abortRequested: boolean;
  /** Wall-clock start of the current run, so waits can show elapsed time instead of a frozen ring. */
  runStartedAt: number | null;
  generate: () => Promise<void>;
  cancelGenerate: () => void;
  clearError: () => void;

  // ---- director tools ----
  isDirectorProcessing: boolean;
  directorKind: DirectorKind | null;
  runDirector: (kind: DirectorKind, opts?: DirectorOpts) => Promise<void>;

  // ---- ui ----
  settingsCollapsed: boolean;
  activeTab: SettingsTab;
  galleryOpen: boolean;
  showConnect: boolean;
  showDirector: boolean;
  focusedIndex: number | null;
  setUI: (
    patch: Partial<
      Pick<
        Store,
        "settingsCollapsed" | "activeTab" | "galleryOpen" | "showConnect" | "showDirector" | "focusedIndex"
      >
    >,
  ) => void;

  // ---- lifecycle ----
  init: () => Promise<void>;
};

export const useStore = create<Store>()((set, get) => ({
  // ---- connection ----
  connection: null,
  client: null,
  connect: (cfg) => {
    saveConnection(cfg);
    set({ connection: cfg, client: new NaiClient(cfg), showConnect: false });
  },
  disconnect: () => {
    clearConnection();
    set({ connection: null, client: null });
  },

  // ---- settings ----
  settings: DEFAULT_SETTINGS,
  patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
  restoreSettings: (snapshot) => {
    set({ settings: { ...DEFAULT_SETTINGS, ...snapshot } });
    toast.success(`Restored — seed ${snapshot.seed}, ${snapshot.steps} steps`);
  },
  addCharacter: () =>
    set((s) => ({
      settings: {
        ...s.settings,
        characters: [
          ...s.settings.characters,
          { prompt: "", uc: "", center: { x: 0.5, y: 0.5 }, enabled: true },
        ],
      },
    })),
  updateCharacter: (i, patch) =>
    set((s) => ({
      settings: {
        ...s.settings,
        characters: s.settings.characters.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
      },
    })),
  removeCharacter: (i) =>
    set((s) => ({
      settings: { ...s.settings, characters: s.settings.characters.filter((_, idx) => idx !== i) },
    })),
  addReference: (field, ref) =>
    set((s) => ({ settings: { ...s.settings, [field]: [...s.settings[field], ref] } })),
  updateReference: (field, i, patch) =>
    set((s) => ({
      settings: {
        ...s.settings,
        [field]: s.settings[field].map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
      },
    })),
  removeReference: (field, i) =>
    set((s) => ({
      settings: { ...s.settings, [field]: s.settings[field].filter((_, idx) => idx !== i) },
    })),

  // ---- gallery ----
  images: [],
  galleryStatus: "loading",
  galleryError: null,
  selectedBatch: null,
  selectedImage: null,
  loadGallery: async () => {
    set({ galleryStatus: "loading", galleryError: null });
    try {
      const images = await loadImages();
      set({ images, galleryStatus: "ready" });
      if (images.length > 0) get().selectBatch(images[0].batchId);
    } catch (e) {
      // Swallowing this used to leave images: [], telling a returning user whose storage failed
      // that they had never generated anything.
      console.error("Failed to load gallery", e);
      set({ galleryStatus: "error", galleryError: e instanceof Error ? e.message : String(e) });
    }
  },
  selectBatch: (batchId) => {
    const { images } = get();
    const batch = images.filter((i) => i.batchId === batchId).sort((a, b) => a.batchIndex - b.batchIndex);
    if (batch.length) set({ selectedBatch: batch, selectedImage: batch[0], focusedIndex: null });
  },
  selectImage: (img) => set({ selectedImage: img }),
  deleteImage: async (id) => {
    // Optimistic: drop from view immediately, hold the record in memory, and only touch IndexedDB
    // once the undo window closes. A misclick otherwise destroys an unreproducible image.
    const doomed = get().images.find((i) => i.id === id);
    if (!doomed) return;

    const prevImages = get().images;
    const prevBatch = get().selectedBatch;
    const prevSelected = get().selectedImage;

    const images = prevImages.filter((i) => i.id !== id);
    set({ images });
    if (prevBatch) {
      const batch = prevBatch.filter((i) => i.id !== id);
      if (batch.length) set({ selectedBatch: batch, selectedImage: batch[0] });
      else if (images.length) get().selectBatch(images[0].batchId);
      else set({ selectedBatch: null, selectedImage: null });
    }

    let undone = false;
    toast("Image deleted", {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          set({ images: prevImages, selectedBatch: prevBatch, selectedImage: prevSelected });
        },
      },
      onAutoClose: () => {
        if (!undone) void dbDelete(id);
      },
      onDismiss: () => {
        if (!undone) void dbDelete(id);
      },
    });
  },
  clearGallery: async () => {
    await clearImages();
    set({ images: [], selectedBatch: null, selectedImage: null });
  },

  // ---- generation ----
  isGenerating: false,
  streamingBatch: null,
  lastError: null,
  abortRequested: false,
  runStartedAt: null,
  cancelGenerate: () => {
    if (get().isGenerating) set({ abortRequested: true });
  },
  clearError: () => set({ lastError: null }),
  generate: async () => {
    const { client, settings } = get();
    if (!client) {
      set({ showConnect: true });
      return;
    }
    const n = Math.max(1, settings.nSamples);
    // Deliberately does NOT clear selectedBatch/selectedImage: the success path below overwrites
    // them anyway, and keeping them means a failed run leaves the user's previous image intact
    // instead of dumping them on the first-run empty state.
    set({
      isGenerating: true,
      lastError: null,
      abortRequested: false,
      runStartedAt: Date.now(),
      streamingBatch: Array.from({ length: n }, (_, i) => ({
        sampleIndex: i,
        dataUrl: null,
        stepIndex: 0,
        progress: 0,
        status: "initializing" as const,
      })),
    });

    try {
      const { seed, events } = await client.generate(settings);
      const batchId = Date.now();
      const finals: { dataUrl: string; sampleIndex: number }[] = [];

      for await (const ev of events) {
        // Breaking calls the iterator's .return(), which closes the stream reader. nekoai-js's own
        // AbortControllers are internal and timeout-only, so this is the available cancel path.
        if (get().abortRequested) break;
        if (ev.event_type === EventType.INTERMEDIATE) {
          set((s) => ({
            streamingBatch:
              s.streamingBatch?.map((t) =>
                t.sampleIndex === ev.samp_ix
                  ? {
                      ...t,
                      dataUrl: ev.image.toDataURL(),
                      stepIndex: ev.step_ix,
                      progress: Math.min(1, ev.step_ix / settings.steps),
                      status: "generating",
                    }
                  : t,
              ) ?? null,
          }));
        } else if (ev.event_type === EventType.FINAL) {
          finals.push({ dataUrl: ev.image.toDataURL(), sampleIndex: ev.samp_ix });
          set((s) => ({
            streamingBatch:
              s.streamingBatch?.map((t) =>
                t.sampleIndex === ev.samp_ix ? { ...t, progress: 1, status: "done" } : t,
              ) ?? null,
          }));
        }
      }

      finals.sort((a, b) => a.sampleIndex - b.sampleIndex);
      const saved: GalleryImage[] = [];
      for (let i = 0; i < finals.length; i++) {
        // Per-image seed, not the batch base seed — otherwise "Use these settings" on image #3
        // silently restores image #1's recipe while the toolbar chip shows the correct seed.
        const snapshot: GenerationSettings = { ...settings, seed: seed + finals[i].sampleIndex };
        const img: GalleryImage = {
          dataUrl: finals[i].dataUrl,
          timestamp: new Date().toISOString(),
          filename: `nyanovel_${batchId}_${i + 1}.png`,
          seed: seed + finals[i].sampleIndex,
          settings: snapshot,
          batchId,
          batchIndex: i,
          batchSize: finals.length,
        };
        const id = await saveImage(img);
        img.id = id;
        saved.push(img);
      }

      set((s) => ({ images: [...saved.slice().reverse(), ...s.images] }));
      if (saved.length) set({ selectedBatch: saved, selectedImage: saved[0], galleryOpen: true });

      if (get().abortRequested) {
        toast(saved.length ? `Stopped — kept ${saved.length} finished image${saved.length > 1 ? "s" : ""}` : "Stopped");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Generation failed", e);
      set({ lastError: { message, at: Date.now() } });
      toast.error(`Generation failed: ${message}`);
    } finally {
      set({ isGenerating: false, streamingBatch: null, abortRequested: false, runStartedAt: null });
    }
  },

  // ---- director tools ----
  isDirectorProcessing: false,
  directorKind: null,
  runDirector: async (kind, opts) => {
    const { client, selectedImage } = get();
    if (!client) {
      set({ showConnect: true });
      return;
    }
    if (!selectedImage) {
      toast.error("Select an image first");
      return;
    }
    set({ isDirectorProcessing: true, directorKind: kind, lastError: null });
    try {
      const blob = await (await fetch(selectedImage.dataUrl)).blob();
      let results: Image[];
      switch (kind) {
        case "lineArt": results = [await client.lineArt(blob)]; break;
        case "sketch": results = [await client.sketch(blob)]; break;
        case "backgroundRemoval": results = [await client.backgroundRemoval(blob)]; break;
        case "declutter": results = [await client.declutter(blob)]; break;
        case "colorize": results = [await client.colorize(blob, opts?.prompt, opts?.defry)]; break;
        case "emotion": results = [await client.changeEmotion(blob, opts?.emotion, opts?.prompt, opts?.level)]; break;
        case "upscale": results = [await client.upscale(blob, 4)]; break;
        case "enhance": results = await client.enhance(blob); break;
        default: results = [];
      }
      if (!results.length) return;

      const batchId = Date.now();
      const saved: GalleryImage[] = [];
      for (let i = 0; i < results.length; i++) {
        const img: GalleryImage = {
          dataUrl: results[i].toDataURL(),
          timestamp: new Date().toISOString(),
          filename: `nyanovel_${kind}_${batchId}_${i + 1}.png`,
          seed: selectedImage.seed,
          settings: selectedImage.settings,
          batchId,
          batchIndex: i,
          batchSize: results.length,
          processedWith: kind,
        };
        const id = await saveImage(img);
        img.id = id;
        saved.push(img);
      }
      set((s) => ({
        images: [...saved.slice().reverse(), ...s.images],
        selectedBatch: saved,
        selectedImage: saved[0],
        galleryOpen: true,
        showDirector: false,
      }));
      toast.success("Applied director tool");
    } catch (e) {
      console.error("Director tool failed", e);
      toast.error(`Director tool failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      set({ isDirectorProcessing: false, directorKind: null });
    }
  },

  // ---- ui ----
  settingsCollapsed: false,
  activeTab: "basic",
  galleryOpen: false,
  showConnect: false,
  showDirector: false,
  focusedIndex: null,
  setUI: (patch) => set(patch),

  // ---- lifecycle ----
  init: async () => {
    const cfg = loadConnection();
    if (cfg) set({ connection: cfg, client: new NaiClient(cfg) });
    else set({ showConnect: true });
    await get().loadGallery();
  },
}));

"use client";

import { create } from "zustand";
import { toast } from "sonner";
import {
  NaiClient,
  EventType,
  loadConnection,
  saveConnection,
  clearConnection,
  verifyToken,
  loadSettings,
  saveSettings,
  loadUIPrefs,
  saveUIPrefs,
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
  /** Resolves false when the token was hard-rejected; the modal stays open and explains. */
  connect: (cfg: ConnectionConfig) => Promise<boolean>;
  connectionStatus: "idle" | "verifying" | "ok" | "invalid";
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
  connectionStatus: "idle",
  connect: async (cfg) => {
    set({ connectionStatus: "verifying" });
    const verdict = await verifyToken(cfg);
    if (verdict === "invalid") {
      set({ connectionStatus: "invalid" });
      return false;
    }
    saveConnection(cfg);
    set({ connection: cfg, client: new NaiClient(cfg), showConnect: false, connectionStatus: "ok" });
    return true;
  },
  disconnect: () => {
    clearConnection();
    set({ connection: null, client: null, connectionStatus: "idle" });
  },

  // ---- settings ----
  settings: DEFAULT_SETTINGS,
  patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
  restoreSettings: (snapshot) => {
    // This replaces the prompt, the negative prompt, every character and every uploaded reference.
    // Its call sites are ~28px glyphs on hover overlays sitting one gap away from "copy seed" —
    // same visual weight, wildly different blast radius — so it needs the same undo affordance
    // deleteImage already has.
    const prev = get().settings;
    const hadWork =
      prev.prompt.trim() !== "" ||
      prev.negativePrompt.trim() !== "" ||
      prev.characters.length > 0 ||
      prev.vibe.length > 0 ||
      prev.directorReference.length > 0;

    set({ settings: { ...DEFAULT_SETTINGS, ...snapshot } });
    toast.success(`Restored — seed ${snapshot.seed}, ${snapshot.steps} steps`, {
      // Only offered when something was actually overwritten. On a fresh form — the common case
      // while browsing the gallery — restoring is harmless, and an Undo there is noise that
      // teaches people to ignore it.
      ...(hadWork
        ? { duration: 6000, action: { label: "Undo", onClick: () => set({ settings: prev }) } }
        : {}),
    });
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
      if (batch.length) {
        // Hold your place. This used to snap to batch[0] after every removal, so culling a batch
        // of 8 down to 1 meant delete → lose the image you were judging → navigate back → repeat.
        // If the selection survived, keep it; otherwise take the neighbour that slid into the
        // deleted slot.
        const stillThere = prevSelected && batch.some((i) => i.id === prevSelected.id);
        const deletedAt = prevBatch.findIndex((i) => i.id === id);
        const next = stillThere
          ? prevSelected
          : batch[Math.min(Math.max(deletedAt, 0), batch.length - 1)];
        set({ selectedBatch: batch, selectedImage: next });
      } else if (images.length) get().selectBatch(images[0].batchId);
      else set({ selectedBatch: null, selectedImage: null });
    }

    // Undo re-inserts this one image at its original index rather than restoring a whole array
    // snapshot. Each delete used to close over its own copy of `images`, so two deletes inside the
    // 6s window left two stale closures — undoing the first resurrected the second deleted image
    // and orphaned its pending dbDelete, leaving a phantom that reappeared on reload.
    const imageIndex = prevImages.findIndex((i) => i.id === id);
    const batchIndex = prevBatch?.findIndex((i) => i.id === id) ?? -1;
    const reinsert = <T extends { id?: number }>(list: T[], item: T, at: number) => {
      const copy = list.slice();
      copy.splice(Math.min(Math.max(at, 0), copy.length), 0, item);
      return copy;
    };

    let undone = false;
    toast("Image deleted", {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          set((s) => ({
            images: reinsert(s.images, doomed, imageIndex),
            selectedBatch:
              s.selectedBatch && batchIndex >= 0
                ? reinsert(s.selectedBatch, doomed, batchIndex)
                : s.selectedBatch,
            selectedImage: doomed,
          }));
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
    // clearImages() throws on quota, private browsing and corruption. Unhandled, the confirm modal
    // closed as if it had worked while every image was still there — loadGallery already treats
    // exactly this failure as worth a dedicated error state, so route into the same one.
    const n = get().images.length;
    try {
      await clearImages();
      set({ images: [], selectedBatch: null, selectedImage: null });
      toast.success(`Deleted ${n} image${n === 1 ? "" : "s"}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Failed to clear gallery", e);
      set({ galleryStatus: "error", galleryError: message });
      toast.error(`Couldn't delete your images: ${message}`);
    }
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
    // An empty prompt is a real, billed request that returns noise. Characters count as intent —
    // a V4 prompt can legitimately live entirely in the character list.
    const hasIntent =
      settings.prompt.trim().length > 0 ||
      settings.characters.some((c) => c.enabled && c.prompt.trim().length > 0);
    if (!hasIntent) {
      toast.error("Describe something first — an empty prompt still costs Anlas.");
      set({ settingsCollapsed: false, activeTab: "basic" });
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

    // Declared outside the try so the catch can still reach them: a run that dies mid-stream has
    // to be able to persist the samples that already finished.
    const finals: { dataUrl: string; sampleIndex: number }[] = [];
    const batchId = Date.now();
    let baseSeed = 0;

    // Persist whatever finished and reveal it. Called from both the success tail and the catch.
    const commit = async (): Promise<GalleryImage[]> => {
      if (!finals.length) return [];
      const ordered = finals.slice().sort((a, b) => a.sampleIndex - b.sampleIndex);
      const saved = await Promise.all(
        ordered.map(async (f, i) => {
          // Per-image seed, not the batch base seed — otherwise "Use these settings" on image #3
          // silently restores image #1's recipe while the toolbar chip shows the correct seed.
          const img: GalleryImage = {
            dataUrl: f.dataUrl,
            timestamp: new Date().toISOString(),
            filename: `nyanovel_${batchId}_${i + 1}.png`,
            seed: baseSeed + f.sampleIndex,
            settings: { ...settings, seed: baseSeed + f.sampleIndex },
            batchId,
            batchIndex: i,
            batchSize: ordered.length,
          };
          img.id = await saveImage(img);
          return img;
        }),
      );

      set((s) => ({ images: [...saved.slice().reverse(), ...s.images] }));
      set({ selectedBatch: saved, selectedImage: saved[0], galleryOpen: true });
      return saved;
    };

    try {
      const { seed, events } = await client.generate(settings);
      baseSeed = seed;

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
          // The tile must adopt the FINAL image, not keep the last INTERMEDIATE. Previously the
          // frame that un-blurred on completion was the penultimate latent — legible only
          // *because* it was blurred — which then swapped to a different image once the batch
          // committed. And a stream that emits no intermediates at all left dataUrl null while
          // status flipped to "done", stranding the tile on a shimmer that never resolved.
          const dataUrl = ev.image.toDataURL();
          finals.push({ dataUrl, sampleIndex: ev.samp_ix });
          set((s) => ({
            streamingBatch:
              s.streamingBatch?.map((t) =>
                t.sampleIndex === ev.samp_ix ? { ...t, dataUrl, progress: 1, status: "done" } : t,
              ) ?? null,
          }));
        }
      }

      const saved = await commit();

      if (get().abortRequested) {
        toast(saved.length ? `Stopped — kept ${saved.length} finished image${saved.length > 1 ? "s" : ""}` : "Stopped");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Generation failed", e);

      // Samples that already finished are paid for and unreproducible, so a late failure must not
      // discard them — the abort path above already keeps them, and diverging here was the bug.
      // Persisting is best-effort: a save failure must not mask the error that actually broke the run.
      let rescued: GalleryImage[] = [];
      try {
        rescued = await commit();
      } catch (saveErr) {
        console.error("Could not persist images from the failed run", saveErr);
      }

      if (rescued.length) {
        // Not an ErrorState: there are images on screen. A full-canvas error card would cover
        // the very thing that survived.
        toast.error(`Run failed — kept ${rescued.length} finished image${rescued.length > 1 ? "s" : ""}`);
      } else {
        set({ lastError: { message, at: Date.now() } });
        toast.error(`Generation failed: ${message}`);
      }
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
    // The recipe is the one piece of state the user actually authored, and it was the only thing
    // init() didn't restore — so ⌘R wiped it, one key away from the ⌘↵ generate gesture.
    const savedSettings = loadSettings();
    if (savedSettings) set({ settings: savedSettings });
    const savedUI = loadUIPrefs();
    if (savedUI) set(savedUI);

    if (cfg) {
      // Trust the stored token immediately so the app is usable on first paint, then check it in
      // the background. A revoked or expired key otherwise shows "Connected" forever and only
      // reveals itself as a failed generation.
      set({ connection: cfg, client: new NaiClient(cfg), connectionStatus: "ok" });
      void verifyToken(cfg).then((verdict) => {
        // Only a hard rejection revokes, and never mid-run — a background probe must not yank the
        // client out from under a generation that is currently streaming.
        if (verdict === "invalid" && !get().isGenerating) {
          clearConnection();
          set({ connection: null, client: null, connectionStatus: "invalid", showConnect: true });
          toast.error("Your saved token is no longer valid — please reconnect.");
        }
      });
    } else {
      set({ showConnect: true });
    }
    await get().loadGallery();
  },
}));

// Persist the recipe and the panel layout. Debounced rather than per-keystroke — typing a prompt
// would otherwise serialise the whole settings object on every character.
if (typeof window !== "undefined") {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: GenerationSettings | null = null;
  let lastUI = "";

  useStore.subscribe((s) => {
    const uiKey = `${s.settingsCollapsed}|${s.activeTab}|${s.galleryOpen}`;
    if (s.settings === last && uiKey === lastUI) return;
    last = s.settings;
    lastUI = uiKey;
    clearTimeout(timer);
    timer = setTimeout(() => {
      saveSettings(s.settings);
      saveUIPrefs({
        settingsCollapsed: s.settingsCollapsed,
        activeTab: s.activeTab,
        galleryOpen: s.galleryOpen,
      });
    }, 400);
  });
}

import type { GenerationSettings } from "@/lib/nai/types";

// IndexedDB-backed local gallery. Each record keeps a full settings snapshot + the
// resolved seed so any image can restore the whole form — and so it can later be
// ported to latent.moe with its complete generation recipe intact.

export type GalleryImage = {
  id?: number;
  dataUrl: string;
  timestamp: string;
  filename: string;
  seed: number;
  settings: GenerationSettings;
  batchId: number;
  batchIndex: number;
  batchSize: number;
  /** Set when the image is the output of a director tool rather than a fresh generation. */
  processedWith?: string;
};

const DB_NAME = "nyanovel-images";
const DB_VERSION = 1;
const STORE = "images";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

/** All images, newest first. */
export async function loadImages(): Promise<GalleryImage[]> {
  const images = await tx<GalleryImage[]>("readonly", (s) => s.getAll());
  return images.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

export async function saveImage(image: GalleryImage): Promise<number> {
  // Only `settings` carries a reactive proxy, so that's the only field that needs cloning.
  // This used to round-trip the whole record through JSON — which meant re-encoding a
  // multi-megabyte base64 dataUrl twice, on the main thread, once per image. That was the
  // multi-second freeze between "Finishing up" and the result appearing, and it ate the
  // hero fade whole.
  const { id: _id, ...rest } = image;
  const clean = { ...rest, settings: structuredClone(image.settings) };
  return tx<IDBValidKey>("readwrite", (s) => s.add(clean)).then((k) => k as number);
}

export function deleteImage(id: number): Promise<void> {
  return tx("readwrite", (s) => s.delete(id)).then(() => undefined);
}

export function clearImages(): Promise<void> {
  return tx("readwrite", (s) => s.clear()).then(() => undefined);
}

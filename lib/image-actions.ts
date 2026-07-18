import { toast } from "sonner";

/** Trigger a browser download of a data-url image. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || "nyanovel-image.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Copy an image to the clipboard, falling back to copying the data-url text. */
export async function copyImageToClipboard(dataUrl: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    toast.success("Image copied to clipboard");
  } catch {
    try {
      await navigator.clipboard.writeText(dataUrl);
      toast.success("Image data copied");
    } catch {
      toast.error("Couldn't copy image");
    }
  }
}

"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { parseReference } from "@/lib/nai/client";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Slider } from "@/components/ui/slider";

/** Multi-image uploader for vibe transfer / director reference, with per-image sliders. */
export function ReferenceUploader({
  field,
  emptyLabel,
}: {
  field: "vibe" | "directorReference";
  emptyLabel: string;
}) {
  const refs = useStore((s) => s.settings[field]);
  const add = useStore((s) => s.addReference);
  const update = useStore((s) => s.updateReference);
  const remove = useStore((s) => s.removeReference);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const { base64, preview } = await parseReference(file);
        add(field, { base64, preview, strength: 0.6, informationExtracted: 1.0 });
      } catch (e) {
        console.error(e);
        toast.error(`Couldn't read ${file.name}`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <Button variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" /> Add reference image
      </Button>

      {refs.length === 0 ? (
        <p className="mt-2 text-center text-[12px] text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {refs.map((r, i) => (
            <div key={i} className="flex gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface-2 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.preview}
                alt="reference"
                className="size-16 shrink-0 rounded-[8px] object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Slider
                  label="Strength"
                  min={0}
                  max={1}
                  step={0.05}
                  value={r.strength}
                  onValueChange={(v) => update(field, i, { strength: v })}
                  format={(v) => v.toFixed(2)}
                />
                <Slider
                  label="Info extracted"
                  min={0}
                  max={1}
                  step={0.05}
                  value={r.informationExtracted}
                  onValueChange={(v) => update(field, i, { informationExtracted: v })}
                  format={(v) => v.toFixed(2)}
                />
              </div>
              <IconButton
                label="Remove reference"
                size="sm"
                variant="subtle"
                onClick={() => remove(field, i)}
                className="self-start hover:text-danger"
              >
                <X />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

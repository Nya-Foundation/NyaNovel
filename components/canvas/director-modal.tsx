"use client";

import { useState } from "react";
import { Loader2, ScanLine, PencilLine, Eraser, Sparkles, Palette, Smile, ArrowUpRight, Wand2 } from "lucide-react";
import { useStore, type DirectorKind } from "@/lib/store";
import { EMOTION_OPTIONS } from "@/lib/nai/models";
import { EmotionOptions } from "nekoai-js";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const DIRECTOR_LABELS: Record<DirectorKind, string> = {
  lineArt: "Extracting line art…",
  sketch: "Sketching…",
  backgroundRemoval: "Removing background…",
  declutter: "Decluttering…",
  colorize: "Colorizing…",
  emotion: "Changing emotion…",
  upscale: "Upscaling 4× — this can take a while…",
  enhance: "Enhancing…",
};

const ONE_TAP: { kind: DirectorKind; label: string; icon: React.ReactNode }[] = [
  { kind: "lineArt", label: "Line art", icon: <ScanLine className="size-4" /> },
  { kind: "sketch", label: "Sketch", icon: <PencilLine className="size-4" /> },
  { kind: "backgroundRemoval", label: "Remove BG", icon: <Eraser className="size-4" /> },
  { kind: "declutter", label: "Declutter", icon: <Sparkles className="size-4" /> },
  { kind: "upscale", label: "Upscale 4×", icon: <ArrowUpRight className="size-4" /> },
  { kind: "enhance", label: "Enhance", icon: <Wand2 className="size-4" /> },
];

export function DirectorModal() {
  const show = useStore((s) => s.showDirector);
  const setUI = useStore((s) => s.setUI);
  const selected = useStore((s) => s.selectedImage);
  const processing = useStore((s) => s.isDirectorProcessing);
  const kind = useStore((s) => s.directorKind);
  const run = useStore((s) => s.runDirector);

  const [emotion, setEmotion] = useState<EmotionOptions>(EmotionOptions.NEUTRAL);
  const [emotionPrompt, setEmotionPrompt] = useState("");
  const [level, setLevel] = useState(0);
  const [colorizePrompt, setColorizePrompt] = useState("");
  const [defry, setDefry] = useState(0);

  return (
    <Modal
      open={show}
      onClose={() => setUI({ showDirector: false })}
      dismissible={!processing}
      title="Director tools"
      description="Transform the selected image. Each result is saved as a new image."
      className="max-w-xl"
    >
      <div className="relative flex flex-col gap-5">
        {processing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] bg-surface/70 backdrop-blur-sm">
            <Loader2 className="motion-keep size-6 animate-spin text-accent" />
            {/* A bare spinner made a 30s+ 4x upscale and an instant line-art look identical. */}
            <span className="text-[12.5px] font-semibold text-fg">{DIRECTOR_LABELS[kind ?? "upscale"]}</span>
          </div>
        )}

        {selected && (
          <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface-2 p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.dataUrl} alt="" className="size-14 rounded-[8px] object-cover" />
            <span className="text-[13px] text-muted">Working on the selected image</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {ONE_TAP.map((t) => (
            <Button key={t.kind} variant="outline" size="sm" disabled={processing} onClick={() => void run(t.kind)}>
              {t.icon} {t.label}
            </Button>
          ))}
        </div>

        <div className="rounded-[var(--radius-card)] border border-border-soft bg-surface-2 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg-2">
            <Smile className="size-4" /> Change emotion
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="emotion">Emotion</Label>
              <Select id="emotion" value={emotion} onChange={(e) => setEmotion(e.target.value as EmotionOptions)}>
                {EMOTION_OPTIONS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Weaken level</Label>
              <Slider min={0} max={5} value={level} onValueChange={setLevel} />
            </div>
          </div>
          <Input
            className="mt-3"
            placeholder="Optional extra prompt"
            value={emotionPrompt}
            onChange={(e) => setEmotionPrompt(e.target.value)}
          />
          <Button
            className="mt-3 w-full"
            size="sm"
            disabled={processing}
            onClick={() => void run("emotion", { emotion, prompt: emotionPrompt, level })}
          >
            Apply emotion
          </Button>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border-soft bg-surface-2 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg-2">
            <Palette className="size-4" /> Colorize
          </div>
          <div className="mb-3">
            <Label>Defry</Label>
            <Slider min={0} max={5} value={defry} onValueChange={setDefry} />
          </div>
          <Input
            placeholder="Optional color guidance prompt"
            value={colorizePrompt}
            onChange={(e) => setColorizePrompt(e.target.value)}
          />
          <Button
            className="mt-3 w-full"
            size="sm"
            disabled={processing}
            onClick={() => void run("colorize", { prompt: colorizePrompt, defry })}
          >
            Apply colorize
          </Button>
        </div>
      </div>
    </Modal>
  );
}

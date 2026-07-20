"use client";

import { motion } from "motion/react";
import { Loader2, Sparkles, PanelLeftClose, Square } from "lucide-react";
import { toast } from "sonner";
import { useStore, type SettingsTab } from "@/lib/store";
import { spring } from "@/lib/motion";
import { DEFAULT_SETTINGS } from "@/lib/nai/types";
import { modelLabel } from "@/lib/nai/models";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PanelHeader } from "@/components/ui/panel-header";
import { BasicTab } from "./basic-tab";
import { AdvancedTab } from "./advanced-tab";
import { CharactersTab } from "./characters-tab";

export function SettingsSidebar() {
  const activeTab = useStore((s) => s.activeTab);
  const setUI = useStore((s) => s.setUI);
  const generate = useStore((s) => s.generate);
  const cancelGenerate = useStore((s) => s.cancelGenerate);
  const isGenerating = useStore((s) => s.isGenerating);
  const abortRequested = useStore((s) => s.abortRequested);
  const canCancelGeneration = useStore((s) => s.canCancelGeneration);
  const streaming = useStore((s) => s.streamingBatch);
  const nSamples = useStore((s) => s.settings.nSamples);
  const characterCount = useStore((s) => s.settings.characters.filter((c) => c.enabled).length);
  const referenceCount = useStore((s) => s.settings.vibe.length + s.settings.directorReference.length);
  const settings = useStore((s) => s.settings);
  const resetSettings = useStore((s) => s.resetSettings);
  // Reset only appears once there's something to reset — on a clean form it would be a control
  // that visibly does nothing.
  const isDirty = JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS);

  // Badges announce state the tab is currently hiding — otherwise enabling three characters and
  // returning to Basic looks identical to a clean slate.
  const TABS: { value: SettingsTab; label: string; badge?: number }[] = [
    { value: "basic", label: "Basic" },
    { value: "advanced", label: "Advanced", badge: referenceCount },
    { value: "characters", label: "Characters", badge: characterCount },
  ];

  const done = streaming?.filter((t) => t.status === "done").length ?? 0;
  const meanProgress = streaming?.length ? streaming.reduce((a, t) => a + t.progress, 0) / streaming.length : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border-soft">
        <PanelHeader
          title="Composer"
          subtitle={`${modelLabel(settings.model, true)} · ${settings.width}×${settings.height} · ${settings.steps} steps`}
          leading={
            <IconButton
              label="Collapse settings"
              size="sm"
              title="Collapse settings — ["
              onClick={() => setUI({ settingsCollapsed: true })}
            >
              <PanelLeftClose />
            </IconButton>
          }
          actions={isDirty && !isGenerating ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[12px] text-muted"
              title="Reset every setting to its default"
              onClick={() => {
                const prev = settings;
                resetSettings();
                toast("Settings reset", {
                  duration: 6000,
                  action: { label: "Undo", onClick: () => useStore.setState({ settings: prev }) },
                });
              }}
            >
              Reset
            </Button>
          ) : undefined}
        />
        <div className="px-3 pb-3">
        <Segmented
          asTabs
          aria-label="Settings sections"
          options={TABS}
          value={activeTab}
          onValueChange={(v) => setUI({ activeTab: v })}
          className="flex w-full"
        />
        </div>
      </div>

      {/* Keyed so switching tabs cross-fades instead of hard-swapping a 360px column in one frame.
          Plain opacity — these are peer panels, not a sequence, so a slide would imply order. */}
      <div
        key={activeTab}
        role="tabpanel"
        aria-label={TABS.find((t) => t.value === activeTab)?.label}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ animation: "fadeIn var(--duration-fast) var(--ease-out)" }}
      >
        {activeTab === "basic" && <BasicTab />}
        {activeTab === "advanced" && <AdvancedTab />}
        {activeTab === "characters" && <CharactersTab />}
      </div>

      <div className="shrink-0 border-t border-border-soft bg-surface p-3 shadow-[0_-10px_28px_-20px_rgba(0,0,0,0.7)]">
        {isGenerating ? (
          <div className="flex items-center gap-2">
            {/* The percentage was text-only. A determinate fill behind it turns the primary slot
                into the progress indicator itself, so progress is readable peripherally without
                parsing two numbers. */}
            <div className="relative flex h-12 min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-[var(--radius-button)] bg-surface-2 px-3.5">
              {canCancelGeneration && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-accent/18"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(meanProgress * 100)}%` }}
                  transition={spring.soft}
                />
              )}
              <Loader2 className="motion-keep relative z-10 size-4 shrink-0 animate-spin text-accent" />
              <span className="relative z-10 truncate text-[13.5px] font-semibold text-fg">
                {abortRequested ? "Stopping…" : canCancelGeneration ? "Generating" : "Generating with V3"}
                <span className="ml-1.5 font-[family-name:var(--font-mono)] text-[12.5px] tabular-nums text-muted">
                  {canCancelGeneration
                    ? `${done}/${streaming?.length ?? nSamples} · ${Math.round(meanProgress * 100)}%`
                    : "final image only"}
                </span>
              </span>
            </div>
            {canCancelGeneration && (
              <Button
                variant="outline"
                size="lg"
                className="h-12 shrink-0 px-4"
                disabled={abortRequested}
                onClick={cancelGenerate}
                title="Stop — finished images are kept"
              >
                <Square className="size-4" /> Stop
              </Button>
            )}
          </div>
        ) : (
          <Button
            className="h-12 w-full text-[15px]"
            onClick={() => void generate()}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            title="Generate — ⌘↵"
          >
            <Sparkles className="size-[18px]" /> Generate{nSamples > 1 ? ` · ${nSamples}` : ""}
          </Button>
        )}
      </div>
    </div>
  );
}

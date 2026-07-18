"use client";

import { Loader2, Sparkles, PanelLeftClose, Square } from "lucide-react";
import { useStore, type SettingsTab } from "@/lib/store";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { focusRing } from "@/components/ui/input";
import { BasicTab } from "./basic-tab";
import { AdvancedTab } from "./advanced-tab";
import { CharactersTab } from "./characters-tab";
import { cn } from "@/lib/utils";

export function SettingsSidebar() {
  const activeTab = useStore((s) => s.activeTab);
  const setUI = useStore((s) => s.setUI);
  const generate = useStore((s) => s.generate);
  const cancelGenerate = useStore((s) => s.cancelGenerate);
  const isGenerating = useStore((s) => s.isGenerating);
  const abortRequested = useStore((s) => s.abortRequested);
  const streaming = useStore((s) => s.streamingBatch);
  const nSamples = useStore((s) => s.settings.nSamples);
  const characterCount = useStore((s) => s.settings.characters.filter((c) => c.enabled).length);
  const referenceCount = useStore((s) => s.settings.vibe.length + s.settings.directorReference.length);

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
      <div className="flex shrink-0 items-center gap-2 border-b border-border-soft p-3">
        <button
          type="button"
          aria-label="Collapse settings"
          title="Collapse settings — ["
          onClick={() => setUI({ settingsCollapsed: true })}
          className={cn(
            "shrink-0 rounded-[8px] p-2 text-muted transition-colors duration-instant hover:bg-surface-2 hover:text-fg",
            focusRing,
            "focus-visible:ring-offset-surface",
          )}
        >
          <PanelLeftClose className="size-4" />
        </button>
        <Segmented asTabs aria-label="Settings sections" options={TABS} value={activeTab} onValueChange={(v) => setUI({ activeTab: v })} className="flex-1" />
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
            <div className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-button)] bg-surface-2 px-3.5">
              <Loader2 className="motion-keep size-4 shrink-0 animate-spin text-accent" />
              <span className="truncate text-[13.5px] font-semibold text-fg">
                {abortRequested ? "Stopping…" : "Generating"}
                <span className="ml-1.5 font-[family-name:var(--font-mono)] text-[12.5px] tabular-nums text-muted">
                  {done}/{streaming?.length ?? nSamples} · {Math.round(meanProgress * 100)}%
                </span>
              </span>
            </div>
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

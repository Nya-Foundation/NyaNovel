# NyaNovel Redesign — UX Panel Spec ("Lightwall Studio")

> **STATUS: UNIMPLEMENTED EXPLORATION — not a build reference.**
> The shipped app is a conventional three-column studio (360px settings sidebar / canvas / 280px
> gallery drawer), not the gallery-native Wall + Composer Dock described below. None of the Lightwall
> layout, the Peek/Half/Full snaps, or the Focus Inspector exist in the codebase.
>
> This document is retained as a record of design *intent* — accent as the single load-bearing color,
> mono for all numerics, a shared motion vocabulary — all of which are being honored inside the
> existing shell. For the plan that is actually being built, see [`ux-polish-plan.md`](./ux-polish-plan.md).

Synthesized from a 4-designer / 3-judge UX design review panel. This is the build reference for the
NyaNovel v2 rebuild (Next.js 16 + Bun + latent.moe theme).

## Directions explored (panel)

| Direction | Thesis | Judge totals (UX-research / art-director / staff-eng) |
|---|---|---|
| **Patchbay** | Prompt-engineering DAW: 5-region console, git-diff + parameter sweep | 7.3 / 6.6 / 6.0 |
| **Atelier** | Focused canvas: image-as-hero, single centered composer, cinematic "Resolve" | 7.3 / 7.8 / 7.5 |
| **Living Composer** | One chat-like prompt bar that grows into a studio (mobile-first, tiered) | 5.8 / 7.3 / 7.1 |
| **Lightwall** ★ | Gallery-native: history IS the app, generation happens in place | 7.2 / 7.6 / 7.7 |

No direction swept → **base + graft**.

## Recommendation: "Lightwall Studio" (Lightwall base + grafts)

Gallery-native. Home state is an infinite, justified, **virtualized Wall** of past batches (IndexedDB).
Generation happens INSIDE the history: a live batch card pins to the top of the Wall and each sample
denoises in place with the "Resolve" animation. Fixes Lightwall's one hole — the composer's **Peek**
snap is *permanently pinned* (never hidden), and on desktop ≥1280px **Full** opens as a right-side
drawer beside a live (un-scrimmed) Wall.

**Fallback:** Atelier (focused canvas) — adopt if the gallery-virtualization perf spike fails on
mid-range mobile.

### Layout — five persistent regions
- **Rail** (left, 56px): scope switches (All / Pinned / Lineage), accent swatches + light/dark, Connect/status dot. → bottom tab bar on mobile.
- **Header** (top, 52px): wordmark + "part of latent.moe", tag/prompt search, group-by (Batch/Model/Day), density/zoom slider, Compare toggle (v2), Cmd+K, overflow (Clear all, Export/Import).
- **The Wall** (center): justified rows, newest-first, virtualized. Each batch = Card (model badge, mono seed, timestamp, sample count) + thumbnail mini-row.
- **Composer Dock** (bottom): snaps **Peek** (pinned: prompt + Tier-1 chips + Generate) / **Half** (core params) / **Full** (tabs: Params · Cast · Vibe · Reference; in-sheet param search). Desktop ≥1280px Full = right drawer beside live Wall.
- **Focus Inspector** (on thumbnail click; right dock desktop / full-screen mobile): tabs Info · Director · Lineage · Actions.

### Signature features
1. **In-place streaming "Resolve"** — live batch card atop the Wall; each sample: accent shimmer → blurred latent → sharpen step-by-step → traveling accent ring → mono `NN/NN` counter → soft-scale settle. Reduced-motion path = instant grid.
2. **One-gesture steal-settings + lineage** — drag any past image onto the composer (or Remix / "Load all into composer") repopulates every param; director/upscale outputs are lineage children.
3. **Permanently-pinned Peek + Tier-0/1/2 stratification** — one prompt line + configurable 4-chip rail (aspect/model/count/seed) always visible; Half/Full on demand.
4. **Git-style parameter DIFF** (v2) — select ≤4 results → synced split + mono delta table of exactly which knobs moved.
5. **Parameter SWEEP** (v2) — pin a numeric axis (CFG/steps/rescale), range+count → labelled strip, swept value stamped in mono.
6. **Inline Danbooru `suggestTags`** — caret popover in prompt, negative, AND character fields (tag name, category color chip, mono post count; `{}`/`[]` weight chips).
7. **Character POSITION puck** at true aspect ratio, optionally overlaid on the focused result.
8. **Density/zoom slider** (contact-sheet → poster) + **Cmd+K** / Cmd+Enter keyboard drive.

### Component system
shadcn-style CVA primitives in `components/ui/`, styled only through the existing latent tokens
(`app/globals.css`), `cn()` from `lib/utils.ts`. Radii: chip 8 / input 10 / button 10 / card 14.
Accent is the single load-bearing color (Generate, active chip/scope, progress rings, focus, selected
outline, position puck, diff highlight, tag-category emphasis) — never broad fills. Mono (JetBrains)
for ALL numerics. Build: Button, Input/NumericStepper, Textarea (auto-grow), Card, Popover, Select,
Slider, Chip/Badge, Switch, Tabs/SegmentedControl, Sheet/Drawer (3 snaps), Dialog, Tooltip,
**ProgressRing** (the Resolve ring), ScrollArea (virtualized), DropZone.

Client architecture: all `'use client'`. `lib/nai/` wraps `nekoai-js@1.3.0` (token/host/retry from
localStorage; streaming feeds Resolve tiles). `lib/db/` over IndexedDB (idb/Dexie) storing batches,
sample blobs, **full param snapshot per sample** + `parentId` (enables restore + diff + lineage).
Lightweight store (Zustand or context) for composer params / connection / selection. Thumbnail
virtualization + blob-URL lifecycle + eviction policy are first-class.

### Feature placement (all homed)
Connect/onboarding → Rail + first-run card · prompt/negative → Peek (± toggle) · model → Tier-1 chip +
Params · resolution presets + custom W/H → Aspect chip + Half · steps/sampler/CFG → Half + Params ·
seed lock/random → Tier-1 chip; copy-seed from Focus · CFG rescale/noise/UC preset → Params (searchable)
· quality/dynamic-threshold/autoSMEA → Params toggle chips · batch n_samples → ×N chip + Half ·
character prompts (prompt/UC/position/enable/reorder) → Cast tab + position puck · vibe transfer →
Vibe tab · director/character reference (1.3.0) → Reference tab · suggestTags → caret popover ·
upscale/enhance (1.3.0) → Focus Actions/Director (lineage child) · streaming → in-place Resolve card ·
director tools (line art/sketch/bg-removal/declutter/change-emotion/colorize) → Focus Director tab ·
gallery (download/copy/copy-seed/delete/clear-all/restore) → the Wall + Focus · accent/light-dark → Rail.

## Build phases
- **P0 — Foundations (spike week):** CVA primitives; `lib/nai/` nekoai-js wrapper (verify one non-streaming generate returns a blob); `lib/db/` IndexedDB schema (batch/sample/param-snapshot + parentId); **virtualization perf spike** over ~1000 images on mid-range mobile (make-or-break gate); global store; Connect onboarding; app shell (Rail + Header + empty Wall + Peek).
- **P1 — Generate + Wall core:** non-streaming Generate (Peek/Half); persist as batch cards on justified virtualized Wall (group-by, density slider); Focus Info + Actions; Clear-all; Toaster.
- **P2 — Streaming Resolve + full params + deep tools:** in-place live card + per-sample Resolve (+ reduced-motion); Full tabs (Params searchable, Cast + position puck, Vibe, Reference); suggestTags in all field types; Focus Director tab + Upscale/Enhance (lineage children).
- **P3 — Remix loop + provenance + keyboard:** drag-to-steal-settings + Load-all; Lineage tab + Rail scope; configurable Tier-1 chips; Cmd+K + Cmd+Enter; desktop Full side-drawer; "Simple" density default + coachmarks; Export/Import.
- **P4 — Power-user depth (v2):** git-style DIFF + Compare (≤4); parameter SWEEP; eviction/quota UI; position-puck overlay on focused result.

## Risks
1. **Gallery virtualization/decode** — the make-or-break premise. Week-1 spike; downscaled thumbnail blobs; fixed-row justified layout; decode budget + off-screen unmount. Fallback = Atelier.
2. Client memory pressure (many images + live streams) — virtualization, revoke blob URLs, eviction/quota UI, cap concurrent streaming tiles.
3. Mobile Full still scrims (no room for side-by-side) — accepted; desktop gets the un-scrimmed drawer.
4. Newcomer learnability of a gallery-first empty state — onboarding, pre-filled example prompt, "Simple" default, coachmarks.
5. Deferred v2 power features — ship drag-to-steal + lineage + Resolve in v1; keep the per-sample param-snapshot schema diff-ready from P0 so v2 is additive.
6. **Verify `nekoai-js@1.3.0` API shapes early** — exact streaming event contract, director-tool signatures, `suggestTags` source (P0/P2). The Resolve tile depends on per-step intermediate frames actually being emitted.
7. `suggestTags` needs a client-reachable Danbooru tag source — confirm CORS/rate limits or bundle a local tag index, else it degrades silently.

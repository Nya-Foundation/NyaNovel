## Overview

The single biggest thing holding this UI back is that **the app has no shared vocabulary for change** — no motion tokens, no focus-ring utility, no error state, no cancel path — so every transition, every wait, and every failure was decided ad hoc at the call site or not at all. The most visible symptom is the moment the user commits: pressing Generate destroys the image they were looking at, offers no way to stop, no keyboard path in, and on failure drops them to the first-run hero with a toast that vanishes. Underneath that, a token layer exists (`--radius-*`, `--shadow-panel`, `--ring-accent` in `app/globals.css`) that literally zero components consume, so the design system cannot currently change the app's shape or elevation. Fix the shared layer first — motion scale, focus ring, run-state model — then the individual polish items become one-liners instead of judgement calls. Everything below stays inside the existing three-column shell.

---

## Tier 0 — Infrastructure (build these first; later tiers depend on them)

### 0.1 Motion + focus token layer

**Files:** `app/globals.css`, `components/ui/input.tsx`

**Before:** Nine one-off durations (150/180/200/240/300/1400ms) and two easing families — modals open on `ease-out`, the buttons inside them on Tailwind's default `ease-in-out`. Four bare `transition-colors` with no duration. Reduced-motion users get `animation: none !important`, which freezes the Generate spinner and the Director overlay into dead glyphs indistinguishable from a hang.

**After:** Four durations and three easings, used everywhere. Reduced motion collapses transitions without killing progress indicators.

**Implementation:**
- Add to the existing `@theme inline` block (line 9): `--duration-instant: 90ms`, `--duration-fast: 160ms`, `--duration-base: 240ms`, `--duration-slow: 320ms`; `--ease-out: cubic-bezier(0.22,1,0.36,1)`, `--ease-in: cubic-bezier(0.55,0,1,0.45)`, `--ease-standard: cubic-bezier(0.4,0,0.2,1)`. Tailwind v4 auto-generates `duration-fast`/`ease-out` utilities.
- Assignment rule: color/opacity → `instant`; transform/size → `fast` or `base`; layout → `slow`.
- Replace the reduced-motion block (globals.css:147-148) with the standard formulation — `animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important;` — then add an opt-out `.motion-keep, .motion-keep * { animation-duration: revert !important; animation-iteration-count: revert !important; }` and apply `.motion-keep` to the Generate spinner (`components/sidebar/settings-sidebar.tsx:52`), the Director overlay spinner (`components/canvas/director-modal.tsx:49`), and the shimmer wrapper (`components/canvas/streaming-grid.tsx:44`).
- Export a `focusRing` constant next to `fieldBase` in `components/ui/input.tsx`: `"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"`. Nothing consumes it yet — 0.2 does.

> Note for every subsequent item: `--duration-*` / `--ease-*` do **not** exist today. Several source findings cite them as if they do. They only become valid after 0.1 lands.

### 0.2 Apply the focus ring to all 19 hand-rolled buttons

**Files:** `components/studio.tsx:31,54`, `components/site-header.tsx:28`, `components/theme-controls.tsx:52,65`, `components/gallery/gallery-panel.tsx:46,55,71`, `components/canvas/canvas.tsx:76,123,167`, `components/canvas/lightbox.tsx:101`, `components/ui/modal.tsx:71`, `components/sidebar/settings-sidebar.tsx:31`, `components/sidebar/reference-uploader.tsx:85`, `components/sidebar/characters-tab.tsx:42`, `components/sidebar/tag-textarea.tsx:114`, `components/canvas/canvas.tsx:42`

**Before:** `Button`/`Switch`/`Chip`/`Segmented`/`Slider` all carry a focus ring; every raw `<button>` in the app has zero (`grep -c focus-visible` returns 0 for all non-`ui/` components). Tabbing through produces an indicator that appears, vanishes, and changes shape depending on which file you're in.

**After:** One consistent accent ring across the whole keyboard traversal.

**Implementation:** Apply `focusRing` from 0.1. Use `ring-offset-surface` inside panels and `ring-offset-black` inside the lightbox. On the gallery tiles (`gallery-panel.tsx:71`), selection already uses `ring-2 ring-accent` — give focus a distinct treatment (accent ring **plus** `ring-offset-2` halo) so focus ≠ selection.

### 0.3 Run-state model in the store: `lastError`, abort, non-destructive start

**Files:** `lib/store.ts:200-278`, `components/canvas/canvas.tsx:200-202`

This is the single highest-value change in the document and unblocks four Tier 1 items. Three coupled edits to `generate()`:

1. **Stop nulling the selection at start.** Delete `selectedBatch: null, selectedImage: null` from the set() at lines 209-210. The success path at line 272 already overwrites the selection, so no explicit clear is needed — and on the catch path the user's previous image now simply survives.
2. **Add `lastError: { message: string; at: number } | null`.** Set it in the catch (line 273) alongside the existing toast; clear it at the top of `generate()` and `runDirector()` (which shares the same catch-and-toast pattern).
3. **Add an `AbortController`-style stop.** Keep an `aborted` flag on the store and `break` out of the `for await (const ev of events)` loop when set — breaking the loop calls the iterator's `.return()` and closes the stream reader. **Do not** thread a `signal` into `NaiClient.generate`: nekoai-js's AbortControllers are internal and timeout-only, and its own types state long-running streams are not aborted mid-generation. On abort, save any tiles already at `status: "done"` rather than discarding the batch in the `finally` (line 277).

Then give `Canvas` a third branch before `EmptyState`.

---

## Tier 1 — Highest felt impact per unit of effort

### 1.1 Generate no longer destroys the canvas; failures explain themselves

*(merges: "Pressing Generate deletes the image you were remixing from", "A failed generation leaves an empty canvas", "Generation failure destroys the canvas")*

**Files:** `lib/store.ts`, `components/canvas/canvas.tsx`

**Before:** Press Generate → your image vanishes, replaced by grey shimmer. If the run fails, the toast fades and you're staring at "What should we imagine?" as if nothing ever happened — with your previous result gone from the canvas and no retry.

**After:** The previous image stays as the ambient backdrop behind the streaming tiles. A failure leaves you exactly where you were, with a named error and a way out.

**Implementation:** Depends on 0.3. Render the previous image as the blurred ambient backdrop behind the tile grid, reusing the exact treatment already at `canvas.tsx:106-113` (`scale-110 object-cover opacity-25 blur-3xl`). Add the error branch in `Canvas` before `EmptyState`: title, human-mapped message (401/403 → "Your NovelAI token was rejected" + button firing `setUI({showConnect: true})`; 402/429 → "NovelAI quota or rate limit"; else raw text under a "Details" disclosure), and a primary "Try again" calling `generate()`. Caveat: the catch only has `e.message`, so status mapping may need a probe rather than string matching — ship the generic card first.

### 1.2 Cancel an in-flight generation

**Files:** `lib/store.ts`, `components/sidebar/settings-sidebar.tsx:44-59`

**Before:** An 8-sample misfire or a typo spotted at step 3/28 means sitting through the whole run — or reloading and losing every streamed tile (images are only persisted *after* the loop). Retry on 429/5xx with 2s base delay can extend that lock-in well past one generation.

**After:** A Stop button. Partial results are kept.

**Implementation:** Depends on 0.3. Make the sidebar footer a two-state control while generating: label area shows aggregate progress text, with a `Square` "Stop" button to its right.

### 1.3 `Cmd/Ctrl+Enter` to generate

*(merges: "No keyboard path to Generate", "No submit accelerator")*

**Files:** `components/studio.tsx`, `components/sidebar/settings-sidebar.tsx`, `components/sidebar/tag-textarea.tsx:87`

**Before:** `generate()` has exactly one call site — the sidebar button's `onClick`. From the prompt textarea (where users live) every commit is a mouse round-trip.

**After:** Type, hit ⌘↵, watch.

**Implementation:** One `useEffect` keydown listener in `Studio` (it already has a `useEffect` at studio.tsx:21): `Cmd/Ctrl+Enter` → `generate()` guarded by `isGenerating` and no open modal. **Hazard:** `tag-textarea.tsx:87` handles bare `Enter` whenever the autocomplete popover is open — add a `!e.metaKey && !e.ctrlKey` guard there or the keystroke will double-fire (accept suggestion **and** generate). Surface the binding as `title` + `aria-keyshortcuts` on the Generate button ("Generate — ⌘↵") and in the empty-state copy at `canvas.tsx:36`. Bonus: `[` / `]` toggle the rails (`settingsCollapsed`/`galleryOpen` already exist). Skip the "Escape closes topmost overlay" clause — `modal.tsx:28-40` already does this.

### 1.4 Collapsed settings rail gets Generate + progress

*(merges the two "collapsing the sidebar removes Generate" findings and the collapsed-progress finding)*

**Files:** `components/studio.tsx:29-39`

**Before:** The 44px rail contains exactly one button ("Expand settings"). Collapse the sidebar to see your image bigger and the primary action, the generating spinner, and the batch count all disappear. The gallery rail at least keeps a count badge.

**After:** The rail trades detail for space instead of amputating function.

**Implementation:** Below the expand button, a 36px accent square (`Sparkles`, `aria-label="Generate"`, `title` showing truncated prompt + n samples) calling `generate()`. While `isGenerating`, swap it for `ProgressRing` (`components/ui/progress-ring.tsx` already takes `size`/`children`) driven by the mean of `streamingBatch` progress. Note 1.3 already resolves the dead-end for keyboard users in every layout state, so ship that first; this is the pointer-user half. There is no tooltip primitive in `components/ui/` — use `title`.

### 1.5 "Use these settings" restores the wrong seed

**Files:** `lib/store.ts:255-260`, `components/canvas/canvas.tsx:174`

**Before:** Every image in a batch is saved with `settings: { ...settings, seed }` — the batch *base* seed — while its real seed is `seed + i`. Pick image #3, click "Use these settings", get image #1's recipe. The toolbar Meta chip shows the correct per-image seed, so the UI contradicts itself silently.

**After:** Reuse actually reproduces what you were looking at.

**Implementation:** One line, inside the loop: `const snapshot = { ...settings, seed: seed + i }`. Change the toast (store.ts:124) to name what came back: `Restored — seed ${img.seed}, ${img.settings.steps} steps`.

### 1.6 Sliders show their numbers again

**Files:** `components/ui/slider.tsx:29-36`

**Before:** `Slider` nests its numeric readout inside the `label !== undefined` guard. Six of eight call sites supply the label externally via `<Field>`, so Steps (1–50), Batch size, CFG, Guidance rescale (a 100-position float slider), Weaken level and Defry all render as bare tracks with **no number anywhere**. The `format` closures at those sites are dead code that has never run.

**After:** Every numeric slider displays its mono `tabular-nums` value, restoring the project's "mono for all numerics" rule.

**Implementation:** Split the header row — `{label !== undefined && <span …>{label}</span>}` plus an **always-rendered** readout, in a flex row that right-aligns when there's no label. Zero call-site changes.

### 1.7 Panels fold instead of teleporting

**Files:** `components/studio.tsx:29-44, 48-68`

**Before:** Both rails are conditional renders swapping two entirely different DOM subtrees. Collapse teleports 316px of layout in one frame; the canvas re-flows instantly with no indication of where the panel went. This is the most-used chrome interaction in the app and the least polished moment in it.

**After:** A physical fold.

**Implementation:** One element per side, animate width: `cn('shrink-0 overflow-hidden border-r border-border-soft bg-surface transition-[width] duration-slow ease-standard', collapsed ? 'w-11' : 'w-[360px]')`. Render both the rail button and `<SettingsSidebar />` inside, cross-fading on `opacity duration-fast`; give the sidebar an inner `w-[360px]` wrapper so its internal layout doesn't squash during the tween. Mirror for the gallery. Reduced motion is handled for free by 0.1.

### 1.8 Seed lock/dice icons currently mean the opposite of what they do

**Files:** `components/sidebar/basic-tab.tsx:112-138`

**Before:** In random mode the `Dices` button *pins* a seed (it stops randomizing). Once pinned, the `Lock` icon *unlocks*, and `LockOpen` re-rolls. The row also goes 2→3 children on toggle, so the `flex-1` input visibly resizes under the cursor — on the highest-traffic knob in the app.

**After:** Fixed two-control row that never reflows, with icons encoding *state*, not action.

**Implementation:** Persistent `Dices` button that always re-rolls a concrete seed, plus a lock toggle: `LockOpen` while `seed < 0`, `Lock` when pinned. Aria-labels "Seed is random — click to pin" / "Seed is pinned — click to randomize". Show the last-used seed (`selectedImage.seed`, already stored at store.ts:317) as placeholder text instead of the literal "random".

### 1.9 Batch filmstrip is keyboard-reachable

**Files:** `components/canvas/canvas.tsx:133-151`

**Before:** Each filmstrip result is a bare `<img onClick>` with no tabindex, role, name, or key handler, and `selectImage` is called nowhere else. A keyboard user generating 4 images is permanently pinned to image #1 and can never download, reuse, or Director-process #2–4. WCAG 2.1.1 failure with no workaround.

**After:** Arrow-key navigation across results.

**Implementation:** Wrap in `<div role="listbox" aria-label="Batch results">`; each item becomes `<button role="option" aria-selected={b.id === img.id} aria-label={\`Result ${i+1}, seed ${b.seed}\`}>` around the img, selected one `tabIndex=0`, rest `-1`, Arrow keys moving selection + focus. Focus ring per 0.2. **Skip** the stage-image half of the original proposal — the Expand button at line 123 already gives keyboard access to the lightbox, so wrapping the stage img adds a duplicate tab stop.

### 1.10 Connect: verify the token instead of asserting it

*(merges: "Connected is asserted, never verified", first-run modal wall, "Generate is enabled while disconnected")*

**Files:** `components/connect-modal.tsx:26-56`, `lib/store.ts:109-112`, `components/site-header.tsx:33-37`, `components/sidebar/settings-sidebar.tsx:46`

**Before:** `submit()` only checks the string is non-empty; `connect()` constructs a client and makes **no network request**, then fires "Connected to NovelAI". A truncated or expired token gets a full success ceremony, and the truth arrives minutes later as a generic "Generation failed" toast — so the user blames their prompt. Separately, first run is a hard wall (`dismissible={connected}`, so Escape and backdrop are dead) with no hint where to get a token, and the Generate button looks fully healthy while disconnected, silently opening a modal instead.

**After:** Connection status reports fact, not intent.

**Implementation:**
- Add `connectionStatus: 'idle' | 'verifying' | 'ok' | 'invalid'`. Make `connect()` async and probe the API before `saveConnection`.
  **DISPROVEN — do not use `suggestTags` as the probe.** Verified against the running app with the token `pst-totally-invalid`: `suggestTags('chec')` returned a full result set (`checkered 10,000`, `checkered background 10,000`, …). The endpoint is unauthenticated, so this check would pass for any string and is worse than no check at all. Use a genuinely authenticated call — a user-data/subscription endpoint — and confirm it 401s before building the UI on it.
- Button shows "Verifying…"; on failure keep the modal **open** with an inline field error instead of a false success toast. Drive the header dot from `connectionStatus` (green/amber/red + "Token rejected", click to reconnect).
- Add a help line under the field: "Find it in NovelAI → User Settings → Account → Get Persistent API Token".
- Make the first-run modal dismissible via a "Look around first" text button — `generate()` already re-opens it when `client` is null (store.ts:202-204) and the header pill is a permanent re-entry point, so this can't strand anyone.
- When disconnected, relabel Generate to "Connect to generate" with a `KeyRound` icon so the modal opening is the promised outcome. Keep `disabled` only for `isGenerating`, with `title="Generation in progress"`.

### 1.11 Tabs badge their hidden state

**Files:** `components/ui/segmented.tsx:3-4,40`, `components/sidebar/settings-sidebar.tsx:11-15`

**Before:** Upload two vibe references and enable three characters in Advanced/Characters, return to Basic — the sidebar looks identical to a clean state. Users generate with silently-applied vibe transfer and can't tell from the visible panel why the output looks off.

**After:** Progressive disclosure that announces what it's deferring.

**Implementation:** Extend the option type with `badge?: number`, rendered as a small mono count pill after the label. Characters = `characters.filter(c => c.enabled).length`; Advanced = `vibe.length + directorReference.length`. **Drop** the original proposal's "same badge on the collapsed rail's tab icons" (no such icons exist) and defer the "dot when Guidance differs from defaults" (no defaults-diff exists in the store).

---

## Tier 2 — Worthwhile follow-ups

### 2.1 Wait states stop looking like hangs

*(merges: queue/retry frozen ring, aggregate batch progress, Director anonymous spinner)*

**Files:** `components/canvas/streaming-grid.tsx:47-53`, `components/sidebar/settings-sidebar.tsx:50-53`, `components/canvas/director-modal.tsx:47-51`, `lib/store.ts`

**Before:** Between click and first event every tile shows a `0/28` ring frozen over a shimmer — and with retry on 429/5xx at 2s base delay it can sit there for tens of seconds, identical to a dead request. At nSamples=8 you get eight independent rings and no answer to "how far along is the batch". Director shows a bare `Loader2` with no text, so a 30s+ 4× upscale and a fast line-art look identical, and the modal is undismissable throughout.

**After:** Every wait says what it is and roughly how long it's been.

**Implementation:**
- Branch `StreamTile` on `status === "initializing"`: indeterminate rotating arc, mono "Queued" label, elapsed mm:ss from a `runStartedAt` timestamp; after ~15s swap copy to "Still waiting — NovelAI may be busy". (Cancel is already covered by 1.2.)
- Replace the static "Generating…" sidebar label with `Generating 3/8 · 62%` from the mean of `streamingBatch` progress; add the same summary line above the streaming grid.
- Add `directorKind: DirectorKind | null` alongside `isDirectorProcessing`; label the overlay ("Upscaling 4×…") and add an elapsed timer for upscale/enhance. Render Director errors inline in the modal (it stays open on failure and currently shows no trace) — `lastError` from 0.3 covers this.

### 2.2 Modal and Lightbox get exits

**Files:** `components/ui/modal.tsx:42`, `components/canvas/lightbox.tsx:40`

**Before:** Both animate in (`fadeIn 150ms` / `fadeUp 180ms`) and then `return null` — unmounting in a single frame. The Lightbox is worst: a full-screen `bg-black/90` blinks out to a bright canvas, which reads as a crash rather than a dismissal.

**After:** Symmetric arrival and departure.

**Implementation:** Keep the portal mounted while `open` toggles a `data-state` attribute; use `transition-behavior: allow-discrete` + `@starting-style` so one rule handles both directions. Or, staying in React, a `useDelayedUnmount(open, 180)` hook in `lib/`. Exits are faster and use `--ease-in`: backdrop opacity over `duration-fast`; modal panel opacity + `translateY(6px)`; lightbox opacity + `scale(0.98)` so the image recedes into the canvas.

### 2.3 Modal + Lightbox focus management

**Files:** `components/ui/modal.tsx:28-58`, `components/canvas/lightbox.tsx:28-44`

**Before:** `Modal` sets `role="dialog" aria-modal="true"` but does nothing about focus: the first Tab moves into the sidebar *behind* the overlay, and on close focus drops to `<body>` so the next Tab restarts from the top of the document. During the mandatory first-run connect flow, the user is operating controls they cannot see behind a `backdrop-blur` scrim. The Lightbox is worse — a fullscreen overlay with **no** dialog role at all, and `alt=""` so nothing is announced when it opens.

**After:** Overlays behave like temporary detours.

**Implementation:** Write one focus-trap/restore helper (neither component has one today — do not assume it exists). In `Modal`'s existing effect: capture `document.activeElement`, focus the container (`tabIndex={-1}`), cycle Tab/Shift+Tab within, restore on cleanup. Add `aria-labelledby` → the `<h2>` (give `connect-modal.tsx:50`'s heading an id) and `aria-describedby` → the description `<p>`. For the Lightbox: same helper, plus `role="dialog" aria-modal="true" aria-label={\`Image ${focusedIndex+1} of ${batch.length}, seed ${img.seed}\`}`, and bind `+`/`-`/`0` to the existing zoom setters (zoom is currently pointer-only). **Skip** the body-scroll-lock clause — `studio.tsx:26` is `h-screen overflow-hidden`, the document never scrolls.

### 2.4 Reuse becomes visible

**Files:** `components/gallery/gallery-panel.tsx:71-92`, `components/canvas/lightbox.tsx:49-62`, `components/canvas/canvas.tsx:174`

**Before:** Full settings snapshots are persisted per image, but recovering them is a three-gesture path ending at an unlabelled 17px `RotateCcw` glyph in a row of five identical icons. The Lightbox offers zoom/download/close and nothing else. Most users won't know reuse exists.

**After:** The payoff of storing snapshots is discoverable where you actually look at images.

**Implementation:** (1) On gallery thumbnail hover/focus, reveal a bottom overlay bar: `RotateCcw` "Use settings" → `restoreSettings(g.settings)`, `Hash` "Copy seed" → `patchSettings({seed})`. (2) Same `RotateCcw` in the lightbox header next to Download. (3) In the canvas toolbar, promote reuse from bare icon to a labelled `secondary` button reading "Reuse settings", matching the weight the Director button already gets at canvas.tsx:167-173.

### 2.5 Gallery tiles read as controls and carry identity

*(merges: dead `group` class, no metadata, indistinguishable batches)*

**Files:** `components/gallery/gallery-panel.tsx:62-96`

**Before:** Tiles declare `group` and nothing consumes it — a repo-wide grep for `group-hover:` returns zero. The only hover feedback is a 1px border shift, imperceptible at ~125px. No prompt, seed, model, or timestamp anywhere, and `aspect-square object-cover` hides the real ratio, so a dozen same-prompt batches are visually identical.

**After:** Recognition instead of linear search.

**Implementation:** Replace `transition-all` with `transition-[border-color,box-shadow] duration-fast`; add `transition-transform duration-base ease-standard group-hover:scale-[1.06] group-active:scale-[1.02]` to the inner `<img>` (line 81 — the wrapper already has `overflow-hidden`, so no layout cost). Add `title={g.settings.prompt}` for a native tooltip, and a hover scrim with mono `seed · W×H` plus a relative timestamp — at 125px the mono line carries the recognition value, not the prompt. Derive the tile aspect from `settings.width/height` rather than hardcoding a ratio (the default is 832×1216 = 2:3, and it's user-configurable). Sequence the search input last, if at all.

### 2.6 Gallery distinguishes loading, empty, and broken

**Files:** `lib/store.ts:165-173`, `components/gallery/gallery-panel.tsx:35,62-66`

**Before:** `loadGallery()` swallows IDB errors into `console.error` and leaves `images: []`, so first-paint loading, genuinely empty, and IDB-unavailable all render the same cheerful "Your generations will appear here." A returning user whose storage failed is told they've never generated anything.

**After:** No false claims of emptiness.

**Implementation:** Add `galleryStatus: 'loading' | 'ready' | 'error'` around `loadImages()` (one caller, store.ts:358). Loading → a 6-tile skeleton grid reusing the shimmer at `streaming-grid.tsx:38-45`. Error → "Couldn't open local gallery storage" + message + Retry calling `loadGallery()`. Hide the count badge (`gallery-panel.tsx:35` — note `studio.tsx:61` already guards on `> 0`) while status ≠ ready.

### 2.7 Single delete becomes undoable

**Files:** `components/canvas/canvas.tsx:185-187`, `lib/store.ts:180-191`, `components/gallery/gallery-panel.tsx:43-44`

**Before:** The Trash2 button deletes from IndexedDB instantly and re-points selection to `batch[0]`, so a misclick both destroys an unreproducible image and moves your view — while **Clear all** does ask, via a native `confirm()` that breaks the visual surface.

**After:** Fast path stays fast; mistakes are recoverable.

**Implementation:** Keep the deleted record in memory, remove from `images` optimistically, and fire `toast('Image deleted', { action: { label: 'Undo', onClick: … } })` (sonner already ships). Run the real `dbDelete` only after the toast expires. Replace the gallery's native `confirm()` with the app's own `Modal`.

### 2.8 Sidebar hierarchy and density

*(merges: inverted section/field contrast, section chrome cost, duplicated "Prompt" label)*

**Files:** `components/sidebar/field.tsx:38-40`, `components/ui/label.tsx:5`, `components/sidebar/basic-tab.tsx:40-58,96-138`

**Before:** Section titles are `text-[11px] text-muted` — the smallest text in the sidebar, in the same color role as hint copy — while the Field labels *inside* them are `text-[13px] font-semibold text-fg-2`. So "Prompt" (the group) is quieter than "Prompt" (the field it contains), which appears three pixels smaller and 40px above the identical word. Seed — the every-iteration control — is the last field of the fourth section, off-screen on a laptop.

**After:** Groups read first; the most-touched knobs sit highest.

**Implementation:** Section titles → `text-[12px] font-bold uppercase tracking-[0.08em] text-fg-2`; Field labels → `text-[12px] font-medium text-fg-2` (not `text-muted` — that collides with hint color). Delete the redundant `label="Prompt"` at basic-tab.tsx:51. Unwrap the single-Select `Section title="Model"` (lines 40-48) into a full-width row under the tab bar. Section padding `px-4 py-3`, header `mb-2`. Reorder Sampling to Seed → Batch size → Steps → Sampler. **Skip** "make Quality collapsible" — `Section` has no collapse API and that's new surface.

### 2.9 Hints and ranges on the controls nobody can infer

**Files:** `components/sidebar/advanced-tab.tsx:18-44`, `components/sidebar/basic-tab.tsx`, `components/sidebar/reference-uploader.tsx:75-83`, `components/ui/slider.tsx`

**Before:** `Field` has a `hint` prop used in exactly **zero** places. "Prompt guidance (CFG)" is a bare slider; "Noise schedule", "Dynamic thresholding", "Auto SMEA", "Info extracted" have no explanation at all. Sliders never show min/max, so "Steps 28" gives no sense of whether 28 is low or high.

**After:** A novice can form a judgement without leaving the app.

**Implementation:** Populate `hint` with one consequence-framed line each — CFG: "Higher = follows the prompt more literally, less creative. 4–7 typical."; Steps: "More steps = finer detail, slower. 23–28 typical."; Info extracted: "How much of the reference's content to pull in." In `Slider`, render min/max as tiny muted mono endpoints under the track. Apply selectively — a hint under *every* control adds real bulk to an already-scrolling 360px column. Drop the "recommended range accent tick" (under-specified).

### 2.10 Segmented: sliding pill, correct roles, arrow keys

*(merges the teleporting pill and the tablist-semantics findings)*

**Files:** `components/ui/segmented.tsx`, `components/sidebar/settings-sidebar.tsx:35-41`, `components/sidebar/basic-tab.tsx:72,78`

**Before:** The active pill blinks out of one segment and into another with no travel. The body below hard-swaps a 360px column of controls in one frame. And the component hardcodes `role="tablist"`/`role="tab"` — correct for the tab strip, wrong for the Aspect and Size-tier rows, where a screen reader announces "Portrait, tab, 1 of 3" for a resolution preset. Six dead tab stops, no arrow-key operation.

**After:** A sliding indicator the eye can follow, and roles that match reality.

**Implementation:** Absolutely-position a single pill inside the container, `transition-[left] duration-fast ease-standard`. **Watch the math** — the container has `p-1` and `gap-1` (line 20), so naive `left: index * (100/n)%` drifts across three segments; drop the gap or measure via `offsetLeft`/`offsetWidth`. Wrap tab content in a keyed div with `animation: fadeIn var(--duration-fast) var(--ease-out)` keyed on `activeTab` — plain opacity, no slide (peer panels, not a sequence). Add `mode?: "tabs" | "radio"`: radio → `role="radiogroup"` + `role="radio" aria-checked`, tabs → keep tablist plus `id`/`aria-controls` linking to a panel div with `role="tabpanel"`. Roving tabindex + Arrow/Home/End in both modes. Switch the two Resolution instances to `radio`.

### 2.11 Slider label association + `aria-valuetext`

**Files:** `components/ui/slider.tsx:31-49`, `components/sidebar/field.tsx:20`

**Before:** The range input has no `id`, `aria-label`, `aria-labelledby`, or `aria-valuetext`, and four call sites wrap it in `<Field label>` with no `htmlFor`, producing an orphan `<label>`. Every slider announces as an unnamed "slider, 28"; the formatted readout ("3 images", "0.60") is visible but never spoken.

**After:** Named sliders that speak their formatted value.

**Implementation:** `useId()`, render the label as a real `<label htmlFor>`, pass `aria-valuetext={format ? format(value) : String(value)}`. Let `Slider` own its label and drop the redundant `Field label` at basic-tab.tsx:98,101 and advanced-tab.tsx:19,22.

### 2.12 Custom resolution has a state

**Files:** `components/sidebar/basic-tab.tsx:70-94`, `lib/nai/models.ts:82-87,112-117`

**Before:** Type any non-preset W×H and `tierAspectForSize` returns `[null, null]`, so both Segmented rows render with **zero** active segments — a dead state that reads as a rendering bug. There's also no cue that you just jumped to a 4×-more-expensive size. Related: `setPreset` falls back to `presetDims(t, "portrait")` because Wallpaper has no Square preset, so with Square active, clicking Wallpaper silently changes your aspect.

**After:** The control always has an active state and shows what it costs.

**Implementation:** Append a `Custom` segment, auto-selected when no preset matches, switching back to the last preset on re-click. Add a mono line under the W×H row: `1.0 MP · 2:3`, live. Fix the Wallpaper/Square fallback so it doesn't silently change the aspect.

---

## Tier 3 — Nice to have

| # | Item | Files | Change |
|---|---|---|---|
| 3.1 | **Accent stops being spent five ways** | `components/ui/segmented.tsx:37`, `components/canvas/canvas.tsx:172`, `components/gallery/gallery-panel.tsx:88` | Four solid accent fills stack in the sidebar (tab strip + two Resolution rows + Generate), so accent stops encoding "this is the action". Give Segmented a low-emphasis selected state — `bg-surface text-fg shadow-[var(--shadow-card)]` with a 1px `--ring-accent` (both tokens exist and are unused). Drop `text-accent` from the Director icon; `processedWith` badge → `bg-surface-2 text-fg-2`. |
| 3.2 | **Accent swatch row** | `components/theme-controls.tsx:48-62` | Five always-visible 16×16 buttons with 4px gaps — below the WCAG 2.2 24px floor, the most saturated pixels on screen, sitting beside the *one* dot that carries meaning (connection status). Their oklch literals are copies of the **dark** accents, so in light mode every swatch previews the wrong color. Collapse to one current-accent swatch that expands on click; source fills from the live token via a scoped `[data-accent]` wrapper or `--accent-swatch-*` vars; wrap in `role="radiogroup"` with human color names. Note: the "systemic 28px target" framing in the source findings was wrong — everything else is 32px; only `gallery-panel.tsx:46,55` are 28px. |
| 3.3 | **Panel shadows use tokens** | `components/studio.tsx:41,49`, `components/sidebar/settings-sidebar.tsx:44`, `components/site-header.tsx:12` | Three hardcoded `rgba(0,0,0,0.6–0.7)` edges in a light palette that's otherwise slate-tinted. Define `--shadow-panel-l/r/t` per theme alongside the (currently unconsumed) `--shadow-panel` and swap all three. Delete the header's `shadow-[0_1px_0_0_var(--border-soft)]` — it duplicates an existing `border-b`. |
| 3.4 | **Switch thumb** | `components/ui/switch.tsx:30` | `bg-white` on a `bg-surface-3` track that's `oklch(0.955)` in light mode — a ~4.5% delta separated only by Tailwind's default shadow, so the off state is nearly flat. → `bg-surface border border-border-soft shadow-[var(--shadow-card)]`. |
| 3.5 | **Ambient backdrop fades with its foreground** | `components/canvas/canvas.tsx:106-112` | The blurred backdrop hard-cuts while the foreground image runs `fadeIn 240ms` — two layers of the same picture on different schedules, on every thumbnail click. Add the same `fadeIn 240ms ease-out` to the backdrop img. (Do **not** add the proposed `settleIn` re-blur to the stage image — streaming tiles already resolve to sharp before handoff, so it would move backwards.) |
| 3.6 | **Gallery arrival motion** | `components/gallery/gallery-panel.tsx:70-93` | New batches prepend with no acknowledgement at the app's reward moment. Add a `popIn` keyframe with an index-based stagger capped at ~6 tiles. Skip the proposed "ring flash" — the newest batch is already auto-selected with `border-accent ring-2 ring-accent`. Guard against firing on initial IDB hydration and panel remounts. |
| 3.7 | **Generate button press + progress fill** | `components/ui/button.tsx:6,10` | The only press feedback in the entire app is `active:brightness-[0.97]` — a 3% dip, near-invisible on the accent fill. Add `active:scale-[0.985]` and `transform` to the transition list. While generating, drop `disabled:opacity-50` and fill the accent background to `avg(progress)` via a gradient stop. **Caveat:** dropping `disabled` also drops `disabled:pointer-events-none` — add an explicit `if (isGenerating) return` guard. |
| 3.8 | **Character tab disables itself on non-V4 models** | `components/sidebar/characters-tab.tsx:19-27`, `lib/nai/types.ts:92-99` | `supported` is computed but used only for a static warning; every control stays live, and `buildMetadata` ships character data the API discards. Wrap the list in `opacity-50 pointer-events-none aria-disabled`, make the banner actionable ("Multi-character prompts need a V4 or V4.5 model" + inline button patching `model` to `Model.V4_5`), and add an `isV4Model` guard in `buildMetadata`. |
| 3.9 | **Delete the fake drag handle** | `components/sidebar/characters-tab.tsx:34` | `GripVertical` with no pointer handler, no drag state, and no `moveCharacter` action anywhere. Replace with an accent-tinted index chip. Do not build a drag system for this pass. |
| 3.10 | **Co-locate undesired-content controls** | `components/sidebar/basic-tab.tsx:59,150` | The UC textarea and the UC *preset* that prepends a different negative set sit two sections apart, with nothing saying they combine. Move the preset Select above the textarea as a compact inline row and add hint: "Added on top of the {preset} preset." |
| 3.11 | **Screen-reader progress announcements** | `components/studio.tsx`, `components/ui/progress-ring.tsx:22,38` | Zero `aria-live` regions exist in the app; a non-sighted user gets one label change then up to 30s of silence ending in nothing. Add a visually-hidden `<div role="status" aria-live="polite" aria-atomic>` in `Studio`: "Generating 4 images…" → "Step 12 of 28" (throttled ~1 per 5 steps, driven by max across `streamingBatch`) → "4 images ready". Add `aria-busy={isGenerating}` to the canvas `<section>` and `role="progressbar"` + values to `ProgressRing`. Skip the "check the Toaster" clause — sonner already renders its own polite region. |
| 3.12 | **Radius + type token adoption** | `app/globals.css`, `components/ui/button.tsx:17-21`, all | Six radius tokens generate `rounded-chip`/`rounded-input`/`rounded-card` utilities that **zero** components use; instead 27 arbitrary `rounded-[var(--radius-*)]` plus 25 raw pixel radii, and `Button` invents five radii across five sizes. Likewise 15 distinct font sizes including 11.5/12.5/13.5px, and four different dialog title sizes (19/20/21/22/24). Map every value to the nearest token; `Button` uses exactly two (`rounded-button`, `rounded-chip` for icon-sm). Add a six-step type scale and delete all half-pixel values; raise both `text-[9px]` badges (`studio.tsx:62`, `gallery-panel.tsx:88`) to 11px. **This is enabling hygiene, not a felt improvement** — visually the app will look near-identical afterward. Its value is that the token layer becomes load-bearing. |
| 3.13 | **PositionGrid keyboard access** | `components/sidebar/position-grid.tsx:25` | A `<div>` with only `onPointerDown`/`onPointerMove` — no tabIndex, role, aria, or keys, and the coordinates are rounded to 0.01 but never displayed, so even pointer users can't record a placement. Prefer **paired x/y sliders** over `role="application"` (which suppresses browse mode). Arrow = 0.05, Shift = 0.01, Home/End to edges, `focus-visible` ring, mono x/y readout under the grid. |

---

## Deliberately not doing

- **The Lightwall / gallery-native redesign** (`docs/ux-panel-spec.md`) — treated only as evidence of design intent (accent as the single load-bearing color, mono for all numerics, a motion vocabulary), all of which this plan honors inside the existing three-column shell.
- **Threading an `AbortSignal` into `NaiClient.generate`** — nekoai-js's AbortControllers are internal and timeout-only; its own types state long-running streams are not aborted mid-generation. Cancellation is done by breaking the `for await` loop (0.3).
- **Character reordering (drag-and-drop)** — the affordance is being deleted (3.9), not built. A reorder system is a feature, not polish.
- **A gallery search input** — filtering an in-memory array is technically in scope, but it's the feature-adjacent tail of 2.5; ship the free retrieval cues (tooltip, date dividers, honest aspect, metadata scrim) first and reassess.
- **A collapsible `Section` API** — `Section` has no collapse state today; adding disclosure plus persistence is new surface, not tightening.
- **Making the whole Sampling panel non-interactive during a run** — that's a policy decision about mid-run edits, separate from the progress-caption desync it was bundled with (the store already snapshots `settings` in `generate()`'s closure, so progress math is already correct; only `streaming-grid.tsx:16`'s live `s.settings.steps` denominator needs stamping onto the tile).
- **Body scroll locks in the Lightbox** — `studio.tsx:26` is `h-screen overflow-hidden`; the document never scrolls.
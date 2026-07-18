---
name: verify
description: Build, launch, and drive the NyaNovel Next.js studio UI to observe a change at runtime.
---

# Verifying NyaNovel

Next.js 16 (Turbopack) + Bun + Tailwind v4, all client components. Single route `/`.

## Handle

A dev server is usually **already running** on `http://localhost:3000` — check before starting one,
`bun run dev` refuses with "Another next dev server is already running" and exits 1.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000   # expect 200
bun run build                                                     # production build
```

## Driving it

Playwright browsers are cached in `~/.cache/ms-playwright`, but the `playwright` package is **not**
a project dependency — install it into a scratch dir and run the script from there:

```bash
cd "$SCRATCH" && bun add playwright && node drive.mjs
```

### Getting past the connect wall

First paint shows a **non-dismissible** connect modal (`dismissible={connected}` — Escape and
backdrop clicks are both dead). Seed localStorage and reload:

```js
await page.evaluate(() => {
  localStorage.setItem('nya-token', 'pst-fake');
  localStorage.setItem('nya-host', 'https://image.novelai.net');
});
await page.reload({ waitUntil: 'networkidle' });
```

An **invalid token still reaches the real API** and returns 401 in ~1-2s. That's the cheapest way to
exercise the failure path (error card, retry, Stop button) without credentials. `isGenerating` is
only true for about a second, so poll rather than sampling once.

Note `suggestTags` is **unauthenticated** — it returns real Danbooru results with a garbage token.
Never use it as a connection check.

### Gotchas

- `page.locator('section')` matches 7 nodes (sidebar `Section`s + sonner's region). The canvas is
  `section[aria-busy]`.
- Tailwind ring utilities render as `box-shadow`. Don't truncate the value when asserting a focus
  ring — the accent ring is the *4th* shadow in the list, past 60 chars.
- Typing in the prompt opens the tag-autocomplete popover, which adds `<li><button>` nodes that
  match broad `aside button` queries.
- Reduced motion: check with `browser.newContext({ reducedMotion: 'reduce' })` and read
  `getComputedStyle(el).animationDuration`. `.motion-keep` elements must keep their real duration;
  everything else collapses to `1e-05s`.

### Flows worth driving

Panel fold (sample `aside` width over ~350ms — it should tween, not jump), collapsed-rail Generate,
slider numeric readouts, seed pin/roll row stability, segmented roles (`tablist` for the tab strip,
`radiogroup` for Aspect/Size), `[` / `]` rail toggles, ⌘↵ generate, tab-order focus rings.

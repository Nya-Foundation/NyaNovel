# NyaNovel

A fast, refined browser client for NovelAI image generation — a modern take on the NovelAI image UI,
built on Next.js and the [`nekoai-js`](https://github.com/Nya-Foundation/NekoAI-JS) SDK. Part of the
latent.moe family.

Everything runs client-side: your NovelAI token stays in your browser and calls NovelAI directly, and
your generations are stored locally in IndexedDB.

## ✨ Features

- **🖼️ Image generation** — full parameter control: model (V4.5 / V4 / V3 / Furry), resolution presets
  + custom size, steps, sampler, guidance (CFG) + rescale, noise schedule, seed lock, batch size,
  quality/UC presets, dynamic thresholding, auto-SMEA.
- **⚡ Live streaming** — watch each sample denoise in place with a per-sample progress ring.
- **👥 Character prompts** — V4/V4.5 multi-character with per-character prompt, undesired content, and a
  draggable position grid.
- **🎨 Vibe transfer & director reference** — multiple reference images with strength / info-extracted.
- **🪄 Director tools** — line art, sketch, background removal, declutter, change emotion, colorize,
  plus upscale & enhance — applied to any result.
- **🏷️ Tag autocomplete** — inline NovelAI tag suggestions with post counts in the prompt fields.
- **🗂️ Local gallery** — batch grouping, lightbox, copy, download, copy-seed, restore-all-settings.
- **🎨 Theming** — dark/light + swappable accent colors, inherited from the latent.moe design system.

## 🚀 Getting started

Requires [Bun](https://bun.sh) and a NovelAI account with API access.

```bash
bun install
bun run dev          # http://localhost:3000
```

On first launch, paste your NovelAI API token (Host defaults to `https://image.novelai.net`).

### Production

```bash
bun run build
bun run start
```

### Docker

```bash
docker compose up --build      # http://localhost:8080
```

## 🧰 Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the dev server |
| `bun run build` | Production build (standalone output) |
| `bun run start` | Serve the production build |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript check |

## 🔒 Privacy

NyaNovel runs entirely in your browser. Your API token is stored only in local browser storage and is
sent only to the NovelAI API — never to us.

## 🛠️ Stack

Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript · Zustand · `nekoai-js` · Bun.

## 📝 Legal

Provided strictly for research purposes. Users are solely responsible for complying with NovelAI's
Terms of Service and all applicable laws. The creators disclaim all liability for misuse.

## 📄 License

`nekoai-js` is AGPL-3.0. See [LICENSE](LICENSE).

---

<p align="center">Made with ♥ by the Nya Foundation</p>

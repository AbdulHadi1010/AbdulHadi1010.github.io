# abdulhadi1010.github.io/portfolio

Personal site of Abdul Hadi: cloud, DevOps and AI infrastructure engineer.

**Live:** https://abdulhadi1010.github.io/portfolio/

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | [Astro 5](https://astro.build) | Static HTML. Only the hero, terminal and pod animation ship JavaScript. |
| Styling | Tailwind CSS v4 | Colour tokens live in `src/styles/global.css` as CSS variables, light and dark. |
| Hero | Hand-written WebGL2 shader, no three.js | ASCII globe with real coastlines, about 6 KB of code. |
| Motion | Lenis, IntersectionObserver, CSS | Smooth scroll, reveal on scroll, text scramble. All off with `prefers-reduced-motion`. |
| Brand | Sazeb Tech palette (mint #E2F3F0, navy #00405A, orange #FC9412) and Poppins | Matches the company banners. Self-hosted through Fontsource; JetBrains Mono only for terminal and diagrams. |
| Hosting | GitHub Pages via GitHub Actions | Free. Every push to `main` type-checks, builds, checks page weight and deploys. |

## How the ASCII globe works

`src/scripts/ascii-globe.ts`

1. A glyph atlas is drawn once on a 2D canvas: `" .·:-=+*≡#%@"`, light to dense.
2. A full-screen fragment shader splits the canvas into character cells.
3. For each cell it ray-traces a sphere, rotates it, and looks up land vs ocean in a
   192×96 bitmask of the world (`src/data/landmask.ts`, built from Natural Earth 110m
   land by `scripts/build-landmask.mjs`).
4. Lighting, a lat/long mesh, pulsing nodes and packets on meridians give each cell a
   brightness. That brightness picks the glyph; the shader samples it from the atlas.
5. The pointer adds a ripple. Rendering pauses when the hero is off screen or the tab
   is hidden. With reduced motion it draws one still frame.

The atlas-plus-shader approach was learned by statically analysing Speakeasy's
production bundle with [REA](https://github.com/morluto/rea) (their
`font-texture`, `site-ascii-environment` and `cert-ascii-loop` modules). The pod
rollout animation copies the pattern from `cert-ascii-loop`: a `<pre>` updated at
~30 fps, paused off screen, skipped for reduced motion. No code was copied.

## Edit the content

Everything you read on the site is in `src/data/profile.ts`: intro, stats, projects,
deploy log, toolbox and writing.

## Run locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + static build into dist/
```

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes to
GitHub Pages. In the repository settings, Pages → Source must be **GitHub Actions**.

To serve from `https://abdulhadi1010.github.io/` (no `/portfolio`), rename the repo to
`AbdulHadi1010.github.io`. The workflow picks up the new base path by itself.

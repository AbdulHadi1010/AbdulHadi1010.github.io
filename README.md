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

## SEO and AI visibility

What the site does:

- **Title / H1 / About** lead with "Abdul Hadi" plus role, employer and certifications, in plain factual sentences that search snippets and AI answers can quote.
- **Structured data** (`src/data/seo.ts`): one JSON-LD graph with `WebSite`, `ProfilePage`, `Person` (job, employer, education, CKA/AWS/Azure credentials, skills, `sameAs` LinkedIn/GitHub/Medium/YouTube), the *Secure but Broken?* paper (DOI), GitHub projects and Medium posts, all linked to the same person.
- **`/llms.txt`**: plain-text profile for AI assistants, generated from the same data.
- **`/robots.txt`**: explicitly allows Googlebot, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and others; points to the sitemap (with `lastmod`).
- **Crawlers skip the agent intro**, so the rendered DOM they index is the finished page.
- `rel="me"` links to LinkedIn and GitHub; Open Graph `profile` tags; 404 is `noindex`.

Lighthouse (production build, local): desktop 98 / 100 / 100 / 100, mobile 72 / 100 / 100 / 100 (performance / accessibility / best practices / SEO).

After publishing, these steps are yours (they need your accounts):

1. **Google Search Console**: add the site URL, verify (HTML tag or DNS), submit `sitemap-index.xml`, then "Request indexing" for the homepage.
2. **Bing Webmaster Tools**: import from Search Console. Bing's index feeds ChatGPT search and Copilot.
3. **Link back to the site** from LinkedIn (Contact info → Website, and a Featured link), your GitHub profile "Website" field, Medium bio and YouTube "About". Consistent links from profiles Google already trusts are what tie the name to this page.
4. Optional: a custom domain (e.g. `abdulhadi.dev`) and a real headshot to replace the GitHub avatar used in the structured data.

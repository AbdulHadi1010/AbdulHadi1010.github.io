import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Served on the custom domain via GitHub Pages (override with SITE / BASE env vars)
const site = process.env.SITE ?? "https://abdul-hadi.me";
const base = process.env.BASE ?? "/";

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [
    sitemap({
      // lastmod tells crawlers when to come back
      serialize: (item) => ({ ...item, lastmod: new Date().toISOString(), changefreq: "monthly", priority: 1.0 }),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  build: { inlineStylesheets: "auto" },
});

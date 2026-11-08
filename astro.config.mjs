import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages: https://<user>.github.io/<repo>/  (override with SITE / BASE env vars)
const site = process.env.SITE ?? "https://abdulhadi1010.github.io";
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

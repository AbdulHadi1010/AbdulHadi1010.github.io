import type { APIRoute } from "astro";

// Search engines and AI assistants are explicitly welcome: being cited is the point.
const agents = [
  "Googlebot", "Google-Extended", "Bingbot", "DuckDuckBot", "Applebot", "Applebot-Extended",
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot",
  "PerplexityBot", "Perplexity-User", "CCBot", "Meta-ExternalAgent",
];

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const sitemap = new URL(`${base}/sitemap-index.xml`, site);
  const body = [
    ...agents.flatMap((a) => [`User-agent: ${a}`, "Allow: /", ""]),
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${sitemap.href}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};

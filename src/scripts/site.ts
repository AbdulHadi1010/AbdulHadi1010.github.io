import Lenis from "lenis";
import { initEmail } from "./email";
import { runAgentBuild } from "./agent-build";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const GLYPHS = "-=+*#%/\\<>_.:01";

// ── text scramble: resolves left to right through random glyphs ──────────────
export function scramble(el: HTMLElement, to = el.dataset.text ?? el.textContent ?? "", ms = 600) {
  if (reduced) { el.textContent = to; return; }
  const from = el.textContent ?? "";
  const len = Math.max(from.length, to.length);
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / ms);
    let out = "";
    for (let i = 0; i < len; i++) {
      const settle = i / len;
      if (p >= settle + 0.15 || to[i] === " ") out += to[i] ?? "";
      else if (p >= settle) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      else out += from[i] ?? "";
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = to;
  };
  requestAnimationFrame(tick);
}

// ── smooth scroll ────────────────────────────────────────────────────────────
function initScroll(): Lenis | null {
  if (reduced) return null;
  const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9 });
  const raf = (t: number) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"], a[href*="/#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.hash;
      const target = id && document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -72, duration: 1.1 });
      history.replaceState(null, "", id);
    });
  });
  return lenis;
}

// ── reveal on scroll ─────────────────────────────────────────────────────────
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (reduced) { els.forEach((el) => el.classList.add("is-in")); return; }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        if (el.hasAttribute("data-held")) continue; // an agent will drop this one in
        el.classList.add("is-in");
        el.querySelectorAll<HTMLElement>("[data-scramble-in]").forEach((s) => scramble(s));
        io.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

// ── hover scramble on links / labels ─────────────────────────────────────────
function initHoverScramble() {
  document.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el) => {
    const text = el.textContent ?? "";
    el.dataset.text = text;
    el.addEventListener("pointerenter", () => scramble(el, text, 380));
  });
}

// ── rotating word in the headline ────────────────────────────────────────────
function initRotator() {
  const el = document.querySelector<HTMLElement>("[data-rotate]");
  if (!el) return;
  const words = JSON.parse(el.dataset.rotate ?? "[]") as string[];
  if (words.length < 2 || reduced) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    i = (i + 1) % words.length;
    scramble(el, words[i], 700);
  }, 2600);
}

// ── local clock ──────────────────────────────────────────────────────────────
function initClock() {
  const els = document.querySelectorAll<HTMLElement>("[data-clock]");
  if (!els.length) return;
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: els[0].dataset.clock });
  const set = () => els.forEach((el) => (el.textContent = fmt.format(new Date())));
  set();
  setInterval(set, 15_000);
}

// ── theme toggle ─────────────────────────────────────────────────────────────
function initTheme() {
  const btn = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* private mode */ }
  });
}

// ── hero globe (lazy, only when WebGL2 exists) ───────────────────────────────
async function initGlobe() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-ascii-globe]");
  if (!canvas) return;
  const { mountAsciiGlobe } = await import("./ascii-globe");
  try {
    const ok = await mountAsciiGlobe({ canvas, reducedMotion: reduced });
    if (!ok) canvas.remove();
  } catch (err) {
    console.warn("ascii globe disabled:", err);
    canvas.remove();
  }
}

const lenis = initScroll();
runAgentBuild(lenis);
initReveal();
initHoverScramble();
initRotator();
initClock();
initTheme();
initEmail();
initGlobe();

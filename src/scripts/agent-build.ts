// "Agents are building this page" intro + guided tour.
//
// Phase 1: four named cursors drag blueprints of the hero blocks into place.
// Phase 2: agents keep building the rest, one section every ~2s, while the
// visitor scrolls at their own pace. Unbuilt sections take no space, so the page
// ends at a "construction zone" where the agents drag the next blocks in.
//
// Plays once per visit (sessionStorage), only when <html> got the `building`
// class in <head> (skipped for reduced motion and deep links). Skip, Esc or
// a navbar link builds everything at once.

import type Lenis from "lenis";
import { mountFrontierAscii } from "./frontier-ascii";

type Agent = { name: string; color: string; ink: string; el: HTMLElement; x: number; y: number };

const AGENTS = [
  { name: "planner", color: "#00405a", ink: "#ffffff" },
  { name: "infra-agent", color: "#fc9412", ink: "#00405a" },
  { name: "design-agent", color: "#45bfdc", ink: "#00405a" },
  { name: "k8s-agent", color: "#2c3080", ink: "#ffffff" },
];

const CURSOR_SVG = (c: string) =>
  `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 2l15 7.2-6.4 1.9-2.6 6.4z" fill="${c}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

export function runAgentBuild(lenis: Lenis | null) {
  const root = document.documentElement;
  const blocks = [...document.querySelectorAll<HTMLElement>("[data-build]")];
  if (!root.classList.contains("building") || !blocks.length) {
    root.classList.remove("building");
    return;
  }
  root.dataset.agents = "running";
  try { sessionStorage.setItem("built", "1"); } catch { /* private mode */ }

  const byKey = (k: string) => blocks.find((b) => b.dataset.build === k)!;
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  // ── overlay ───────────────────────────────────────────────────────────────
  const layer = document.createElement("div");
  layer.className = "agent-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const status = document.createElement("div");
  status.className = "agent-status";
  status.innerHTML = `<span class="agent-dot"></span><span data-msg>4 agents are building this page…</span><span class="agent-progress"><i data-bar></i></span><button type="button" class="agent-skip">Skip</button>`;
  document.body.appendChild(status);
  const msg = status.querySelector<HTMLElement>("[data-msg]")!;
  const bar = status.querySelector<HTMLElement>("[data-bar]")!;
  const say = (t: string) => { msg.textContent = t; };

  const agents: Agent[] = AGENTS.map((a, i) => {
    const el = document.createElement("div");
    el.className = "agent-cursor";
    el.innerHTML = `${CURSOR_SVG(a.color)}<span class="agent-tag" style="background:${a.color};color:${a.ink}">${a.name}</span>`;
    layer.appendChild(el);
    const start = [
      { x: -40, y: vh() * 0.3 },
      { x: vw() + 40, y: vh() * 0.2 },
      { x: vw() * 0.3, y: vh() + 40 },
      { x: vw() + 40, y: vh() * 0.8 },
    ][i];
    el.style.transform = `translate(${start.x}px, ${start.y}px)`;
    return { ...a, el, ...start };
  });

  // ── stop / finish ─────────────────────────────────────────────────────────
  let done = false;
  const held = new Set<HTMLElement>();
  const pending = new Set<HTMLElement>();
  let frontier: HTMLElement | null = null;
  let sceneStop: (() => void) | null = null;
  const finish = () => {
    if (done) return;
    done = true;
    pending.forEach((el) => el.removeAttribute("data-pending"));
    pending.clear();
    frontier?.remove();
    sceneStop?.();
    blocks.forEach((b) => b.classList.add("is-built"));
    held.forEach((el) => el.removeAttribute("data-held")); // the normal scroll reveal takes over
    held.clear();
    root.classList.add("grid-on");
    layer.classList.add("is-leaving");
    status.classList.add("is-leaving");
    lenis?.resize();
    setTimeout(() => {
      document.querySelectorAll(".rise").forEach((el) => el.classList.remove("rise"));
      root.classList.remove("building", "grid-on", "touring");
      blocks.forEach((b) => b.classList.remove("is-built"));
      layer.remove();
      status.remove();
      // anything already on screen shows at once
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    }, 700);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onNav, true);
  };
  // scrolling is how you follow the build, so it no longer ends it
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
  // a navbar jump to a section that isn't built yet: finish first, then the jump runs
  const onNav = (e: MouseEvent) => {
    const a = (e.target as Element).closest?.('a[href*="#"]');
    if (a && !layer.contains(a)) finish();
  };
  status.querySelector("button")!.addEventListener("click", finish);
  window.addEventListener("keydown", onKey);
  document.addEventListener("click", onNav, true);

  // ── motion helpers ────────────────────────────────────────────────────────
  const EASE = "cubic-bezier(0.45, 0, 0.2, 1)";
  const move = (a: Agent, x: number, y: number, ms: number, ghost?: HTMLElement, gx = 0, gy = 0) => {
    const anims = [a.el.animate([{ transform: `translate(${a.x}px, ${a.y}px)` }, { transform: `translate(${x}px, ${y}px)` }], { duration: Math.max(60, ms), easing: EASE, fill: "forwards" })];
    if (ghost) {
      anims.push(ghost.animate(
        [{ transform: `translate(${a.x - gx}px, ${a.y - gy}px)` }, { transform: `translate(${x - gx}px, ${y - gy}px)` }],
        { duration: Math.max(60, ms), easing: EASE, fill: "forwards" },
      ));
    }
    a.x = x; a.y = y;
    return Promise.all(anims.map((an) => an.finished)).catch(() => {});
  };
  const click = (a: Agent) => a.el.animate([{ scale: 1 }, { scale: 0.82 }, { scale: 1 }], { duration: 90 }).finished.catch(() => {});

  const contentRect = (el: HTMLElement, pad = 8) => {
    const box = el.dataset.build === "nav" ? el.querySelector<HTMLElement>("[data-notch-body]") ?? el : el;
    let r = box.getBoundingClientRect();
    if (el.dataset.build === "copy") {
      const kids = [...el.children].map((c) => c.getBoundingClientRect());
      const l = Math.min(...kids.map((k) => k.left)), t = Math.min(...kids.map((k) => k.top));
      const rr = Math.max(...kids.map((k) => k.right)), bb = Math.max(...kids.map((k) => k.bottom));
      r = new DOMRect(l, t, Math.min(rr - l, 760), bb - t);
    } else if (box === el && el.dataset.build !== "meta" && !el.matches("li, ul, ol, dl, section, div")) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const c = range.getBoundingClientRect();
      if (c.width > 0) r = c;
    }
    return { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
  };

  const globeRect = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const aspect = r.width / r.height;
    let cx: number, cy: number, R: number;
    if (r.width < 768) { cx = 0; cy = -0.78; R = Math.min(0.9, aspect * 1.05); }
    else if (aspect > 1.5) { cx = aspect * 0.5; cy = -0.02; R = 0.8; }
    else { cx = aspect * 0.62; cy = -0.02; R = 0.72; }
    const px = r.left + r.width / 2 + (cx * r.height) / 2;
    const py = r.top + r.height / 2 - (cy * r.height) / 2;
    const pr = (R * r.height) / 2;
    return { x: px - pr, y: py - pr, w: pr * 2, h: pr * 2 };
  };

  // pick up a blueprint somewhere visible, drag it home, drop it
  const drop = async (a: Agent, dest: { x: number; y: number; w: number; h: number }, label: string, reveal: () => void, round = false, quick = false) => {
    if (done) return;
    const W = vw(), H = vh();
    const ghost = document.createElement("div");
    ghost.className = `agent-ghost${round ? " is-round" : ""}`;
    ghost.style.cssText = `width:${dest.w}px;height:${round ? dest.h : Math.min(dest.h, H * 0.55)}px;--c:${a.color}`;
    ghost.innerHTML = `<span class="agent-ghost-label" style="background:${a.color};color:${a.ink}"></span>${round ? "" : "<i></i><i></i><i></i>"}`;
    ghost.querySelector<HTMLElement>(".agent-ghost-label")!.textContent = label;

    const gx = Math.min(28, dest.w * 0.1), gy = Math.min(22, dest.h * 0.2);
    let sx: number, sy: number;
    if (quick) {
      // grab right where the cursor already is
      sx = a.x - gx; sy = a.y - gy;
    } else {
      sx = clamp(dest.x + rand(-0.3, 0.3) * W, 12, Math.max(12, W - Math.min(dest.w, W * 0.7) - 12));
      sy = clamp(dest.y + (dest.y > H / 2 ? -1 : 1) * rand(0.15, 0.28) * H, 70, H - 90);
      await move(a, sx + gx, sy + gy, rand(160, 220));
    }
    if (done) return;
    ghost.style.transform = `translate(${sx}px, ${sy}px)`;
    layer.insertBefore(ghost, layer.firstChild);
    ghost.animate([{ opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 }], { duration: 140, fill: "forwards" });
    await click(a);
    await move(a, dest.x + gx, dest.y + gy, quick ? rand(250, 300) : rand(320, 380), ghost, gx, gy);
    if (done) { ghost.remove(); return; }
    await click(a);
    reveal();
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, fill: "forwards" }).finished.then(() => ghost.remove());
  };

  // every block below the hero stays hidden until an agent places it
  const allReveal = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
  allReveal.forEach((el) => { el.setAttribute("data-held", ""); held.add(el); });
  root.classList.add("touring");

  // place a whole block: it and everything inside it appears, children pop in as a group
  const POP = "li, figure, .viz, dd, dt, h2, h3, h4, p, pre, a.btn-brand, [data-email-href]";
  const reveal = (block: HTMLElement, animate = true) => {
    [block, ...block.querySelectorAll<HTMLElement>("[data-reveal]")].forEach((el) => {
      el.removeAttribute("data-held");
      held.delete(el);
      if (animate) el.classList.add("is-in");
    });
    if (!animate) return;
    [...block.querySelectorAll<HTMLElement>(POP)].slice(0, 48).forEach((el, k) => {
      el.animate(
        [{ opacity: 0, transform: "translateY(10px) scale(0.98)" }, { opacity: 1, transform: "none" }],
        { duration: 300, delay: 60 + k * 16, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "backwards" },
      );
    });
  };

  const blockLabel = (el: HTMLElement, fallback: string) => {
    // cards are named by their title; other blocks by their section heading, else the stop
    const t = (el.matches("li") ? el.querySelector("h3")?.textContent?.trim() : el.querySelector("h2")?.textContent?.trim()) || fallback;
    return `<${t.replace(/[^\w ·&.,-]/g, "").replace(/\s+/g, " ").trim().slice(0, 30) || "Block"} />`;
  };

  // ── build plan: what to un-hide, what to drop, where the frontier sits ────
  const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
  const kids = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
  type Stop = { label: string; show: HTMLElement[]; blocks: HTMLElement[]; anchor: HTMLElement; onArrive?: (a: Agent) => Promise<void> };
  const stops: Stop[] = [];
  const add = (label: string, show: (HTMLElement | null | undefined)[], blocks: (HTMLElement | null | undefined)[], anchor?: HTMLElement | null, onArrive?: Stop["onArrive"]) => {
    const b = blocks.filter(Boolean) as HTMLElement[];
    const sh = show.filter(Boolean) as HTMLElement[];
    if (b.length && sh.length) stops.push({ label, show: sh, blocks: b, anchor: anchor ?? sh[sh.length - 1], onArrive });
  };

  const main = q("#main")!;
  const hero = main.querySelector<HTMLElement>(":scope > section");
  const marquee = main.querySelector<HTMLElement>(":scope > div[aria-label]");
  const statsSec = q("#stats-title")?.closest<HTMLElement>("section");
  const workSec = q("#work");
  const projects = kids("#work > ol > li");
  const more = [...document.querySelectorAll<HTMLElement>("#work h3")].find((h) => h.textContent?.includes("More from"))?.closest<HTMLElement>(".mt-24");
  const tint = q("#stack")?.parentElement;
  const logSec = q("#log");
  const writingSec = q("#writing");
  const contactBand = q("#contact")?.parentElement;
  const footerBand = document.querySelector<HTMLElement>("footer")?.parentElement;

  add("Impact & selected work", [marquee, statsSec, workSec, projects[0]], [
    marquee,
    statsSec?.querySelector<HTMLElement>("dl"),
    q("#work-title")?.closest<HTMLElement>("[data-reveal]"),
    projects[0],
  ], projects[0]);
  projects.slice(1).forEach((li) => add(li.querySelector("h3")?.textContent?.trim() ?? "Project", [li], [li]));
  if (more) add("More from the field", [more], [more.querySelector<HTMLElement>(":scope > [data-reveal]"), ...more.querySelectorAll<HTMLElement>(":scope > .mb-12")]);
  const parts = (sec: HTMLElement | null) =>
    sec ? ([...sec.children].flatMap((c) => (c.matches(".grid") && sec.id === "log" ? [...c.children] : [c])) as HTMLElement[]) : [];
  add("Toolchain", [tint], parts(q("#stack")));
  add("Deploy log", [logSec], parts(logSec));
  add("Writing", [writingSec], parts(writingSec));
  const contact = q("#contact");
  const cgrid = contact?.querySelector<HTMLElement>(":scope > .grid");
  add("Contact", [contactBand, footerBand], [contact?.querySelector<HTMLElement>(":scope > [data-reveal]"), ...((cgrid ? [...cgrid.children] : []) as HTMLElement[])], contactBand, async (a) => {
    const btn = q<HTMLButtonElement>('[data-term-cmd="whoami"]');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    if (r.top > vh() || r.bottom < 0) return;
    await move(a, r.left + r.width / 2, r.top + r.height / 2, 300);
    if (done) return;
    await click(a);
    btn.click();
  });

  // hide everything that isn't built yet, so the page ends at the frontier
  const hide = (el: HTMLElement | null | undefined) => { if (el && el !== hero) { el.setAttribute("data-pending", ""); pending.add(el); } };
  stops.forEach((st) => st.show.forEach(hide));
  const unhide = (el: HTMLElement) => { el.removeAttribute("data-pending"); pending.delete(el); };

  // the construction zone that sits right after the last built block
  frontier = document.createElement("div");
  frontier.className = "agent-frontier";
  frontier.setAttribute("aria-hidden", "true");
  frontier.innerHTML = `<div class="agent-frontier-inner"><span class="agent-dot"></span><span data-next>Agents are building the next section…</span></div><pre class="frontier-ascii"></pre>`;
  const nextLabel = frontier.querySelector<HTMLElement>("[data-next]")!;
  const placeFrontier = (after: HTMLElement, next?: string) => {
    after.after(frontier!);
    nextLabel.textContent = next ? `Next up: ${next}` : "Agents are building the next section…";
    lenis?.resize();
  };
  if (hero) placeFrontier(hero, stops[0]?.label);
  sceneStop = mountFrontierAscii(frontier.querySelector<HTMLElement>(".frontier-ascii")!).stop;

  const inView = (el: Element | null, margin = 0) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top < vh() - margin && r.bottom > margin;
  };

  // agents hang around the frontier when it's on screen, otherwise wait below the fold
  let parking = false;
  const park = async () => {
    if (parking || done || !frontier) return;
    parking = true;
    const f = frontier.getBoundingClientRect();
    const visible = f.top < vh() - 40 && f.bottom > 0;
    await Promise.all(agents.map((a, k) => {
      // wait at the left and right edges so the ASCII scene stays visible
      const left = k < 2;
      const x = visible ? clamp(left ? f.left + 24 : f.right - 150, 20, vw() - 140) : vw() * (0.2 + k * 0.2);
      const y = visible ? clamp(f.top + 70 + (k % 2) * 90, 70, vh() - 110) : vh() + 50;
      return move(a, x, y, 500);
    }));
    parking = false;
  };
  let parkTimer = 0;
  const onScroll = () => { clearTimeout(parkTimer); parkTimer = window.setTimeout(park, 140); };
  window.addEventListener("scroll", onScroll, { passive: true });

  const PACE = 2200; // ms between sections: fast enough to stay ahead, slow enough to watch
  const build = async () => {
    const total = stops.length;
    for (let i = 0; i < total && !done; i++) {
      const stop = stops[i];
      const started = performance.now();
      say(`Building ${stop.label} · ${i + 1}/${total} · scroll to follow`);
      bar.style.width = `${((i + 1) / total) * 100}%`;

      const wasVisible = inView(frontier, 40);
      stop.show.forEach(unhide);
      placeFrontier(stop.anchor, stops[i + 1]?.label);
      await sleep(30); // let layout settle

      // blocks the visitor can see are dragged in; the rest reveal as they scroll to them
      const onScreen = stop.blocks.filter((b) => inView(b, 60));
      stop.blocks.filter((b) => !onScreen.includes(b)).forEach((b) => reveal(b, false));
      if (wasVisible && onScreen.length) {
        const queue = [...onScreen];
        await Promise.all(agents.map(async (a, k) => {
          await sleep(k * 40);
          for (let b = queue.shift(); b && !done; b = queue.shift()) {
            const r = contentRect(b, 6);
            const box = { ...r, h: Math.min(r.h, vh() - Math.max(r.y, 70) - 40) };
            await drop(a, box, blockLabel(b, stop.label), () => reveal(b), false, true);
          }
        }));
        if (stop.onArrive && !done) await stop.onArrive(agents[0]);
      } else {
        onScreen.forEach((b) => reveal(b));
      }
      if (done) return;
      void park();
      await sleep(Math.max(0, PACE - (performance.now() - started)));
    }
  };

  // ── hero ──────────────────────────────────────────────────────────────────
  const heroJob = (a: number, key: string, round = false) => {
    const el = byKey(key);
    return drop(agents[a], round ? globeRect(el) : contentRect(el), el.dataset.buildName ?? key, () => el.classList.add("is-built"), round);
  };
  const queues: (() => Promise<void>)[][] = [
    [() => heroJob(0, "copy")],
    [() => heroJob(1, "nav")],
    [() => heroJob(2, "meta")],
    [() => heroJob(3, "globe", true)],
  ];

  (async () => {
    await sleep(120);
    root.classList.add("grid-on");
    const t0 = performance.now();
    await Promise.all(queues.map(async (qq, i) => { await sleep(i * 60); for (const j of qq) await j(); }));
    if (done) return;
    blocks.forEach((b) => b.classList.add("is-built"));
    say("Hero shipped · building the rest");
    void park();
    await sleep(900);
    await build();
    if (done) return;
    window.removeEventListener("scroll", onScroll);
    sceneStop?.();
    frontier?.remove();
    lenis?.resize();
    const secs = Math.round((performance.now() - t0) / 1000);
    say(`Site complete · built by 4 agents in ${secs}s`);
    bar.style.width = "100%";
    status.classList.add("is-done");
    await Promise.all(agents.map((a, i) => move(a, i % 2 ? vw() + 60 : -60, a.y + rand(-80, 80), 450)));
    await sleep(1100);
    finish();
  })().catch(finish); // never leave the page half-built
}

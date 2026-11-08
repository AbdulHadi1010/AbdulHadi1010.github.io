// "Agents are building this page" intro + guided tour.
//
// Phase 1: four named cursors drag blueprints of the hero blocks into place.
// Phase 2: the page scrolls itself section by section. At each stop the agents
// drop that section's blocks in, then a cursor reads along while the page
// pauses long enough to read. It ends on the contact section.
//
// Plays once per visit (sessionStorage), only when <html> got the `building`
// class in <head> (skipped for reduced motion and deep links). Any wheel,
// touch, key or the Skip button hands control back immediately.

import type Lenis from "lenis";

type Agent = { name: string; color: string; ink: string; el: HTMLElement; x: number; y: number };
type Stop = { el: HTMLElement; label: string; dwell: number; offset?: number; onArrive?: (a: Agent) => Promise<void> };

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
  const userEvents = ["wheel", "touchstart", "keydown"] as const;
  const onUser = () => finish();
  const finish = () => {
    if (done) return;
    done = true;
    lenis?.stop(); lenis?.start(); // cancel any programmatic scroll in flight
    blocks.forEach((b) => b.classList.add("is-built"));
    held.forEach((el) => { el.removeAttribute("data-held"); el.classList.add("is-in"); });
    root.classList.add("grid-on");
    layer.classList.add("is-leaving");
    status.classList.add("is-leaving");
    setTimeout(() => {
      document.querySelectorAll(".rise").forEach((el) => el.classList.remove("rise"));
      root.classList.remove("building", "grid-on", "touring");
      blocks.forEach((b) => b.classList.remove("is-built"));
      layer.remove();
      status.remove();
    }, 700);
    userEvents.forEach((ev) => window.removeEventListener(ev, onUser));
  };
  status.querySelector("button")!.addEventListener("click", finish);
  userEvents.forEach((ev) => window.addEventListener(ev, onUser, { passive: true }));

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
  const click = (a: Agent) => a.el.animate([{ scale: 1 }, { scale: 0.82 }, { scale: 1 }], { duration: 220 }).finished.catch(() => {});

  const scrollTo = (el: HTMLElement, offset: number, ms: number) =>
    new Promise<void>((resolve) => {
      let settled = false;
      const end = () => { if (!settled) { settled = true; resolve(); } };
      if (!lenis) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(end, ms); return; }
      lenis.scrollTo(el, { offset, duration: ms / 1000, easing: (t: number) => 1 - Math.pow(1 - t, 3), onComplete: end, force: true });
      setTimeout(end, ms + 300);
    });

  const contentRect = (el: HTMLElement, pad = 8) => {
    const box = el.dataset.build === "nav" ? el.querySelector<HTMLElement>("[data-notch-body]") ?? el : el;
    let r = box.getBoundingClientRect();
    if (box === el && el.dataset.build !== "meta" && !el.matches("li, ul, ol, dl, section, div")) {
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
  const drop = async (a: Agent, dest: { x: number; y: number; w: number; h: number }, label: string, reveal: () => void, round = false) => {
    if (done) return;
    const W = vw(), H = vh();
    const ghost = document.createElement("div");
    ghost.className = `agent-ghost${round ? " is-round" : ""}`;
    ghost.style.cssText = `width:${dest.w}px;height:${round ? dest.h : Math.min(dest.h, H * 0.55)}px;--c:${a.color}`;
    ghost.innerHTML = `<span class="agent-ghost-label" style="background:${a.color};color:${a.ink}"></span>${round ? "" : "<i></i><i></i><i></i>"}`;
    ghost.querySelector<HTMLElement>(".agent-ghost-label")!.textContent = label;

    const sx = clamp(dest.x + rand(-0.3, 0.3) * W, 12, Math.max(12, W - Math.min(dest.w, W * 0.7) - 12));
    const sy = clamp(dest.y + (dest.y > H / 2 ? -1 : 1) * rand(0.15, 0.28) * H, 70, H - 90);
    const gx = Math.min(28, dest.w * 0.1), gy = Math.min(22, dest.h * 0.2);

    await move(a, sx + gx, sy + gy, rand(360, 500));
    if (done) return;
    ghost.style.transform = `translate(${sx}px, ${sy}px)`;
    layer.insertBefore(ghost, layer.firstChild);
    ghost.animate([{ opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 }], { duration: 200, fill: "forwards" });
    await click(a);
    await move(a, dest.x + gx, dest.y + gy, rand(560, 720), ghost, gx, gy);
    if (done) { ghost.remove(); return; }
    await click(a);
    reveal();
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, fill: "forwards" }).finished.then(() => ghost.remove());
  };

  // a cursor reads along a block while the visitor reads it
  const read = async (a: Agent, el: HTMLElement, ms: number) => {
    const r = el.getBoundingClientRect();
    const top = clamp(r.top + 20, 80, vh() - 120);
    const bottom = clamp(r.bottom - 30, top + 20, vh() - 100);
    const lines = Math.max(2, Math.round(ms / 1300));
    const left = clamp(r.left + 10, 10, vw() - 40);
    const right = clamp(r.left + Math.min(r.width, 620) - 20, left + 40, vw() - 30);
    await move(a, left, top, 380);
    for (let i = 0; i < lines && !done; i++) {
      const y = top + ((bottom - top) * (i + 0.5)) / lines;
      await move(a, right, y, (ms - 380) / lines - 200);
      if (i < lines - 1 && !done) await move(a, left, y + 8, 200);
    }
  };

  const hold = (els: HTMLElement[]) => els.forEach((el) => { el.setAttribute("data-held", ""); held.add(el); });
  const release = (el: HTMLElement, show: boolean) => {
    el.removeAttribute("data-held");
    held.delete(el);
    if (show) el.classList.add("is-in");
  };

  // ── tour stops ────────────────────────────────────────────────────────────
  const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
  const stops: Stop[] = [];
  const statsSec = q("#stats-title")?.parentElement?.querySelector<HTMLElement>("dl");
  if (statsSec) stops.push({ el: statsSec, label: "Impact numbers", dwell: 2200 });
  document.querySelectorAll<HTMLElement>("#work > ol > li").forEach((li) => {
    stops.push({ el: li, label: li.querySelector("h3")?.textContent?.trim() ?? "Project", dwell: 3200 });
  });
  const more = [...document.querySelectorAll<HTMLElement>("#work h3")].find((h) => h.textContent?.includes("More from"))?.closest<HTMLElement>(".mt-24");
  if (more) stops.push({ el: more, label: "More from the field", dwell: 2600 });
  for (const [id, label, dwell] of [["#stack", "Toolchain", 2800], ["#log", "Deploy log", 3000], ["#writing", "Writing", 2400]] as const) {
    const el = q(id);
    if (el) stops.push({ el, label, dwell });
  }
  const contact = q("#contact");
  if (contact) {
    stops.push({
      el: contact, label: "Contact", dwell: 2600,
      onArrive: async (a) => {
        const btn = q<HTMLButtonElement>('[data-term-cmd="whoami"]');
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        await move(a, r.left + r.width / 2, r.top + r.height / 2, 600);
        if (done) return;
        await click(a);
        btn.click();
      },
    });
  }

  const tour = async () => {
    root.classList.add("touring");
    const total = stops.length;
    for (let i = 0; i < total && !done; i++) {
      const stop = stops[i];
      say(`Building ${stop.label} · ${i + 1}/${total}`);
      bar.style.width = `${((i + 1) / total) * 100}%`;

      // hold the blocks agents will drop, so the scroll doesn't reveal them first
      const candidates = [
        ...(stop.el.matches("[data-reveal]") ? [stop.el] : []),
        ...stop.el.querySelectorAll<HTMLElement>("[data-reveal]"),
      ].filter((el) => !el.classList.contains("is-in"));
      hold(candidates);

      // centre the stop if it fits, otherwise start it just under the navbar
      const h = stop.el.offsetHeight;
      const offset = stop.offset ?? (h < vh() - 180 ? -Math.max(90, (vh() - h) / 2) : -90);
      await scrollTo(stop.el, offset, 1150);
      if (done) return;

      // up to four visible blocks, one per agent
      const visible = candidates.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top < vh() - 60 && r.bottom > 70 && r.height > 0;
      });
      const targets = visible.slice(0, 4);
      candidates.filter((el) => !targets.includes(el)).forEach((el) => release(el, visible.includes(el)));
      await Promise.all(targets.map((el, k) =>
        sleep(k * 140).then(() => {
          const name = el.querySelector("h2, h3, h4, dt, .label")?.textContent?.trim().slice(0, 28) ?? stop.label;
          const tag = `<${name.replace(/[^\w ·&.-]/g, "").trim() || "Block"} />`;
          return drop(agents[k], contentRect(el, 6), tag, () => release(el, true));
        }),
      ));
      if (done) return;

      // one agent reads along; the others park at the side
      const reader = agents[i % agents.length];
      agents.filter((a) => a !== reader).forEach((a, k) => {
        void move(a, clamp(vw() - 150 - k * 36, 40, vw() - 60), clamp(vh() * (0.32 + k * 0.17), 90, vh() - 130), 700);
      });
      if (stop.onArrive) await stop.onArrive(reader);
      if (done) return;
      await read(reader, stop.el, stop.dwell);
    }
  };

  // ── hero ──────────────────────────────────────────────────────────────────
  const heroJob = (a: number, key: string, round = false) => {
    const el = byKey(key);
    return drop(agents[a], round ? globeRect(el) : contentRect(el), el.dataset.buildName ?? key, () => el.classList.add("is-built"), round);
  };
  const queues: (() => Promise<void>)[][] = [
    [() => heroJob(0, "status"), () => heroJob(0, "tagline")],
    [() => heroJob(1, "nav"), () => heroJob(1, "cta")],
    [() => heroJob(2, "headline"), () => heroJob(2, "meta")],
    [() => heroJob(3, "globe", true)],
  ];

  (async () => {
    await sleep(200);
    root.classList.add("grid-on");
    const t0 = performance.now();
    await Promise.all(queues.map(async (qq, i) => { await sleep(i * 160); for (const j of qq) await j(); }));
    if (done) return;
    blocks.forEach((b) => b.classList.add("is-built"));
    say("Hero shipped · touring the rest");
    await sleep(1200);
    await tour();
    if (done) return;
    const secs = Math.round((performance.now() - t0) / 1000);
    say(`Built and deployed by 4 agents in ${secs}s`);
    bar.style.width = "100%";
    status.classList.add("is-done");
    await Promise.all(agents.map((a, i) => move(a, i % 2 ? vw() + 60 : -60, a.y + rand(-80, 80), 800)));
    await sleep(1800);
    finish();
  })().catch(finish); // never leave the page half-built
}

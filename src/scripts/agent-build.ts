// "Agents are building this page" intro.
//
// Plays once per visit (sessionStorage), only when <html> got the `building`
// class in <head> (skipped for reduced motion and deep links). Several named
// cursors pick up dashed blueprints of each hero block, drag them into place
// and drop them; the real block then snaps in. Any scroll, key or the Skip
// button finishes it instantly.

type Agent = { name: string; color: string; ink: string; el: HTMLElement; x: number; y: number };
type Job = { agent: number; target: HTMLElement; round?: boolean };

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

export function runAgentBuild() {
  const root = document.documentElement;
  const blocks = [...document.querySelectorAll<HTMLElement>("[data-build]")];
  if (!root.classList.contains("building") || !blocks.length) {
    root.classList.remove("building");
    return;
  }
  try { sessionStorage.setItem("built", "1"); } catch { /* private mode */ }

  const byKey = (k: string) => blocks.find((b) => b.dataset.build === k);
  const vw = window.innerWidth, vh = window.innerHeight;
  
  // ── overlay ───────────────────────────────────────────────────────────────
  const layer = document.createElement("div");
  layer.className = "agent-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const status = document.createElement("div");
  status.className = "agent-status";
  status.innerHTML = `<span class="agent-dot"></span><span data-msg>4 agents are building this page…</span><button type="button" class="agent-skip">Skip</button>`;
  document.body.appendChild(status);
  const msg = status.querySelector<HTMLElement>("[data-msg]")!;

  const agents: Agent[] = AGENTS.map((a, i) => {
    const el = document.createElement("div");
    el.className = "agent-cursor";
    el.innerHTML = `${CURSOR_SVG(a.color)}<span class="agent-tag" style="background:${a.color};color:${a.ink}">${a.name}</span>`;
    layer.appendChild(el);
    // enter from the four edges
    const start = [
      { x: -40, y: vh * 0.3 },
      { x: vw + 40, y: vh * 0.2 },
      { x: vw * 0.3, y: vh + 40 },
      { x: vw + 40, y: vh * 0.8 },
    ][i];
    el.style.transform = `translate(${start.x}px, ${start.y}px)`;
    return { ...a, el, ...start };
  });

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    blocks.forEach((b) => b.classList.add("is-built"));
    root.classList.add("grid-on");
    layer.classList.add("is-leaving");
    status.classList.add("is-leaving");
    setTimeout(() => {
      // the hero's own entrance animation must not replay after the build
      document.querySelectorAll(".rise").forEach((el) => el.classList.remove("rise"));
      root.classList.remove("building", "grid-on");
      blocks.forEach((b) => b.classList.remove("is-built"));
      layer.remove();
      status.remove();
    }, 700);
    ["wheel", "touchmove", "keydown"].forEach((ev) => window.removeEventListener(ev, finish));
  };
  status.querySelector("button")!.addEventListener("click", finish);
  ["wheel", "touchmove", "keydown"].forEach((ev) => window.addEventListener(ev, finish, { passive: true, once: true }));

  // ── motion helpers ────────────────────────────────────────────────────────
  const move = (a: Agent, x: number, y: number, ms: number, ghost?: HTMLElement, gx = 0, gy = 0) => {
    const from = `translate(${a.x}px, ${a.y}px)`;
    const to = `translate(${x}px, ${y}px)`;
    const easing = "cubic-bezier(0.45, 0, 0.2, 1)";
    const anims = [a.el.animate([{ transform: from }, { transform: to }], { duration: ms, easing, fill: "forwards" })];
    if (ghost) {
      anims.push(
        ghost.animate(
          [{ transform: `translate(${a.x - gx}px, ${a.y - gy}px)` }, { transform: `translate(${x - gx}px, ${y - gy}px)` }],
          { duration: ms, easing, fill: "forwards" },
        ),
      );
    }
    a.x = x; a.y = y;
    return Promise.all(anims.map((an) => an.finished)).catch(() => {});
  };
  const click = (a: Agent) => a.el.animate([{ scale: 1 }, { scale: 0.82 }, { scale: 1 }], { duration: 220 }).finished.catch(() => {});

  const rectOf = (el: HTMLElement, round?: boolean) => {
    if (!round) {
      // hug the visible content, not the full-width box
      const box = el.dataset.build === "nav" ? el.querySelector<HTMLElement>("[data-notch-body]") ?? el : el;
      let r = box.getBoundingClientRect();
      if (box === el && el.dataset.build !== "meta") {
        const range = document.createRange();
        range.selectNodeContents(el);
        const c = range.getBoundingClientRect();
        if (c.width > 0) r = c;
      }
      const pad = 8;
      return { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
    }
    const r = el.getBoundingClientRect();
    // globe: same placement maths as ascii-globe.ts
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

  // ── one job: pick up a blueprint, drag it home, drop it ───────────────────
  const job = async ({ agent, target, round }: Job) => {
    if (done) return;
    const a = agents[agent];
    const dest = rectOf(target, round);
    const ghost = document.createElement("div");
    ghost.className = `agent-ghost${round ? " is-round" : ""}`;
    ghost.style.cssText = `width:${dest.w}px;height:${dest.h}px;--c:${a.color}`;
    ghost.innerHTML = `<span class="agent-ghost-label" style="background:${a.color};color:${a.ink}"></span>${round ? "" : "<i></i><i></i><i></i>"}`;
    ghost.querySelector<HTMLElement>(".agent-ghost-label")!.textContent = target.dataset.buildName ?? "";

    // pickup spot: somewhere visible, away from the destination
    const sx = Math.min(Math.max(16, dest.x + rand(-0.35, 0.35) * vw), vw - Math.min(dest.w, vw * 0.6) - 16);
    const sy = Math.min(Math.max(70, dest.y + (dest.y > vh / 2 ? -1 : 1) * rand(0.18, 0.32) * vh), vh - 80);
    const gx = Math.min(28, dest.w * 0.1), gy = Math.min(22, dest.h * 0.2); // where the cursor holds it

    await move(a, sx + gx, sy + gy, rand(380, 520));
    if (done) return;
    ghost.style.transform = `translate(${sx}px, ${sy}px)`;
    layer.insertBefore(ghost, layer.firstChild);
    ghost.animate([{ opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 }], { duration: 220, fill: "forwards" });
    await click(a);
    await move(a, dest.x + gx, dest.y + gy, rand(620, 780), ghost, gx, gy);
    if (done) return;
    await click(a);
    target.classList.add("is-built");
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: "forwards" }).finished.then(() => ghost.remove());
    await sleep(60);
  };

  const g = (k: string) => byKey(k)!;
  // each agent works through its own queue; all four run at once
  const queues: Job[][] = [
    [{ agent: 0, target: g("status") }, { agent: 0, target: g("tagline") }],
    [{ agent: 1, target: g("nav") }, { agent: 1, target: g("cta") }],
    [{ agent: 2, target: g("headline") }, { agent: 2, target: g("meta") }],
    [{ agent: 3, target: g("globe"), round: true }],
  ];

  (async () => {
    await sleep(200);
    root.classList.add("grid-on");
    const t0 = performance.now();
    await Promise.all(
      queues.map(async (q, i) => {
        await sleep(i * 160);
        for (const j of q) await job(j);
      }),
    );
    if (done) return;
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    msg.textContent = `Built by 4 agents in ${secs}s · 7 components shipped`;
    status.classList.add("is-done");
    // agents leave the way they came
    await Promise.all(agents.map((a, i) => move(a, i % 2 ? vw + 60 : -60, a.y + rand(-80, 80), 700)));
    await sleep(1100);
    finish();
  })();
}

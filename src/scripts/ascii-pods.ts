// A <pre> animation of a rolling deployment. Pattern taken from Speakeasy's
// cert-ascii-loop (found with REA): DOM text, ~30 fps throttle, paused while
// off screen, skipped entirely when the visitor prefers reduced motion.

const COLS = 12;
const ROWS = 4;
const STATES = ["·", "○", "◐", "●"]; // pending, creating, starting, running
const PERIOD = 6400; // ms for one full rollout

export function mountPods(pre: HTMLElement, status?: HTMLElement | null) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const n = COLS * ROWS;
  const offsets = Array.from({ length: n }, (_, i) => (i / n) * 0.7 + Math.random() * 0.08);

  const render = (phase: number) => {
    let ready = 0;
    const lines: string[] = [];
    for (let r = 0; r < ROWS; r++) {
      let line = "";
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const local = Math.min(1, Math.max(0, (phase - offsets[i]) / 0.18));
        const s = STATES[Math.min(STATES.length - 1, Math.floor(local * STATES.length))];
        if (s === "●") ready++;
        line += s + " ";
      }
      lines.push(line.trimEnd());
    }
    pre.textContent = lines.join("\n");
    if (status) status.textContent = `${String(ready).padStart(2, "0")}/${n} ready`;
  };

  if (reduced) { render(1); return; }

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(pre);
  let last = 0;
  const t0 = performance.now();
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (!visible || now - last < 33) return;
    last = now;
    const t = ((now - t0) % PERIOD) / PERIOD;
    render(Math.min(1, t * 1.25));
  };
  requestAnimationFrame(loop);
}

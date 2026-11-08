// ASCII construction scene for the agent build frontier.
//
//   ═════════════╤══════════════════════
//                │
//               [##]
//
//   [##][##][##][##][##]
//     [##][##][##][##][##][##][##]
//   [##][##][##][##][##][##][##][##][##]
//   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
//   ▸ infra-agent  placing block 23/40   ▓▓▓▓▓▓▓░░░░░  57%
//
// A crane hook travels to the next slot and drops a brick; the wall fills
// bottom-up in a running bond. Plain <pre> text, ~16 fps, paused off screen.

const AGENTS = ["planner", "infra-agent", "design-agent", "k8s-agent"];
const ROWS = 4;
const BRICK = "[##]";
const BW = BRICK.length;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function mountFrontierAscii(pre: HTMLElement) {
  let cols = 40, perRow = 9, total = 36;
  let filled: number[][] = [];
  let order: [number, number][] = [];
  let step = 0, phase: "move" | "drop" | "hold" = "move";
  let hookCol = 0, dropRow = -1, hold = 0, next = 0;
  const placedAt = new Map<string, number>();
  let tick = 0, visible = true, timer = 0;

  const measure = () => {
    const probe = document.createElement("span");
    probe.textContent = "M".repeat(10);
    pre.appendChild(probe);
    const cw = probe.getBoundingClientRect().width / 10 || 8;
    probe.remove();
    const room = Math.max(24, Math.floor((pre.parentElement?.clientWidth ?? 600) / cw) - 4);
    perRow = Math.max(4, Math.min(10, Math.floor((room - 6) / BW)));
    cols = perRow * BW + 6; // compact wall, centred by CSS
  };

  const reset = () => {
    measure();
    filled = Array.from({ length: ROWS }, () => Array(perRow).fill(0));
    order = [];
    for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < perRow; c++) order.push([r, c]);
    total = order.length;
    step = 0; phase = "move"; dropRow = -1; next = 0;
    placedAt.clear();
  };

  const xOf = (r: number, c: number) => 2 + (r % 2 ? 2 : 0) + c * BW; // running bond offset

  const render = () => {
    const lines: string[] = [];
    const [tr, tc] = order[Math.min(next, order.length - 1)] ?? [0, 0];
    const targetX = xOf(tr, tc);

    // crane beam and trolley
    const hookX = Math.round(hookCol);
    let beam = "";
    for (let i = 0; i < cols; i++) beam += i === hookX + 1 ? "╤" : "═";
    lines.push(`<span class="fa-crane">${beam}</span>`);

    // rope + falling brick area (2 lines above the wall)
    const air = [" ".repeat(cols), " ".repeat(cols)];
    const ropeLen = phase === "drop" ? Math.min(2, dropRow + 1) : 1;
    const put = (line: number, x: number, s: string) => { air[line] = air[line].slice(0, x) + s + air[line].slice(x + s.length); };
    for (let k = 0; k < ropeLen && k < 2; k++) put(k, hookX + 1, "│");
    let carried = "";
    if (phase === "move" || (phase === "drop" && dropRow < 0)) carried = "brick";
    lines.push(`<span class="fa-crane">${esc(air[0])}</span>`);
    let air1 = esc(air[1]);
    if (carried && hookX - 1 >= 0) {
      air1 = esc(air[1].slice(0, hookX - 1)) + `<span class="fa-hot">${BRICK}</span>` + esc(air[1].slice(hookX - 1 + BW));
    }
    lines.push(`<span class="fa-crane">${air1}</span>`);

    // the wall: each row is a list of segments; a falling brick overrides any slot it overlaps
    for (let r = 0; r < ROWS; r++) {
      const segs: { x: number; text: string; cls: string }[] = [];
      const fallingHere = phase === "drop" && dropRow === r && r < tr;
      for (let c = 0; c < perRow; c++) {
        const x = xOf(r, c);
        if (fallingHere && x < targetX + BW && x + BW > targetX) continue;
        if (filled[r][c]) {
          const age = tick - (placedAt.get(`${r}:${c}`) ?? -99);
          segs.push({ x, text: BRICK, cls: age < 6 ? "fa-new" : "fa-brick" });
        } else {
          segs.push({ x, text: r === tr && c === tc ? "[  ]" : " .. ", cls: r === tr && c === tc ? "fa-target" : "fa-slot" });
        }
      }
      if (fallingHere) segs.push({ x: targetX, text: BRICK, cls: "fa-hot" });
      segs.sort((a, b) => a.x - b.x);
      let html = "", cursor = 0;
      for (const s of segs) {
        html += " ".repeat(Math.max(0, s.x - cursor)) + `<span class="${s.cls}">${esc(s.text)}</span>`;
        cursor = Math.max(cursor, s.x) + s.text.length;
      }
      lines.push(html);
    }
    lines.push(`<span class="fa-ground">${"▔".repeat(cols)}</span>`);

    // status line
    const pct = Math.round((step / total) * 100);
    const barLen = Math.max(6, Math.min(14, cols - 32));
    const done = Math.round((pct / 100) * barLen);
    const agent = AGENTS[Math.floor(step / 6) % AGENTS.length];
    lines.push(
      `<span class="fa-meta">▸ <b>${agent}</b> placing ${String(Math.min(step + 1, total)).padStart(2, "0")}/${total} </span>` +
        `<span class="fa-hot">${"▓".repeat(done)}</span><span class="fa-slot">${"░".repeat(barLen - done)}</span>` +
        `<span class="fa-meta">  ${String(pct).padStart(3)}%</span>`,
    );
    pre.innerHTML = lines.join("\n");
  };

  const update = () => {
    tick++;
    if (phase === "hold") {
      if (--hold <= 0) reset();
      return;
    }
    const [tr, tc] = order[next];
    const tx = xOf(tr, tc) + 1; // hook sits over the brick's middle
    if (phase === "move") {
      const d = tx - hookCol;
      hookCol += Math.sign(d) * Math.min(Math.abs(d), 4);
      if (Math.abs(tx - hookCol) < 0.5) { hookCol = tx; phase = "drop"; dropRow = -1; }
    } else if (phase === "drop") {
      dropRow++;
      if (dropRow >= tr) {
        filled[tr][tc] = 1;
        placedAt.set(`${tr}:${tc}`, tick);
        step++; next++;
        if (next >= order.length) { phase = "hold"; hold = 18; }
        else phase = "move";
      }
    }
  };

  const loop = () => {
    if (visible && !document.hidden) { update(); render(); }
  };

  reset();
  hookCol = xOf(order[0][0], order[0][1]) + 1;
  render();
  timer = window.setInterval(loop, 55);
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(pre);
  const ro = new ResizeObserver(() => { const old = cols; measure(); if (cols !== old) reset(); });
  ro.observe(pre);

  return {
    stop() { clearInterval(timer); io.disconnect(); ro.disconnect(); },
  };
}

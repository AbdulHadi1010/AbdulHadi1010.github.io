// Drives the live diagrams in "Selected work". Each one starts when its card
// scrolls into view and pauses when it leaves. Reduced motion: final state only.

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function whenVisible(el: Element, onChange: (v: boolean) => void) {
  new IntersectionObserver(([e]) => onChange(e.isIntersecting), { threshold: 0.25 }).observe(el);
}

// ── Secure but Broken: seven gates, alternating an accepted and a rejected repair
function gates(root: HTMLElement) {
  const rows = [...root.querySelectorAll<HTMLElement>("[data-gate]")];
  const verdict = root.querySelector<HTMLElement>("[data-verdict]")!;
  const runEl = root.querySelector<HTMLElement>("[data-run]")!;
  const set = (i: number, s: string) => (rows[i].dataset.state = s);
  if (reduced) { rows.forEach((_, i) => set(i, i === 5 ? "fail" : "pass")); verdict.textContent = "secure but broken"; verdict.dataset.kind = "bad"; return; }
  let visible = false, running = false, run = 1;
  const loop = async () => {
    if (running) return;
    running = true;
    while (visible) {
      const broken = run % 2 === 0;
      runEl.textContent = `#${String(run).padStart(2, "0")}`;
      rows.forEach((_, i) => set(i, "idle"));
      verdict.textContent = "running"; delete verdict.dataset.kind;
      for (let i = 0; i < rows.length; i++) {
        set(i, "run");
        await sleep(520);
        if (broken && i === 5) { set(i, "fail"); break; }
        set(i, "pass");
      }
      verdict.textContent = broken ? "rejected: secure but broken" : "accepted: secure and working";
      verdict.dataset.kind = broken ? "bad" : "ok";
      await sleep(2600);
      run++;
    }
    running = false;
  };
  whenVisible(root, (v) => { visible = v; if (v) loop(); });
}

// ── EKS storage: bars grow and counters run once per appearance
function bars(root: HTMLElement) {
  const fills = [...root.querySelectorAll<HTMLElement>("[data-bar]")];
  const counts = [...root.querySelectorAll<HTMLElement>("[data-count]")];
  const fmt = new Intl.NumberFormat("en-US");
  const show = () => {
    fills.forEach((f) => (f.style.width = `${f.dataset.bar}%`));
    if (reduced) { counts.forEach((c) => (c.textContent = fmt.format(+c.dataset.count!))); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1600);
      const e = 1 - Math.pow(1 - p, 3);
      counts.forEach((c) => (c.textContent = fmt.format(Math.round(+c.dataset.count! * e))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const hide = () => fills.forEach((f) => (f.style.width = "0"));
  whenVisible(root, (v) => (v ? show() : hide()));
}

// ── LLM on CPU: the same reply streamed at 2.5 and 27 tokens per second
function tokens(root: HTMLElement) {
  const text = root.querySelector<HTMLElement>("[data-reply]")!.dataset.reply!;
  const toks = text.match(/\S+\s*/g) ?? [];               // ~ one word per token, close enough to read
  const outs = [...root.querySelectorAll<HTMLElement>("[data-type]")];
  if (reduced) { outs.forEach((o) => (o.textContent = text)); return; }
  let visible = false, timer = 0, t0 = 0;
  const frame = () => {
    const s = (performance.now() - t0) / 1000;
    let allDone = true;
    outs.forEach((o) => {
      const n = Math.min(toks.length, Math.floor(s * +o.dataset.type!));
      o.textContent = toks.slice(0, n).join("");
      if (n < toks.length) allDone = false;
    });
    if (allDone || s > 18) { t0 = performance.now() + 2500; }
  };
  whenVisible(root, (v) => {
    visible = v;
    clearInterval(timer);
    if (visible) { t0 = performance.now(); timer = window.setInterval(frame, 60); }
  });
}

// ── K8s from bare VMs: roles converge across three Molecule drivers
function envs(root: HTMLElement) {
  const cells = [...root.querySelectorAll<HTMLElement>("[data-cell]")];
  const recap = root.querySelector<HTMLElement>("[data-recap]")!;
  const cols = 3;
  if (reduced) { cells.forEach((c) => (c.dataset.state = "pass")); recap.textContent = "PLAY RECAP · 3/3 converged · idempotent"; recap.classList.add("done"); return; }
  let visible = false, running = false;
  const loop = async () => {
    if (running) return;
    running = true;
    while (visible) {
      cells.forEach((c) => (c.dataset.state = "idle"));
      recap.textContent = "PLAY RECAP · converging"; recap.classList.remove("done");
      const rows = cells.length / cols;
      for (let r = 0; r < rows; r++) {
        const row = cells.slice(r * cols, r * cols + cols);
        row.forEach((c) => (c.dataset.state = "run"));
        // drivers finish in a slightly different order each role
        for (const c of [...row].sort(() => Math.random() - 0.5)) { await sleep(260 + Math.random() * 360); c.dataset.state = "pass"; }
      }
      recap.textContent = "PLAY RECAP · 3/3 converged · idempotent";
      recap.classList.add("done");
      await sleep(2800);
    }
    running = false;
  };
  whenVisible(root, (v) => { visible = v; if (v) loop(); });
}

const drivers: Record<string, (el: HTMLElement) => void> = {
  "secure-but-broken": gates,
  "eks-storage": bars,
  "llm-on-cpu": tokens,
  "k8s-ansible": envs,
};
document.querySelectorAll<HTMLElement>("[data-viz]").forEach((el) => drivers[el.dataset.viz!]?.(el));

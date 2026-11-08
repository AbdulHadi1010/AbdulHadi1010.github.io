// Two-pass ASCII renderer for the lab scenes.
//
// Pass 1 evaluates a scene once per character cell into a tiny RGBA texture
// (cols × rows), so raymarched 3D scenes cost one sample per glyph, not one per
// pixel. Pass 2 draws every cell with the glyph whose density matches the
// brightness, sampled from an atlas drawn once on a 2D canvas (the technique
// found in Speakeasy's bundle with REA).

export const CHARSET = " .·:-=+*≡#%@";

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const COMMON = `#version 300 es
precision highp float;
uniform vec2  uGrid;     // cols, rows
uniform float uAspect;   // cell-grid aspect in screen units
uniform float uTime;
uniform vec2  uMouse;    // scene space
uniform float uMouseAmt;
uniform vec2  uTilt;
uniform float uNarrow;
uniform vec2  uShift;   // where the subject sits in scene space
uniform float uZoom;    // focal length multiplier
out vec4 outColor;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash1(float n){ return fract(sin(n) * 43758.5453); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, b - r) - r; }

vec2 scene(vec2 q);

void main(){
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 uv = (cell + 0.5) / uGrid;          // 0..1, y up
  vec2 q = vec2((uv.x - 0.5) * 2.0 * uAspect, (uv.y - 0.5) * 2.0);
  vec2 s = scene(q);

  float md = length(q - uMouse);
  float ripple = sin(md * 26.0 - uTime * 6.0) * 0.5 + 0.5;
  float fall = exp(-md * md * 16.0) * uMouseAmt;
  s.x += fall * (0.2 + 0.4 * ripple) * (1.0 - s.x);
  s.y = max(s.y, fall * ripple * 0.7);
  outColor = vec4(clamp(s, 0.0, 1.0), 0.0, 1.0);
}`;

const GLYPH_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uCell;
uniform vec2 uGrid;
uniform sampler2D uScene;
uniform sampler2D uAtlas;
uniform float uGlyphs;
uniform vec3 uInk, uMid, uAccent;
out vec4 outColor;
void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 cell = floor(frag / uCell);
  vec2 local = fract(frag / uCell);
  ivec2 tc = ivec2(cell.x, uGrid.y - 1.0 - cell.y);
  if (tc.x >= int(uGrid.x) || tc.y < 0) { outColor = vec4(0.0); return; }
  vec2 s = texelFetch(uScene, tc, 0).rg;
  float idx = floor(s.x * (uGlyphs - 1.0) + 0.5);
  float a = texture(uAtlas, vec2((idx + local.x) / uGlyphs, local.y)).r;
  vec3 col = mix(uInk, uMid, smoothstep(0.08, 0.7, s.x));
  col = mix(col, uAccent, clamp(s.y + smoothstep(0.82, 1.0, s.x) * 0.5, 0.0, 1.0));
  outColor = vec4(col * a, a);
}`;

// ── scenes ─────────────────────────────────────────────────────────────────

/** Raymarch helper shared by the 3D scenes: returns brightness, accent. */
const RAYMARCH = (map: string, shade: string, cam: string) => `
${map}
vec3 nrm(vec3 p){ vec2 e = vec2(0.002, 0.0); return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x, map(p+e.yxy).x-map(p-e.yxy).x, map(p+e.yyx).x-map(p-e.yyx).x)); }
vec2 scene(vec2 q){
  ${cam}
  float t = 0.0; vec2 h = vec2(1e9, 0.0); bool hit = false;
  for (int i = 0; i < 72; i++) {
    vec3 p = ro + rd * t;
    h = map(p);
    if (h.x < 0.0015) { hit = true; break; }
    t += h.x;
    if (t > 12.0) break;
  }
  if (!hit) {
    float s = hash(floor(q * 34.0));
    return vec2(step(0.993, s) * 0.22, 0.0);
  }
  vec3 p = ro + rd * t;
  vec3 n = nrm(p);
  vec3 L = normalize(vec3(-0.4, 0.8, 0.5));
  float diff = max(dot(n, L), 0.0);
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
  float b = 0.22 + 0.68 * diff + 0.3 * rim;
  float acc = 0.0;
  ${shade}
  return vec2(clamp(b, 0.0, 1.0), clamp(acc, 0.0, 1.0));
}`;

const ORBIT_CAM = (dist: number, height: number, speed: number) => `
  float ang = uTime * ${speed.toFixed(3)} + uTilt.x * 1.6;
  float el = ${height.toFixed(3)} + uTilt.y * 0.8;
  vec3 ro = vec3(sin(ang) * ${dist.toFixed(2)}, el, cos(ang) * ${dist.toFixed(2)});
  vec3 ta = vec3(0.0, 0.0, 0.0);
  vec3 ww = normalize(ta - ro), uu = normalize(cross(ww, vec3(0,1,0))), vv = cross(uu, ww);
  vec2 sq = q - uShift;
  vec3 rd = normalize(sq.x * uu + sq.y * vv + 2.35 * uZoom * ww);`;

export const SCENES: Record<string, { label: string; blurb: string; glsl: string }> = {
  gpu: {
    label: "GPU",
    blurb: "A data-centre GPU package: die with 8×8 streaming multiprocessors lighting up as work lands, six HBM stacks, gold edge pins.",
    glsl: RAYMARCH(
      `vec2 map(vec3 p){
        float sub = sdRBox(p - vec3(0.0, -0.06, 0.0), vec3(1.25, 0.05, 0.95), 0.02);
        float die = sdRBox(p - vec3(-0.18, 0.03, 0.0), vec3(0.42, 0.05, 0.42), 0.012);
        vec3 hp = p - vec3(0.5, 0.03, 0.0); hp.z = abs(hp.z); hp.z -= 0.3; hp.z = abs(hp.z) - 0.0;
        vec3 hq = p - vec3(0.5, 0.035, 0.0);
        hq.z = hq.z - clamp(floor(hq.z / 0.3 + 0.5), -1.0, 1.0) * 0.3;
        float hbm = sdRBox(hq - vec3(0.0, 0.03, 0.0), vec3(0.14, 0.1, 0.12), 0.01);
        vec3 lp = p - vec3(-0.18, 0.03, 0.0);
        lp.z = lp.z - clamp(floor(lp.z / 0.3 + 0.5), -1.0, 1.0) * 0.3;
        float hbmL = sdRBox(lp - vec3(-0.66, 0.035, 0.0), vec3(0.14, 0.1, 0.12), 0.01);
        float d = min(sub, min(die, min(hbm, hbmL)));
        float id = d == sub ? 1.0 : d == die ? 2.0 : 3.0;
        return vec2(d, id);
      }`,
      `float id = map(p).y;
      if (id == 2.0 && n.y > 0.9) {
        vec2 sm = (p.xz - vec2(-0.18, 0.0)) / 0.84 * 8.0 + 4.0;
        vec2 si = floor(sm), sf = fract(sm);
        float gap = step(0.12, sf.x) * step(0.12, sf.y);
        float h = hash(si);
        float wave = sin(uTime * 2.4 - length(si - 3.5) * 0.9 + h * 2.0) * 0.5 + 0.5;
        float on = step(0.45, wave) * gap;
        b = mix(0.4, 1.0, on);
        acc = on * 0.9;
      } else if (id == 3.0 && abs(n.y) < 0.3) {
        b = (0.55 + 0.4 * step(0.5, fract(p.y * 60.0))) * (0.6 + 0.4 * diff);
      } else if (id == 1.0) {
        float edge = step(1.15, abs(p.x)) + step(0.86, abs(p.z));
        float pins = step(0.5, fract((p.x + p.z) * 22.0));
        b *= 0.35 + 0.45 * pins * min(edge, 1.0);
      }`,
      ORBIT_CAM(3.0, 1.15, 0.18),
    ),
  },

  cluster: {
    label: "Kubernetes",
    blurb: "A 3×3 node cluster around a control plane. Pods get scheduled, start and settle on each node; the control plane pulses as it reconciles.",
    glsl: RAYMARCH(
      `vec2 map(vec3 p){
        vec3 g = p; g.xz = g.xz - clamp(floor(g.xz / 0.92 + 0.5), -1.0, 1.0) * 0.92;
        vec2 cell = clamp(floor(p.xz / 0.92 + 0.5), -1.0, 1.0);
        bool center = cell.x == 0.0 && cell.y == 0.0;
        float node = sdRBox(g - vec3(0.0, -0.05, 0.0), vec3(0.34, center ? 0.2 : 0.05, 0.34), 0.03);
        // pods: 2×2 per worker
        vec3 pp = g - vec3(0.0, 0.07, 0.0);
        vec2 pc = sign(pp.xz); pp.xz = abs(pp.xz) - 0.14;
        float seed = hash(cell * 3.1 + pc * 7.7);
        float life = fract(uTime * 0.18 + seed);
        float sz = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.85, 1.0, life));
        float pod = center ? 1e9 : sdRBox(pp - vec3(0.0, 0.07 * sz, 0.0), vec3(0.09, 0.07, 0.09) * max(sz, 0.001), 0.015);
        float d = min(node, pod);
        float id = d == pod ? 3.0 : center ? 2.0 : 1.0;
        return vec2(d, id + seed * 0.0);
      }`,
      `float id = floor(map(p).y + 0.5);
      if (id == 2.0) {
        float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
        b = max(b, 0.45 + 0.4 * pulse * step(0.1, p.y));
        acc = 0.35 + 0.5 * pulse;
      } else if (id == 3.0) {
        vec2 cell = clamp(floor(p.xz / 0.92 + 0.5), -1.0, 1.0);
        vec2 pc = sign(p.xz - cell * 0.92);
        float life = fract(uTime * 0.18 + hash(cell * 3.1 + pc * 7.7));
        float starting = 1.0 - smoothstep(0.1, 0.3, life);
        b = max(b, 0.55);
        acc = max(starting, 0.25);
      } else {
        b *= 0.45;
      }`,
      ORBIT_CAM(3.4, 1.6, 0.12),
    ),
  },

  llm: {
    label: "LLM",
    blurb: "Six transformer layers as planes of token activations. A forward pass climbs the stack while attention lights tokens within each layer.",
    glsl: `
vec2 scene(vec2 q){
  float ang = uTime * 0.15 + uTilt.x * 1.5;
  float el = 0.55 + uTilt.y * 0.6;
  vec3 ro = vec3(sin(ang) * 2.7, 0.9 + el, cos(ang) * 2.7);
  vec3 ww = normalize(vec3(0.0, 0.0, 0.0) - ro), uu = normalize(cross(ww, vec3(0,1,0))), vv = cross(uu, ww);
  vec2 sq = q - uShift;
  vec3 rd = normalize(sq.x * uu + sq.y * vv + 2.1 * uZoom * ww);

  float b = 0.0, acc = 0.0;
  float pass = fract(uTime * 0.22) * 7.0;          // which layer the forward pass is on
  for (int k = 0; k < 6; k++) {
    float y = -0.75 + float(k) * 0.3;
    float t = (y - ro.y) / rd.y;
    if (t <= 0.0) continue;
    vec3 p = ro + rd * t;
    if (abs(p.x) > 0.95 || abs(p.z) > 0.95) continue;
    vec2 g = (p.xz + 0.95) / 1.9 * 12.0;
    vec2 gi = floor(g), gf = fract(g) - 0.5;
    float dotm = 1.0 - smoothstep(0.18, 0.36, length(gf));
    float frame = max(1.0 - smoothstep(0.0, 0.02, abs(abs(p.x) - 0.95)), 1.0 - smoothstep(0.0, 0.02, abs(abs(p.z) - 0.95)));
    float act = exp(-pow(pass - float(k) - 0.5, 2.0) * 3.0);
    float h = hash(gi + float(k) * 13.0);
    float attn = step(0.82, h) * (0.5 + 0.5 * sin(uTime * 4.0 + h * 30.0));
    float lit = dotm * (0.3 + 0.55 * act * (0.4 + h) + 0.5 * attn * act);
    float fade = 1.0 - b * 0.35;
    b += (lit + frame * 0.35) * fade;
    acc = max(acc, dotm * act * step(0.6, h));
  }
  // residual stream: a bright column rising through the stack
  return vec2(clamp(b, 0.0, 1.0), clamp(acc, 0.0, 1.0));
}`,
  },
};

// ── engine ─────────────────────────────────────────────────────────────────

function cssColor(el: Element, name: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  el.appendChild(probe);
  const rgb = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [200, 200, 200];
  probe.remove();
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

function atlas(cellPx: number) {
  const c = document.createElement("canvas");
  c.width = cellPx * CHARSET.length;
  c.height = cellPx;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";
  ctx.font = `500 ${Math.round(cellPx * 0.82)}px ${mono}`;
  [...CHARSET].forEach((ch, i) => ctx.fillText(ch, i * cellPx + cellPx / 2, cellPx / 2 + 1));
  return c;
}

function program(gl: WebGL2RenderingContext, fs: string) {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
  return p;
}

export type AsciiHandle = { setScene(name: string): void; refreshColors(): void; destroy(): void };

export function mountAscii(canvas: HTMLCanvasElement, sceneName: string, opts: { cell?: number; pointerTarget?: HTMLElement; centered?: boolean } = {}): AsciiHandle | null {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const glyph = program(gl, GLYPH_FRAG);
  let scene = program(gl, COMMON + SCENES[sceneName].glsl);

  const bindQuad = (p: WebGLProgram) => {
    const loc = gl.getAttribLocation(p, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  };

  const sceneTex = gl.createTexture()!;
  const fbo = gl.createFramebuffer()!;
  const atlasTex = gl.createTexture()!;
  let cols = 1, rows = 1, cellPx = 12, narrow = false;

  const setColors = () => {
    gl.useProgram(glyph);
    gl.uniform3fv(gl.getUniformLocation(glyph, "uInk"), cssColor(canvas.parentElement!, "--ascii-ink"));
    gl.uniform3fv(gl.getUniformLocation(glyph, "uMid"), cssColor(canvas.parentElement!, "--muted"));
    gl.uniform3fv(gl.getUniformLocation(glyph, "uAccent"), cssColor(canvas.parentElement!, "--accent"));
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    narrow = width < 768;
    cellPx = Math.round((opts.cell ?? (narrow ? 10 : 12)) * dpr);
    cols = Math.ceil(canvas.width / cellPx);
    rows = Math.ceil(canvas.height / cellPx);

    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas(cellPx));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  const mouse = { x: 9, y: 9, last: -1e9, amt: 0, tx: 0, ty: 0, cx: 0, cy: 0 };
  const target = opts.pointerTarget ?? window;
  const onMove = (e: Event) => {
    const ev = e as PointerEvent;
    const r = canvas.getBoundingClientRect();
    if (ev.clientY < r.top || ev.clientY > r.bottom || ev.clientX < r.left || ev.clientX > r.right) return;
    const aspect = r.width / r.height;
    mouse.x = ((ev.clientX - r.left) / r.width - 0.5) * 2 * aspect;
    mouse.y = -((ev.clientY - r.top) / r.height - 0.5) * 2;
    mouse.tx = ((ev.clientX - r.left) / r.width - 0.5) * 0.6;
    mouse.ty = ((ev.clientY - r.top) / r.height - 0.5) * 0.4;
    mouse.last = performance.now();
  };
  target.addEventListener("pointermove", onMove, { passive: true });

  resize();
  setColors();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(canvas);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const t0 = performance.now();
  let raf = 0;
  const draw = (now: number) => {
    const t = reduced ? 6 : (now - t0) / 1000;
    mouse.amt += (((now - mouse.last) / 1000 < 1.2 ? 1 : 0) - mouse.amt) * 0.06;
    mouse.cx += (mouse.tx - mouse.cx) * 0.05;
    mouse.cy += (mouse.ty - mouse.cy) * 0.05;

    // pass 1: scene → cols×rows texture
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, cols, rows);
    gl.useProgram(scene);
    bindQuad(scene);
    const U = (n: string) => gl.getUniformLocation(scene, n);
    gl.uniform2f(U("uGrid"), cols, rows);
    gl.uniform1f(U("uAspect"), (cols * cellPx) / (rows * cellPx));
    gl.uniform1f(U("uTime"), t);
    gl.uniform2f(U("uMouse"), mouse.x, mouse.y);
    gl.uniform1f(U("uMouseAmt"), reduced ? 0 : mouse.amt);
    gl.uniform2f(U("uTilt"), mouse.cx, mouse.cy);
    gl.uniform1f(U("uNarrow"), narrow ? 1 : 0);
    const aspect = cols / rows;
    gl.uniform1f(U("uZoom"), opts.centered ? 1 : narrow ? 0.8 : 0.72);
    if (opts.centered) gl.uniform2f(U("uShift"), 0, 0);
    else if (narrow) gl.uniform2f(U("uShift"), 0, -0.55);
    else gl.uniform2f(U("uShift"), aspect * 0.42, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // pass 2: glyphs
    gl.enable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(glyph);
    bindQuad(glyph);
    const G = (n: string) => gl.getUniformLocation(glyph, n);
    gl.uniform2f(G("uRes"), canvas.width, canvas.height);
    gl.uniform1f(G("uCell"), cellPx);
    gl.uniform2f(G("uGrid"), cols, rows);
    gl.uniform1f(G("uGlyphs"), CHARSET.length);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.uniform1i(G("uScene"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(G("uAtlas"), 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  };
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (visible && !document.hidden) draw(now);
  };
  if (reduced) draw(t0);
  else raf = requestAnimationFrame(loop);
  canvas.dataset.ready = "true";

  return {
    setScene(name) {
      if (!SCENES[name]) return;
      const next = program(gl, COMMON + SCENES[name].glsl);
      gl.deleteProgram(scene);
      scene = next;
      if (reduced) draw(performance.now());
    },
    refreshColors() {
      setColors();
      resize();
      if (reduced) draw(performance.now());
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      target.removeEventListener("pointermove", onMove);
    },
  };
}

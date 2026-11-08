// ASCII globe renderer.
//
// Technique (learned from Speakeasy's hero, see README): draw a glyph atlas
// once on a 2D canvas, then let a fragment shader shade every character cell
// from a procedural scene and pick the glyph whose density matches.
// Here the scene is a ray-traced globe with a lat/long mesh, pulsing "region"
// nodes and packets travelling along meridians. No three.js, ~6 KB.

import { LAND_BITS, LAND_H, LAND_W } from "../data/landmask";

const CHARSET = " .·:-=+*≡#%@";

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2  uRes;      // canvas px
uniform float uCell;     // cell size px
uniform float uTime;
uniform vec2  uMouse;    // scene space
uniform float uMouseAmt; // 0..1 fades when idle
uniform vec2  uCenter;   // globe center, scene space
uniform float uRadius;
uniform vec2  uTilt;     // pointer parallax
uniform sampler2D uAtlas;
uniform sampler2D uLand;
uniform float uGlyphs;
uniform vec3  uInk;      // dim glyph color
uniform vec3  uMid;      // mid glyph color
uniform vec3  uAccent;   // bright glyph color
out vec4 outColor;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }

// returns brightness in x, "accent-ness" in y
vec2 scene(vec2 q){
  float b = 0.0, acc = 0.0;
  vec2 d = q - uCenter;
  float r = length(d);

  if (r < uRadius) {
    float z = sqrt(uRadius*uRadius - r*r);
    vec3 n = vec3(d, z) / uRadius;
    vec3 w = rotX(0.38 + uTilt.y) * rotY(uTime*0.12 + uTilt.x) * n;

    float lat = asin(clamp(w.y, -1.0, 1.0));
    float lon = atan(w.z, w.x);

    // light
    vec3 L = normalize(vec3(-0.35, 0.45, 0.9));
    float diff = max(dot(n, L), 0.0);
    vec2 luv = vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.14159265);
    float land = texture(uLand, luv).r;

    // ocean stays sparse, land carries the light
    b = mix(0.04 + 0.14 * diff, 0.3 + 0.66 * pow(diff, 0.8), land);

    // mesh: 12 meridians, 12 parallels, faint
    float sp = 3.14159265 / 12.0;
    float mLon = abs(fract(lon / sp + 0.5) - 0.5) * sp * cos(lat);
    float mLat = abs(fract(lat / sp + 0.5) - 0.5) * sp;
    float line = max(1.0 - smoothstep(0.0, 0.03, mLon), 1.0 - smoothstep(0.0, 0.03, mLat));
    b += line * (1.0 - land) * (0.14 + 0.16 * diff);

    // region nodes on a coarse grid
    vec2 g = vec2(lon / sp, lat / sp);
    vec2 gi = floor(g);
    vec2 gf = fract(g) - 0.5;
    float h = hash(gi);
    if (h > 0.9 && land > 0.5) {
      float pulse = 0.5 + 0.5 * sin(uTime * 2.2 + h * 40.0);
      float node = 1.0 - smoothstep(0.08, 0.22 + 0.12 * pulse, length(gf));
      b += node * (0.55 + 0.45 * pulse) * (0.4 + 0.6 * diff);
      acc = max(acc, node);
    }

    // packets running along meridians
    float lane = floor(lon / sp + 0.5);
    float lh = hash(vec2(lane, 7.0));
    if (lh > 0.6) {
      float head = fract(uTime * (0.08 + 0.1 * lh) + lh) * 3.14159265 - 1.5708;
      float dist = lat - head;
      float trail = (1.0 - smoothstep(0.0, 0.5, -dist)) * step(dist, 0.0) * (1.0 - smoothstep(0.0, 0.03, mLon));
      b += trail * 0.9;
      acc = max(acc, trail);
    }

    // soften the limb
    b *= smoothstep(0.0, 0.25, z / uRadius) * 0.85 + 0.15;
  } else {
    // atmosphere ring
    float ring = 1.0 - smoothstep(0.0, 0.05, abs(r - uRadius * 1.04));
    b += ring * 0.22;
    // starfield: sparse, static per cell
    float s = hash(floor(q * 40.0));
    b += step(0.992, s) * 0.25;
  }

  // pointer: a ripple that scatters glyphs where the visitor moves
  float md = length(q - uMouse);
  float ripple = sin(md * 28.0 - uTime * 6.0) * 0.5 + 0.5;
  float fall = exp(-md * md * 18.0) * uMouseAmt;
  b += fall * (0.25 + 0.45 * ripple);
  acc = max(acc, fall * ripple * 0.8);

  return vec2(clamp(b, 0.0, 1.0), clamp(acc, 0.0, 1.0));
}

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 cell = floor(frag / uCell);
  vec2 local = fract(frag / uCell);
  vec2 cc = (cell + 0.5) * uCell;
  // scene space: y up, height spans -1..1
  vec2 q = (cc - 0.5 * uRes) / (0.5 * uRes.y);
  q.y = -q.y;

  vec2 s = scene(q);
  float idx = floor(s.x * (uGlyphs - 1.0) + 0.5);
  vec2 uv = vec2((idx + local.x) / uGlyphs, local.y);
  float a = texture(uAtlas, uv).r;
  vec3 col = mix(uInk, uMid, smoothstep(0.08, 0.7, s.x));
  col = mix(col, uAccent, clamp(s.y + smoothstep(0.78, 1.0, s.x) * 0.5, 0.0, 1.0));
  outColor = vec4(col * a, a);
}`;

type Opts = { canvas: HTMLCanvasElement; reducedMotion: boolean };

function cssColor(name: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [200, 200, 200];
  probe.remove();
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

function buildAtlas(cellPx: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = cellPx * CHARSET.length;
  c.height = cellPx;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${Math.round(cellPx * 0.82)}px "JetBrains Mono Variable", ui-monospace, monospace`;
  [...CHARSET].forEach((ch, i) => ctx.fillText(ch, i * cellPx + cellPx / 2, cellPx / 2 + 1));
  return c;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

export async function mountAsciiGlobe({ canvas, reducedMotion }: Opts) {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
  if (!gl) return false;

  try {
    await document.fonts.load('500 16px "JetBrains Mono Variable"');
  } catch {
    /* fall back to system mono */
  }

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    res: U("uRes"), cell: U("uCell"), time: U("uTime"), mouse: U("uMouse"), mouseAmt: U("uMouseAmt"),
    center: U("uCenter"), radius: U("uRadius"), tilt: U("uTilt"), atlas: U("uAtlas"),
    glyphs: U("uGlyphs"), ink: U("uInk"), mid: U("uMid"), accent: U("uAccent"), land: U("uLand"),
  };

  const tex = gl.createTexture();

  // land mask: 1 bit per cell, unpacked to an R8 texture on unit 1
  const bits = Uint8Array.from(atob(LAND_BITS), (c) => c.charCodeAt(0));
  const landPx = new Uint8Array(LAND_W * LAND_H);
  for (let i = 0; i < landPx.length; i++) landPx[i] = bits[i >> 3] & (1 << (i & 7)) ? 255 : 0;
  const landTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, landTex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, LAND_W, LAND_H, 0, gl.RED, gl.UNSIGNED_BYTE, landPx);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(u.land, 1);
  gl.activeTexture(gl.TEXTURE0);
  let cellPx = 14;

  const setColors = () => {
    gl.uniform3fv(u.ink, cssColor("--ascii-ink"));
    gl.uniform3fv(u.mid, cssColor("--muted"));
    gl.uniform3fv(u.accent, cssColor("--accent"));
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);

    const narrow = width < 768;
    cellPx = Math.round((narrow ? 10 : 13) * dpr);
    const atlas = buildAtlas(cellPx);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const aspect = width / Math.max(height, 1);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.cell, cellPx);
    gl.uniform1i(u.atlas, 0);
    gl.uniform1f(u.glyphs, CHARSET.length);
    if (narrow) {
      gl.uniform2f(u.center, 0.0, -0.78);
      gl.uniform1f(u.radius, Math.min(0.9, aspect * 1.05));
    } else {
      const wide = aspect > 1.5;
      gl.uniform2f(u.center, aspect * (wide ? 0.5 : 0.62), -0.02);
      gl.uniform1f(u.radius, wide ? 0.8 : 0.72);
    }
  };

  // pointer
  const mouse = { x: 9, y: 9, amt: 0, last: -1e9, tx: 0, ty: 0, cx: 0, cy: 0 };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    mouse.x = ((e.clientX - r.left) - r.width / 2) / (r.height / 2);
    mouse.y = -((e.clientY - r.top) - r.height / 2) / (r.height / 2);
    mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
    mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.3;
    mouse.last = performance.now();
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  setColors();
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const mo = new MutationObserver(setColors);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-palette"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", setColors);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(canvas);

  const t0 = performance.now();
  const frame = (now: number) => {
    const t = (now - t0) / 1000;
    const idle = (now - mouse.last) / 1000;
    mouse.amt += ((idle < 1.2 ? 1 : 0) - mouse.amt) * 0.06;
    mouse.cx += (mouse.tx - mouse.cx) * 0.05;
    mouse.cy += (mouse.ty - mouse.cy) * 0.05;
    gl.uniform1f(u.time, reducedMotion ? 8.0 : t);
    gl.uniform2f(u.mouse, mouse.x, mouse.y);
    gl.uniform1f(u.mouseAmt, reducedMotion ? 0 : mouse.amt);
    gl.uniform2f(u.tilt, mouse.cx, mouse.cy);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  if (reducedMotion) {
    frame(t0);
    ro.disconnect();
    new ResizeObserver(() => { resize(); frame(t0); }).observe(canvas);
  } else {
    const loop = (now: number) => {
      if (visible && !document.hidden) frame(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  canvas.dataset.ready = "true";
  return true;
}

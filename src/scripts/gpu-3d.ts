// Real-time 3D GPU package, raymarched in a fragment shader.
//
// integratedbio's hero (Unicorn Studio scene, read from its JSON) is a pre-rendered
// image on a plane that tilts a few degrees toward the pointer (axisTilt 0.03,
// trackMouse 0.01) under a two-pass progressive blur. Here the object is real
// geometry instead, so it can rotate and its streaming multiprocessors can light
// up; the pointer tilt and the progressive blur edge are kept.

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uTilt;
uniform vec3 uBg, uAccent, uMetal;
uniform float uDark;
out vec4 o;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdR(vec3 p, vec3 b, float r){ return sdBox(p, b - r) - r; }

// ids: 1 substrate, 2 die, 3 hbm, 4 caps, 5 heat-spreader frame
vec2 map(vec3 p){
  float sub = sdR(p - vec3(0.0, -0.07, 0.0), vec3(1.3, 0.05, 1.0), 0.03);
  float frame = max(sdR(p - vec3(0.0, -0.005, 0.0), vec3(1.18, 0.02, 0.88), 0.02), -sdBox(p - vec3(0.0, 0.0, 0.0), vec3(1.08, 0.06, 0.78)));
  float die = sdR(p - vec3(-0.12, 0.02, 0.0), vec3(0.42, 0.045, 0.46), 0.012);
  vec3 h = p - vec3(0.0, 0.03, 0.0);
  h.x = abs(h.x + 0.12) - 0.66;
  h.z = h.z - clamp(floor(h.z / 0.31 + 0.5), -1.0, 1.0) * 0.31;
  float hbm = sdR(h, vec3(0.15, 0.055, 0.125), 0.012);
  vec3 c = p - vec3(0.0, -0.005, 0.0);
  c.x = c.x - clamp(floor(c.x / 0.12 + 0.5), -9.0, 9.0) * 0.12;
  c.z = abs(c.z) - 0.92;
  float caps = sdR(c, vec3(0.03, 0.02, 0.02), 0.008);
  float d = sub; float id = 1.0;
  if (frame < d) { d = frame; id = 5.0; }
  if (die < d) { d = die; id = 2.0; }
  if (hbm < d) { d = hbm; id = 3.0; }
  if (caps < d) { d = caps; id = 4.0; }
  return vec2(d, id);
}

vec3 nrm(vec3 p){ vec2 e = vec2(0.0015, 0.0); return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x, map(p+e.yxy).x-map(p-e.yxy).x, map(p+e.yyx).x-map(p-e.yyx).x)); }
float shadow(vec3 ro, vec3 rd){ float r = 1.0, t = 0.02; for (int i = 0; i < 32; i++){ float h = map(ro + rd * t).x; r = min(r, 10.0 * h / t); t += clamp(h, 0.01, 0.2); if (r < 0.001 || t > 3.0) break; } return clamp(r, 0.0, 1.0); }
float ao(vec3 p, vec3 n){ float a = 0.0, s = 1.0; for (int i = 1; i < 5; i++){ float h = 0.03 * float(i); a += (h - map(p + n * h).x) * s; s *= 0.6; } return clamp(1.0 - 3.0 * a, 0.0, 1.0); }

vec3 render(vec2 uv){
  float ang = 0.6 + uTime * 0.08 + uTilt.x * 0.9;
  float el = 1.25 + uTilt.y * 0.6;
  vec3 ro = vec3(sin(ang) * 3.9, el * 1.25, cos(ang) * 3.9);
  vec3 ww = normalize(-ro), uu = normalize(cross(ww, vec3(0,1,0))), vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 2.5 * ww);

  vec3 col = uBg;
  float t = 0.0; vec2 h; bool hit = false;
  for (int i = 0; i < 110; i++){ h = map(ro + rd * t); if (h.x < 0.0008){ hit = true; break; } t += h.x; if (t > 8.0) break; }

  // floor glow from the die
  float fy = (-0.13 - ro.y) / rd.y;
  if (fy > 0.0 && (!hit || fy < t)) {
    vec3 fp = ro + rd * fy;
    float g = exp(-length(fp.xz - vec2(-0.12, 0.0)) * 1.6);
    col = mix(uBg, uAccent, g * (uDark > 0.5 ? 0.14 : 0.08));
  }
  if (!hit) return col;

  vec3 p = ro + rd * t, n = nrm(p);
  float id = h.y;
  vec3 L = normalize(vec3(-0.5, 0.9, 0.35));
  float dif = max(dot(n, L), 0.0) * shadow(p + n * 0.003, L);
  float occ = ao(p, n);
  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
  vec3 refl = reflect(rd, n);
  float spec = pow(max(dot(refl, L), 0.0), 48.0);
  float sky = 0.5 + 0.5 * refl.y;

  vec3 base; float rough = 0.6; vec3 emit = vec3(0.0);
  if (id == 1.0) {                 // green-black substrate with traces
    base = mix(vec3(0.05, 0.07, 0.06), vec3(0.09, 0.1, 0.09), step(0.5, fract((p.x - p.z) * 30.0)) * 0.4);
    float pads = step(1.22, abs(p.x)) + step(0.92, abs(p.z));
    base = mix(base, vec3(0.75, 0.6, 0.3), min(pads, 1.0) * step(0.5, fract((p.x + p.z) * 24.0)));
  } else if (id == 5.0) {          // nickel frame
    base = uMetal; rough = 0.25;
  } else if (id == 2.0) {          // silicon die with SM grid
    base = vec3(0.12, 0.13, 0.16); rough = 0.15;
    if (n.y > 0.9) {
      vec2 g = (p.xz - vec2(-0.12, 0.0)) / vec2(0.84, 0.92) * vec2(8.0, 9.0) + vec2(4.0, 4.5);
      vec2 gi = floor(g), gf = fract(g);
      float cell = step(0.08, gf.x) * step(0.08, gf.y) * step(gf.x, 0.92) * step(gf.y, 0.92);
      float hh = hash(gi);
      float wave = sin(uTime * 2.2 - length(gi - vec2(3.5, 4.0)) * 0.8 + hh * 3.0) * 0.5 + 0.5;
      float on = smoothstep(0.55, 0.75, wave) * cell;
      base = mix(base, vec3(0.2, 0.22, 0.26), cell * 0.6);
      emit = uAccent * on * 1.1;
    }
  } else if (id == 3.0) {          // HBM stacks: layered dies
    base = mix(vec3(0.16, 0.16, 0.18), vec3(0.24, 0.24, 0.27), step(0.5, fract(p.y * 110.0)));
    rough = 0.35;
  } else {                          // caps
    base = vec3(0.55, 0.5, 0.42); rough = 0.4;
  }

  vec3 lin = base * (0.18 * occ + 1.1 * dif) + emit;
  lin += mix(vec3(0.9), uAccent, 0.15) * spec * (1.0 - rough) * 1.4;
  lin += base * sky * 0.25 * occ;
  lin += fre * (1.0 - rough) * 0.25;
  col = mix(lin, col, 1.0 - exp(-0.02 * t * t));
  return col;
}

void main(){
  vec3 acc = vec3(0.0);
  // 2× supersampling for clean edges
  for (int k = 0; k < 2; k++){
    vec2 off = vec2(float(k) * 0.5, float(k) * 0.5) - 0.25;
    vec2 uv = (gl_FragCoord.xy + off - 0.5 * uRes) / uRes.y;
    acc += render(uv);
  }
  acc *= 0.5;
  acc = pow(acc, vec3(0.92));
  o = vec4(acc, 1.0);
}`;

function cssColor(el: Element, name: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  el.appendChild(probe);
  const rgb = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  probe.remove();
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

export function mountGpu3d(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", { antialias: false });
  if (!gl) return null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, "p");
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);

  const colors = () => {
    const host = canvas.parentElement!;
    gl.uniform3fv(U("uBg"), cssColor(host, "--surface"));
    gl.uniform3fv(U("uAccent"), cssColor(host, "--accent"));
    gl.uniform3fv(U("uMetal"), [0.62, 0.63, 0.66]);
    const bg = cssColor(host, "--bg");
    gl.uniform1f(U("uDark"), bg[0] + bg[1] + bg[2] < 1.2 ? 1 : 0);
  };
  const resize = () => {
    // render at reduced resolution: raymarching is the expensive part
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * scale));
    canvas.height = Math.max(1, Math.round(r.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U("uRes"), canvas.width, canvas.height);
  };
  colors();
  resize();
  new ResizeObserver(resize).observe(canvas);
  new MutationObserver(colors).observe(document.documentElement, { attributes: true });

  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  canvas.parentElement!.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.8;
    tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.5;
  });
  canvas.parentElement!.addEventListener("pointerleave", () => { tilt.tx = 0; tilt.ty = 0; });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  const t0 = performance.now();
  const frame = (now: number) => {
    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;
    gl.uniform1f(U("uTime"), reduced ? 4 : (now - t0) / 1000);
    gl.uniform2f(U("uTilt"), tilt.x, tilt.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (visible && !document.hidden) frame(now);
  };
  if (reduced) frame(t0);
  else requestAnimationFrame(loop);
  canvas.dataset.ready = "true";
  return { refresh: colors };
}

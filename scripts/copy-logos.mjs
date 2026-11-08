// Copies original vendor logos into src/assets/logos/ so the site never hotlinks.
// Sources: devicon (MIT) for full-colour originals, simple-icons (CC0) where devicon
// has none; simple-icons marks are filled with their official brand hex.
// Run: node scripts/copy-logos.mjs
import fs from "node:fs";
import path from "node:path";

const out = "src/assets/logos";
fs.mkdirSync(out, { recursive: true });

const dev = (slug, file = `${slug}-original.svg`) => ({ from: `node_modules/devicon/icons/${slug}/${file}` });
const si = (slug) => ({ si: slug });

export const LOGOS = {
  aws: dev("amazonwebservices"),
  azure: dev("azure"),
  gcp: dev("googlecloud"),
  kubernetes: dev("kubernetes"),
  openshift: si("redhatopenshift"),
  docker: dev("docker"),
  terraform: dev("terraform"),
  ansible: dev("ansible"),
  jenkins: dev("jenkins"),
  "github-actions": dev("githubactions"),
  argocd: dev("argocd"),
  helm: dev("helm"),
  istio: dev("istio"),
  prometheus: dev("prometheus"),
  grafana: dev("grafana"),
  elasticsearch: dev("elasticsearch"),
  kibana: dev("kibana"),
  vault: dev("vault"),
  trivy: si("trivy"),
  sonarqube: dev("sonarqube"),
  openstack: dev("openstack"),
  ceph: dev("ceph"),
  redhat: dev("redhat"),
  cloudera: si("cloudera"),
  hadoop: dev("hadoop"),
  spark: dev("apachespark"),
  kafka: dev("apachekafka"),
  cassandra: dev("cassandra"),
  postgresql: dev("postgresql"),
  redis: dev("redis"),
  linux: dev("linux"),
  ubuntu: dev("ubuntu"),
  nginx: dev("nginx"),
  python: dev("python"),
  ollama: dev("ollama"),
};

const INK_FOLLOWS_THEME = new Set(["aws", "ollama", "kafka", "sonarqube", "openstack"]);

const siData = JSON.parse(fs.readFileSync("node_modules/simple-icons/data/simple-icons.json", "utf8"));
const siList = Array.isArray(siData) ? siData : siData.icons;
const hexFor = (slug) => {
  const hit = siList.find((i) => (i.slug ?? i.title.toLowerCase().replace(/[^a-z0-9]/g, "")) === slug);
  return hit ? `#${hit.hex}` : "#888888";
};

for (const [name, src] of Object.entries(LOGOS)) {
  let svg;
  if (src.from) svg = fs.readFileSync(src.from, "utf8");
  else {
    const raw = fs.readFileSync(`node_modules/simple-icons/icons/${src.si}.svg`, "utf8");
    svg = raw.replace("<svg ", `<svg fill="${hexFor(src.si)}" `);
  }
  // ids must stay unique once several SVGs are inlined in one page
  svg = svg
    .replace(/<\?xml[^>]*>/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/id="([^"]+)"/g, `id="${name}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${name}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${name}-$1"`);
  // near-black ink follows the theme so the mark stays legible on dark backgrounds
  if (INK_FOLLOWS_THEME.has(name)) {
    svg = svg.replace(/#(?:[0-2][0-9a-f]{5}|[0-2]{3})\b/gi, "currentColor");
  }
  fs.writeFileSync(path.join(out, `${name}.svg`), svg.trim() + "\n");
}
console.log(`copied ${Object.keys(LOGOS).length} logos to ${out}`);

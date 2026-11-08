// Logo wall data. Files live in src/assets/logos (scripts/copy-logos.mjs).
const svgs = import.meta.glob<string>("../assets/logos/*.svg", { query: "?raw", import: "default", eager: true });

export const logoSvg = (key: string) => {
  const raw = svgs[`../assets/logos/${key}.svg`];
  if (!raw) throw new Error(`missing logo ${key}`);
  return raw.replace(/<svg\b/, '<svg aria-hidden="true" focusable="false" class="h-full w-full"').replace(/<title>[\s\S]*?<\/title>/, "");
};

export const logoGroups: { group: string; items: [key: string, name: string][] }[] = [
  { group: "Cloud", items: [["aws", "AWS"], ["azure", "Azure"], ["gcp", "Google Cloud"], ["openstack", "OpenStack"]] },
  {
    group: "Containers",
    items: [["kubernetes", "Kubernetes"], ["openshift", "OpenShift"], ["docker", "Docker"], ["helm", "Helm"], ["istio", "Istio"], ["argocd", "Argo CD"]],
  },
  {
    group: "IaC & delivery",
    items: [["terraform", "Terraform"], ["ansible", "Ansible"], ["jenkins", "Jenkins"], ["github-actions", "GitHub Actions"]],
  },
  {
    group: "Observability",
    items: [["prometheus", "Prometheus"], ["grafana", "Grafana"], ["elasticsearch", "Elasticsearch"], ["kibana", "Kibana"]],
  },
  { group: "Security", items: [["vault", "Vault"], ["trivy", "Trivy"], ["sonarqube", "SonarQube"], ["redhat", "Red Hat"]] },
  {
    group: "Data & storage",
    items: [["cloudera", "Cloudera"], ["hadoop", "Hadoop"], ["spark", "Spark"], ["kafka", "Kafka"], ["cassandra", "Cassandra"], ["ceph", "Ceph"], ["postgresql", "PostgreSQL"], ["redis", "Redis"]],
  },
  { group: "Runtime & AI", items: [["linux", "Linux"], ["ubuntu", "Ubuntu"], ["nginx", "NGINX"], ["python", "Python"], ["ollama", "Ollama"]] },
];

export const marquee = logoGroups.flatMap((g) => g.items);

// Logo wall data. Files are served from /logos (scripts/copy-logos.mjs copies the
// original vendor marks there) so they are cached once instead of inlined per use.
export const logoUrl = (key: string) => `${import.meta.env.BASE_URL}logos/${key}.svg`;

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

export const logoName = Object.fromEntries(logoGroups.flatMap((g) => g.items));
export const marquee = logoGroups.flatMap((g) => g.items);

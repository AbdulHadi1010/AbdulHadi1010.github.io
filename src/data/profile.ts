// All site copy lives here. Edit this file to update the site.
// Facts come from github.com/AbdulHadi1010, its repos, and medium.com/@abdul-hadi.

export const profile = {
  name: "Abdul Hadi",
  role: "Cloud, DevOps & AI infrastructure engineer",
  title: "Solutions Architect at SazebTech Consulting",
  location: "Pakistan",
  timezone: "Asia/Karachi",
  links: {
    github: "https://github.com/AbdulHadi1010",
    linkedin: "https://www.linkedin.com/in/abdulhadi-cloud/",
    medium: "https://medium.com/@abdul-hadi",
    youtube: "https://www.youtube.com/@KernelfulCloud",
  },
  // Rotating word in the hero headline: "I build infrastructure for ___"
  rotating: ["Kubernetes", "LLM inference", "private clouds", "CI/CD", "zero-trust"],
  intro:
    "I design, build and harden the platforms that apps and models run on: Kubernetes clusters, AWS and Azure accounts, private clouds on bare metal, and the pipelines that ship to them.",
};

export const stats = [
  { value: "127k", label: "IOPS on EKS storage, up from 1,500" },
  { value: "10.8×", label: "faster local LLM tokens on AWS CPUs" },
  { value: "18", label: "Kubernetes security cases in my research" },
  { value: "CKA", label: "Certified Kubernetes Administrator" },
];

export type Project = {
  slug: string;
  kind: string;
  year: string;
  title: string;
  summary: string;
  outcome: string;
  stack: string[];
  href: string;
  logos: string[]; // keys from src/assets/logos, shown as the card badge
  diagram: string[]; // tiny ASCII architecture, one line per row
};

export const projects: Project[] = [
  {
    slug: "secure-but-broken",
    logos: ["kubernetes", "aws", "terraform"],
    kind: "Research",
    year: "2026",
    title: "Secure but Broken?",
    summary:
      "Do LLM-written fixes for Kubernetes security misconfigurations still work once deployed? Every repair is applied to a fresh cluster and has to pass seven gates: scanner rules, no new findings, server-side dry run, readiness, real user journeys, a load test against a measured baseline, and the original security intent checked by policy and a runtime probe.",
    outcome: "Pre-registered protocol, 18 cases, full replication package with DOI.",
    stack: ["Kubernetes", "Python", "Terraform", "Amazon Bedrock", "EKS", "DynamoDB"],
    href: "https://github.com/AbdulHadi1010/secure-but-broken",
    diagram: [
      "case ─▶ injector ─▶ LLM repair ─▶ fresh cluster",
      "                          │",
      "   7 gates ◀──────────────┘",
      "   scan · diff · dry-run · ready",
      "   journeys · load · intent",
    ],
  },
  {
    slug: "eks-storage",
    logos: ["aws", "kubernetes"],
    kind: "Production",
    year: "2025",
    title: "EKS storage, 1,500 → 127,000 IOPS",
    summary:
      "Pods were slow while CPU and memory sat idle: the disk was the bottleneck. I ran a head-to-head on EKS between gp3 EBS on m5.large and local NVMe on a tainted i4i.xlarge node group, then wrote down the pitfalls so the next team skips them.",
    outcome: "83× more IOPS, 95× lower latency.",
    stack: ["AWS EKS", "EBS CSI", "i4i NVMe", "Taints & tolerations"],
    href: "https://medium.com/@abdul-hadi/from-1-500-to-127-000-iops-our-journey-with-aws-eks-storage-7193c63ec5b3",
    diagram: [
      "m5.large  ─▶ gp3 EBS     1,500 IOPS",
      "i4i.xlarge ─▶ local NVMe  127,000 IOPS",
    ],
  },
  {
    slug: "llm-on-cpu",
    logos: ["aws", "ollama", "linux"],
    kind: "AI infra",
    year: "2025",
    title: "Local LLMs on AWS CPU instances",
    summary:
      "Can a 7B model act as a senior sysadmin bot on a 4 vCPU m5.xlarge with no GPU? I benchmarked Mistral 7B and DeepSeek 7B on stock Ollama with forced cold starts, then rebuilt the runtime from source for the CPU it actually runs on.",
    outcome: "2.5 → 27 tokens per second.",
    stack: ["EC2 m5.xlarge", "Ollama", "Mistral 7B", "Python benchmarks"],
    href: "https://medium.com/@abdul-hadi/from-2-5-t-s-to-27-t-s-optimizing-local-llms-on-aws-cpu-instances-a4045158e816",
    diagram: [
      "stock Ollama        2.5 t/s",
      "built for the CPU   27  t/s",
    ],
  },
  {
    slug: "study-assistant",
    logos: ["aws", "python"],
    kind: "Workshop",
    year: "2026",
    title: "Serverless AI study assistant",
    summary:
      "An agent on Amazon Bedrock (Nova Pro, Converse API tool loop) that stores courses in DynamoDB and manages a real Todoist list. Built as a hands-on workshop for first and second year CS students, with a least-privilege IAM policy and tests for every blank.",
    outcome: "Runs end to end with one IAM user and one stack.",
    stack: ["Amazon Bedrock", "Lambda", "DynamoDB", "Streamlit", "Python"],
    href: "https://github.com/AbdulHadi1010/study-assistant",
    diagram: [
      "Streamlit ─▶ Lambda ─▶ Bedrock (Nova Pro)",
      "                │          │ tool calls",
      "            DynamoDB    Todoist API",
    ],
  },
  {
    slug: "k8s-ansible",
    logos: ["ansible", "kubernetes", "ubuntu"],
    kind: "Automation",
    year: "2025",
    title: "Kubernetes clusters from bare VMs",
    summary:
      "Role-based Ansible playbooks that turn fresh Ubuntu machines into a working kubeadm cluster, tested with Molecule against Docker, Vagrant and EC2.",
    outcome: "Same cluster, three environments, one command.",
    stack: ["Ansible", "kubeadm", "Molecule", "Vagrant", "EC2"],
    href: "https://github.com/AbdulHadi1010/kubernetes-setup-ansible",
    diagram: [
      "inventory ─▶ common ─▶ control-plane ─▶ workers",
      "molecule:  docker · vagrant · ec2",
    ],
  },
];

export const stack = [
  { group: "Orchestration", items: ["Kubernetes", "Docker", "Istio", "ArgoCD"] },
  { group: "Cloud", items: ["AWS", "Azure", "GCP", "OpenStack", "Ceph"] },
  { group: "IaC & config", items: ["Terraform", "Ansible", "Molecule"] },
  { group: "Delivery", items: ["GitHub Actions", "Jenkins", "OIDC federation"] },
  { group: "Observability", items: ["Prometheus", "Grafana", "Elasticsearch"] },
  { group: "Security", items: ["Vault", "Trivy", "SonarQube", "CipherTrust"] },
  { group: "Data & AI", items: ["Bedrock", "Ollama", "PostgreSQL / Patroni", "Kafka"] },
];

// Rendered as a deploy log. Newest first.
export const log = [
  {
    tag: "now",
    title: "Solutions Architect",
    org: "SazebTech Consulting",
    detail:
      "Cloud migrations, Kubernetes platforms and private cloud builds for enterprise clients: HA PostgreSQL with Patroni, Ceph object storage behind HAProxy and Keepalived, Thales CipherTrust key management.",
  },
  {
    tag: "2026",
    title: "Author, Secure but Broken?",
    org: "Independent research",
    detail: "Deployment-validated evaluation of LLM security repairs for Kubernetes. Paper, protocol and data are public.",
  },
  {
    tag: "2026",
    title: "Workshop lead",
    org: "AI on AWS for CS students",
    detail: "Taught students to ship a Bedrock agent on Lambda and DynamoDB from an empty AWS account.",
  },
  {
    tag: "cert",
    title: "CKA · AWS Solutions Architect · Azure Fundamentals",
    org: "Certifications",
    detail: "Published a CKA practice question set and an exam guide on Medium.",
  },
  {
    tag: "2023",
    title: "Speed Coding winner",
    org: "PUCON '23",
    detail: "Moved fast. Didn't break things.",
  },
  {
    tag: "edu",
    title: "BS Computer Science",
    org: "University of Central Punjab",
    detail: "Started with React and React Native, ended up in infrastructure.",
  },
];

export const writing = [
  { date: "2026-04-23", title: "Connect GitHub Actions to Azure using OIDC (no passwords)", href: "https://medium.com/@abdul-hadi/connect-github-actions-to-azure-using-oidc-no-passwords-7d67c0876aaa" },
  { date: "2025-12-11", title: "From 2.5 t/s to 27 t/s: optimizing local LLMs on AWS CPU instances", href: "https://medium.com/@abdul-hadi/from-2-5-t-s-to-27-t-s-optimizing-local-llms-on-aws-cpu-instances-a4045158e816" },
  { date: "2025-11-19", title: "Your first CI/CD pipeline in 5 minutes: GitHub Actions to AWS Lightsail", href: "https://medium.com/@abdul-hadi/your-first-ci-cd-pipeline-in-5-minutes-github-actions-to-aws-lightsail-aeb200093934" },
  { date: "2025-11-13", title: "From 1,500 to 127,000 IOPS: our journey with AWS EKS storage", href: "https://medium.com/@abdul-hadi/from-1-500-to-127-000-iops-our-journey-with-aws-eks-storage-7193c63ec5b3" },
  { date: "2025-07-04", title: "High-availability Ceph Object Gateway ingress with HAProxy and Keepalived", href: "https://medium.com/@abdul-hadi/high-availability-ceph-object-gateway-ingress-with-haproxy-and-keepalived-6f3bc1378b75" },
  { date: "2025-07-04", title: "Deploying a highly available PostgreSQL cluster on Linux with Patroni", href: "https://medium.com/@abdul-hadi/deploying-a-highly-available-postgresql-cluster-on-linux-with-patroni-b8b503552f7c" },
  { date: "2025-04-11", title: "Thales CipherTrust Manager on a private cloud", href: "https://medium.com/@abdul-hadi/thales-ciphertrust-manager-installation-on-private-cloud-guide-2025-898afb7536d3" },
  { date: "2025-04-10", title: "IBM Storage Ceph installation guide", href: "https://medium.com/@abdul-hadi/ibmibm-storage-ceph-installation-guide-2025-a4943660740a" },
];

// From blog.stryxon.com/projects, filtered to cloud, Kubernetes, containers,
// security and Cloudera work. Shown as a compact index under the featured work.
export const moreProjects: { group: string; items: { title: string; detail: string; tags: string[]; logos: string[] }[] }[] = [
  {
    group: "Kubernetes & containers",
    items: [
      { title: "Multi-node Kubernetes cluster", detail: "Fault-tolerant kubeadm cluster with RBAC, persistent storage and Prometheus/Grafana observability.", tags: ["kubeadm", "RBAC", "Prometheus"], logos: ["kubernetes", "prometheus", "grafana"] },
      { title: "OpenShift for enterprise apps", detail: "Red Hat OpenShift clusters for secure multi-tenant workloads, with autoscaling and strict security contexts.", tags: ["OpenShift", "SCC", "Multi-tenant"], logos: ["openshift", "redhat"] },
      { title: "Cluster bootstrapping with Ansible", detail: "Playbooks that provision networking, security and monitoring the same way on every node. Setup time down 80%.", tags: ["Ansible", "Terraform"], logos: ["ansible", "terraform", "kubernetes"] },
      { title: "Log analytics on Kubernetes", detail: "Elasticsearch, Fluentd and Kibana on Kubernetes, with Grafana dashboards for cluster health.", tags: ["EFK", "Grafana"], logos: ["elasticsearch", "kibana", "grafana"] },
      { title: "Cassandra & Spark on Kubernetes", detail: "Cassandra StatefulSets and Spark workers with tuned resource limits and HDFS integration.", tags: ["StatefulSets", "Spark"], logos: ["cassandra", "spark", "kubernetes"] },
    ],
  },
  {
    group: "Cloud, DevOps & security",
    items: [
      { title: "DeepSeek & Mistral on AWS", detail: "Private LLM hosting on c5.2xlarge (CPU) and g4dn.xlarge (GPU), with Ollama compiled for the host CPU.", tags: ["EC2", "g4dn", "Ollama"], logos: ["aws", "ollama"] },
      { title: "Jenkins CI/CD with Docker", detail: "Automated test and release pipeline with Jenkins, Docker and GitHub, for consistent production builds.", tags: ["Jenkins", "Docker"], logos: ["jenkins", "docker", "github-actions"] },
      { title: "Data security with IBM Guardium", detail: "Database activity monitoring across an enterprise fleet: real-time audit for GDPR and PCI DSS, and masking with no app changes.", tags: ["DAM", "GDPR", "PCI DSS"], logos: ["linux", "postgresql"] },
    ],
  },
  {
    group: "Cloudera & big data",
    items: [
      { title: "Cloudera CDP health check & tuning", detail: "Diagnosed HDFS and YARN bottlenecks on CDP clusters and tuned them for stability and faster queries.", tags: ["CDP", "HDFS", "YARN"], logos: ["cloudera", "hadoop"] },
      { title: "Cloudera upgrade on Azure Data Lake", detail: "Migrated and upgraded Cloudera workloads to Azure Data Lake under enterprise governance.", tags: ["Azure", "ADLS"], logos: ["cloudera", "azure"] },
      { title: "IBM Storage Ceph", detail: "Multi-node Ceph for block and object storage, CRUSH maps tuned for throughput, 99.99% uptime.", tags: ["Ceph", "CRUSH", "HA"], logos: ["ceph", "redhat"] },
    ],
  },
];

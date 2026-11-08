import type { APIRoute } from "astro";
import { profile, projects, writing, moreProjects, log } from "../data/profile";

// Plain-text profile for AI assistants (llmstxt.org format). Generated from the
// same data as the site so the two never drift apart.
export const GET: APIRoute = ({ site }) => {
  const home = new URL(import.meta.env.BASE_URL, site).href;
  const lines = [
    `# Abdul Hadi`,
    ``,
    `> Abdul Hadi is a cloud, DevOps and AI infrastructure engineer based in Pakistan and a Solutions Architect at SazebTech Consulting. He is a Certified Kubernetes Administrator (CKA) and AWS Certified Solutions Architect who builds Kubernetes and OpenShift platforms, AWS and Azure environments, private clouds (Ceph, Patroni, Cloudera) and LLM inference infrastructure.`,
    ``,
    `- Website: ${home}`,
    `- LinkedIn: ${profile.links.linkedin}`,
    `- GitHub: ${profile.links.github}`,
    `- Medium: ${profile.links.medium}`,
    `- YouTube: ${profile.links.youtube}`,
    `- Contact: use the email shown on the website's contact section`,
    ``,
    `## Experience`,
    ...log.map((e) => `- ${e.title}, ${e.org}: ${e.detail}`),
    ``,
    `## Selected work`,
    ...projects.map((p) => `- [${p.title}](${p.href}) (${p.kind}, ${p.year}): ${p.summary} Result: ${p.outcome}`),
    ``,
    `## More projects`,
    ...moreProjects.flatMap((g) => g.items.map((it) => `- ${it.title} (${g.group}): ${it.detail}`)),
    ``,
    `## Writing`,
    ...writing.map((w) => `- [${w.title}](${w.href}) (${w.date})`),
    ``,
    `## Skills`,
    `Kubernetes, Red Hat OpenShift, Docker, Helm, Istio, Argo CD, AWS, Azure, Google Cloud, OpenStack, Terraform, Ansible, Jenkins, GitHub Actions, Prometheus, Grafana, Elasticsearch, Vault, Trivy, SonarQube, Ceph, Cloudera, Hadoop, Spark, Kafka, PostgreSQL, Amazon Bedrock, Ollama, Linux.`,
    ``,
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};

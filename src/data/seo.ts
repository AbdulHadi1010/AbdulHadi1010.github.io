// Structured data for search engines and AI assistants.
// One linked graph: WebSite -> ProfilePage -> Person, plus the work that Person
// authored. Everything here is also visible on the page, as Google requires.
import { profile, projects, writing } from "./profile";

export const AVATAR = "https://avatars.githubusercontent.com/u/68527943?v=4";

export function personGraph(siteUrl: string) {
  const home = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const personId = `${home}#person`;

  const person = {
    "@type": "Person",
    "@id": personId,
    name: profile.name,
    givenName: "Abdul",
    familyName: "Hadi",
    url: home,
    image: AVATAR,
    jobTitle: profile.title.replace(/ at .*/, ""),
    description:
      "Abdul Hadi is a cloud, DevOps and AI infrastructure engineer and Solutions Architect at SazebTech Consulting in Pakistan. He is a Certified Kubernetes Administrator (CKA) and AWS Solutions Architect who builds Kubernetes platforms, AWS and Azure environments, private clouds and LLM inference infrastructure.",
    worksFor: { "@type": "Organization", name: "SazebTech Consulting" },
    alumniOf: { "@type": "CollegeOrUniversity", name: "University of Central Punjab" },
    nationality: { "@type": "Country", name: "Pakistan" },
    homeLocation: { "@type": "Country", name: "Pakistan" },
    knowsLanguage: ["en", "ur"],
    hasOccupation: {
      "@type": "Occupation",
      name: "Cloud and DevOps Engineer",
      occupationLocation: { "@type": "Country", name: "Pakistan" },
      skills: "Kubernetes, AWS, Azure, Terraform, Ansible, OpenShift, Ceph, Cloudera, CI/CD, DevSecOps, LLM inference",
    },
    hasCredential: [
      { "@type": "EducationalOccupationalCredential", name: "Certified Kubernetes Administrator (CKA)", credentialCategory: "certification", recognizedBy: { "@type": "Organization", name: "The Linux Foundation / CNCF" } },
      { "@type": "EducationalOccupationalCredential", name: "AWS Certified Solutions Architect", credentialCategory: "certification", recognizedBy: { "@type": "Organization", name: "Amazon Web Services" } },
      { "@type": "EducationalOccupationalCredential", name: "Microsoft Certified: Azure Fundamentals", credentialCategory: "certification", recognizedBy: { "@type": "Organization", name: "Microsoft" } },
    ],
    award: ["Speed Coding winner, PUCON '23"],
    knowsAbout: [
      "Kubernetes", "Amazon Web Services", "Microsoft Azure", "Google Cloud", "Terraform", "Ansible",
      "Red Hat OpenShift", "Ceph", "Cloudera", "DevSecOps", "CI/CD", "GitHub Actions", "Prometheus",
      "Grafana", "LLM inference", "Amazon Bedrock", "Private cloud", "PostgreSQL high availability",
    ],
    sameAs: Object.values(profile.links),
  };

  const paper = {
    "@type": "ScholarlyArticle",
    "@id": `${home}#secure-but-broken`,
    headline: "Secure but Broken? Deployment-Validated Evaluation of LLM Security Repairs for Kubernetes",
    author: { "@id": personId },
    datePublished: "2026",
    url: "https://github.com/AbdulHadi1010/secure-but-broken",
    sameAs: "https://doi.org/10.5281/zenodo.23600348",
    about: ["Kubernetes security", "Large language models", "Misconfiguration repair"],
  };

  const code = projects
    .filter((p) => p.href.includes("github.com"))
    .map((p) => ({
      "@type": "SoftwareSourceCode",
      name: p.title,
      description: p.summary,
      codeRepository: p.href,
      author: { "@id": personId },
    }));

  const posts = writing.map((w) => ({
    "@type": "BlogPosting",
    headline: w.title,
    url: w.href,
    datePublished: w.date,
    author: { "@id": personId },
    publisher: { "@type": "Organization", name: "Medium" },
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${home}#website`, url: home, name: profile.name, inLanguage: "en", publisher: { "@id": personId } },
      {
        "@type": "ProfilePage",
        "@id": `${home}#profile`,
        url: home,
        name: `${profile.name}, cloud, DevOps and AI infrastructure engineer`,
        isPartOf: { "@id": `${home}#website` },
        mainEntity: { "@id": personId },
        dateModified: new Date().toISOString().slice(0, 10),
      },
      person,
      paper,
      ...code,
      ...posts,
    ],
  };
}

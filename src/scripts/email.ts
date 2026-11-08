// The email address never appears in the HTML, the JSON data or the source:
// it is stored XOR-encoded and reversed, and decoded in the visitor's browser.
// Harvesters that read raw HTML (the usual spam scrapers) get nothing; people
// see it, can copy it, and can click it.
//
// Encode a new address with:
//   node -e 'const e="you@x.com";console.log([...e].map(c=>(c.charCodeAt(0)^0x5a).toString(16).padStart(2,"0")).reverse().join(""))'

const CIPHER = "3735397436333b373d1a3d34332e362f2934353974333e3b32362f3e383b";

export function email(): string {
  return (CIPHER.match(/../g) ?? [])
    .reverse()
    .map((h) => String.fromCharCode(parseInt(h, 16) ^ 0x5a))
    .join("");
}

export function initEmail() {
  const addr = email();

  // visible text
  document.querySelectorAll<HTMLElement>("[data-email]").forEach((el) => (el.textContent = addr));

  // mailto is only attached once a person interacts with the link
  document.querySelectorAll<HTMLAnchorElement>("[data-email-href]").forEach((a) => {
    const arm = () => { a.href = `mailto:${addr}`; };
    ["pointerenter", "focus", "touchstart"].forEach((ev) => a.addEventListener(ev, arm, { once: true, passive: true }));
    a.addEventListener("click", (e) => { if (!a.getAttribute("href")?.startsWith("mailto:")) { e.preventDefault(); e.stopPropagation(); arm(); window.location.href = a.href; } });
  });

  // copy buttons
  document.querySelectorAll<HTMLButtonElement>("[data-copy-email]").forEach((b) => {
    const label = b.querySelector<HTMLElement>("[data-copy-label]");
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(addr);
        if (label) { const prev = label.textContent; label.textContent = "Copied"; setTimeout(() => (label.textContent = prev), 1600); }
      } catch {
        window.location.href = `mailto:${addr}`;
      }
    });
  });
}

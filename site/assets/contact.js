// Spam protection: the e-mail address never appears in the HTML source.
// It is assembled only when someone hovers, focuses or clicks a [data-contact] link,
// or rendered as text into [data-contact-show] elements (e.g. legal notice).

const PARTS = ["eb", "eb.tkiden"]; // reversed on purpose
const address = () => PARTS.map((p) => [...p].reverse().join("")).join("@");

function arm(link) {
  const q = new URLSearchParams();
  if (link.dataset.subject) q.set("subject", link.dataset.subject);
  if (link.dataset.body) q.set("body", link.dataset.body);
  // URLSearchParams encodes spaces as "+", mail clients expect "%20"
  const query = q.toString().replace(/\+/g, "%20");
  link.href = `mailto:${address()}${query ? `?${query}` : ""}`;
}

export function initContact(root = document) {
  for (const type of ["mouseover", "focusin", "click", "touchstart"]) {
    root.addEventListener(type, (e) => {
      const link = e.target.closest?.("a[data-contact]");
      if (link) arm(link);
    }, { passive: true });
  }
  root.querySelectorAll("[data-contact-show]").forEach((el) => (el.textContent = address()));
}

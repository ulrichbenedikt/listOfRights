#!/usr/bin/env node
// Validates data/rules.json and builds the static site into dist/.
// Usage: node scripts/build.mjs [--check]   (BUILD_DATE=YYYY-MM-DD and SITE_URL optional)

import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeStatus, STATUSES } from "../site/assets/logic.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const checkOnly = process.argv.includes("--check");
const today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const siteUrl = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) || "http://localhost:8080").replace(/\/$/, "");

const SITE_NAME = "ERP-Rechtsradar";
const DISCLAIMER = {
  de: "Diese Liste wird mit Hilfe von KI erstellt und monatlich aktualisiert. Die Richtigkeit, Vollständigkeit und Aktualität kann nicht garantiert werden. Sie stellt keine Rechtsberatung dar und ersetzt keine Prüfung durch Anwältin/Anwalt oder Steuerberatung.",
  en: "This list is created with the help of AI and updated monthly. Accuracy, completeness and timeliness cannot be guaranteed. It does not constitute legal advice and does not replace review by a lawyer or tax advisor."
};

const data = JSON.parse(readFileSync(join(root, "data/rules.json"), "utf8"));
const taxonomy = JSON.parse(readFileSync(join(root, "data/taxonomy.json"), "utf8"));

// ---------- validation ----------
const errors = [];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED = new Set(["id", "law", "norm", "title", "url", "urlEn", "jurisdiction", "categories", "summary", "softwareRequirements", "appliesTo", "validFrom", "transitionUntil", "statusOverride", "stage", "milestones", "sources", "lastVerified", "reviewedBy"]);
const METRICS = new Set(Object.keys(taxonomy.metrics));
const ids = new Set();

const i18n = (v, path) => {
  if (!v || typeof v.de !== "string" || typeof v.en !== "string" || !v.de.trim() || !v.en.trim()) errors.push(`${path}: braucht nicht-leere Texte "de" und "en"`);
};
const url = (v, path) => {
  if (typeof v !== "string" || !/^https:\/\//.test(v)) errors.push(`${path}: muss eine https-URL sein`);
};
const date = (v, path) => {
  if (typeof v !== "string" || !DATE.test(v) || Number.isNaN(Date.parse(v))) errors.push(`${path}: ungültiges Datum "${v}"`);
};
const conditions = (list, path) => {
  if (!Array.isArray(list) || !list.length) return errors.push(`${path}: conditions fehlen`);
  list.forEach((c, i) => {
    if (!METRICS.has(c.metric)) errors.push(`${path}[${i}]: unbekannte metric "${c.metric}"`);
    if (c.min === undefined && c.max === undefined) errors.push(`${path}[${i}]: min oder max nötig`);
  });
};

if (!/^\d{4}-\d{2}$/.test(data.dataVersion)) errors.push("dataVersion: Format YYYY-MM");
date(data.lastUpdated, "lastUpdated");

data.rules.forEach((r, idx) => {
  const p = `rules[${idx}] (${r.id})`;
  for (const k of Object.keys(r)) if (!ALLOWED.has(k)) errors.push(`${p}: unbekanntes Feld "${k}"`);
  if (!/^(de|eu)-[a-z0-9-]+$/.test(r.id || "")) errors.push(`${p}: id muss ^(de|eu)-[a-z0-9-]+$ entsprechen`);
  if (ids.has(r.id)) errors.push(`${p}: doppelte id`);
  ids.add(r.id);
  for (const k of ["law", "norm"]) if (typeof r[k] !== "string" || !r[k]) errors.push(`${p}: ${k} fehlt`);
  i18n(r.title, `${p}.title`);
  i18n(r.summary, `${p}.summary`);
  url(r.url, `${p}.url`);
  if (r.urlEn !== undefined) url(r.urlEn, `${p}.urlEn`);
  if (!["DE", "EU"].includes(r.jurisdiction)) errors.push(`${p}: jurisdiction muss DE oder EU sein`);
  if (!Array.isArray(r.categories) || !r.categories.length) errors.push(`${p}: categories fehlen`);
  for (const c of r.categories || []) if (!taxonomy.categories[c]) errors.push(`${p}: unbekannte Kategorie "${c}"`);
  const sr = r.softwareRequirements;
  if (!sr || !Array.isArray(sr.de) || !Array.isArray(sr.en)) errors.push(`${p}.softwareRequirements: braucht Arrays "de" und "en"`);
  else if (sr.de.length !== sr.en.length) errors.push(`${p}.softwareRequirements: de/en unterschiedlich lang`);
  const a = r.appliesTo;
  if (!a) errors.push(`${p}: appliesTo fehlt`);
  else {
    i18n(a.text, `${p}.appliesTo.text`);
    for (const m of a.businessModels || []) if (!taxonomy.businessModels[m]) errors.push(`${p}: unbekanntes businessModel "${m}"`);
    for (const x of a.activities || []) if (!taxonomy.activities[x]) errors.push(`${p}: unbekannte activity "${x}"`);
    if (a.thresholds) {
      if (!["any", "all"].includes(a.thresholds.mode)) errors.push(`${p}.thresholds.mode: any|all`);
      conditions(a.thresholds.conditions, `${p}.thresholds.conditions`);
    }
    (a.exemptions || []).forEach((ex, i) => {
      conditions(ex.conditions, `${p}.exemptions[${i}].conditions`);
      i18n(ex.text, `${p}.exemptions[${i}].text`);
    });
  }
  if (r.validFrom !== null) date(r.validFrom, `${p}.validFrom`);
  if (r.validFrom === null && !r.statusOverride) errors.push(`${p}: validFrom null erfordert statusOverride`);
  if (r.transitionUntil !== undefined) date(r.transitionUntil, `${p}.transitionUntil`);
  if (r.statusOverride && !STATUSES.includes(r.statusOverride)) errors.push(`${p}: statusOverride ungültig`);
  if (r.stage) i18n(r.stage, `${p}.stage`);
  (r.milestones || []).forEach((m, i) => {
    date(m.date, `${p}.milestones[${i}].date`);
    i18n(m.label, `${p}.milestones[${i}].label`);
  });
  if (!Array.isArray(r.sources) || !r.sources.length) errors.push(`${p}: sources fehlen`);
  (r.sources || []).forEach((s, i) => url(s, `${p}.sources[${i}]`));
  date(r.lastVerified, `${p}.lastVerified`);
});

if (errors.length) {
  console.error(`✗ ${errors.length} Validierungsfehler:\n` + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ ${data.rules.length} Regeln valide`);
if (checkOnly) process.exit(0);

// ---------- build ----------
const rules = data.rules
  .map((r) => ({ ...r, status: computeStatus(r, today) }))
  .sort((a, b) => a.law.localeCompare(b.law, "de") || a.norm.localeCompare(b.norm, "de", { numeric: true }));

const meta = {
  name: SITE_NAME,
  url: siteUrl,
  dataVersion: data.dataVersion,
  lastUpdated: data.lastUpdated,
  statusComputedAt: today,
  generatedWithAI: true,
  disclaimer: DISCLAIMER,
  license: "Inhalte: CC BY 4.0. Gesetzestexte sind amtliche Werke (§ 5 UrhG).",
  statusLegend: {
    live: "In Kraft / in force",
    transition: "In Kraft mit laufender Übergangsfrist / in force, transition period running",
    planned: "Noch nicht anwendbar oder im Gesetzgebungsverfahren / not yet applicable or in legislative process"
  },
  schema: `${siteUrl}/schema.json`
};

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "site"), dist, { recursive: true });
cpSync(join(root, "data/schema.json"), join(dist, "schema.json"));
writeFileSync(join(dist, "rules.json"), JSON.stringify({ meta, taxonomy, rules }, null, 2));

const fmtDate = (d, lang) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { timeZone: "UTC" }) : "–");
const fmtNum = (n) => n.toLocaleString("de-DE");

function conditionText(c, lang) {
  const m = taxonomy.metrics[c.metric][lang];
  const parts = [];
  if (c.min !== undefined) parts.push(`≥ ${fmtNum(c.min)}`);
  if (c.max !== undefined) parts.push(`≤ ${fmtNum(c.max)}`);
  return `${m} ${parts.join(" & ")}`;
}

function markdown(lang) {
  const L = lang === "de"
    ? { title: `${SITE_NAME} – Rechtliche Regeln für ERP, CRM, E-Commerce, Buchhaltung & HR in Deutschland`, stand: "Stand", status: "Status", valid: "Gültig ab", transition: "Übergang bis", affected: "Betroffen", exemptions: "Ausnahmen", thresholds: "Schwellenwerte", activities: "Tätigkeiten", models: "Geschäftsmodell", req: "Anforderungen an Software", milestones: "Meilensteine", stage: "Verfahrensstand", sources: "Quellen", verified: "Zuletzt geprüft", link: "Norm", toc: "Kategorien" }
    : { title: `${SITE_NAME} – Legal rules for ERP, CRM, e-commerce, accounting & HR in Germany`, stand: "As of", status: "Status", valid: "Valid from", transition: "Transition until", affected: "Who is affected", exemptions: "Exemptions", thresholds: "Thresholds", activities: "Activities", models: "Business model", req: "Software requirements", milestones: "Milestones", stage: "Legislative stage", sources: "Sources", verified: "Last verified", link: "Provision", toc: "Categories" };
  const statusLabel = (s) => `${{ live: "🟢", transition: "🟠", planned: "⚪" }[s]} ${taxonomy.statuses[s][lang]}`;
  let out = `# ${L.title}\n\n> ⚠️ ${DISCLAIMER[lang]}\n\n${L.stand}: ${data.lastUpdated} · Version ${data.dataVersion} · ${rules.length} ${lang === "de" ? "Regeln" : "rules"} · JSON: ${siteUrl}/rules.json\n\n`;
  out += `## ${L.toc}\n\n` + Object.entries(taxonomy.categories).map(([k, v]) => `- ${v[lang]} (\`${k}\`)`).join("\n") + "\n\n---\n\n";
  for (const r of rules) {
    const a = r.appliesTo;
    out += `## ${r.law} ${r.norm} – ${r.title[lang]}\n\n`;
    out += `- **ID:** \`${r.id}\`\n- **${L.status}:** ${statusLabel(r.status)}\n- **${L.valid}:** ${fmtDate(r.validFrom, lang)}\n`;
    if (r.transitionUntil) out += `- **${L.transition}:** ${fmtDate(r.transitionUntil, lang)}\n`;
    if (r.stage) out += `- **${L.stage}:** ${r.stage[lang]}\n`;
    out += `- **${L.link}:** ${lang === "en" && r.urlEn ? r.urlEn : r.url}\n`;
    out += `- **${lang === "de" ? "Kategorien" : "Categories"}:** ${r.categories.map((c) => taxonomy.categories[c][lang]).join(", ")} · ${r.jurisdiction}\n\n`;
    out += `${r.summary[lang]}\n\n`;
    out += `**${L.affected}:** ${a.text[lang]}\n`;
    if (a.businessModels?.length) out += `- ${L.models}: ${a.businessModels.map((m) => m.toUpperCase()).join(", ")}\n`;
    if (a.activities?.length) out += `- ${L.activities}: ${a.activities.map((x) => taxonomy.activities[x][lang]).join("; ")}\n`;
    if (a.thresholds) out += `- ${L.thresholds} (${a.thresholds.mode === "any" ? (lang === "de" ? "eine davon" : "any of") : (lang === "de" ? "alle" : "all of")}): ${a.thresholds.conditions.map((c) => conditionText(c, lang)).join("; ")}\n`;
    for (const ex of a.exemptions || []) out += `- ${L.exemptions}: ${ex.text[lang]} (${ex.conditions.map((c) => conditionText(c, lang)).join(" & ")})\n`;
    out += "\n";
    if (r.softwareRequirements[lang].length) out += `**${L.req}:**\n${r.softwareRequirements[lang].map((s) => `- [ ] ${s}`).join("\n")}\n\n`;
    if (r.milestones?.length) out += `**${L.milestones}:**\n${r.milestones.map((m) => `- ${fmtDate(m.date, lang)}: ${m.label[lang]}`).join("\n")}\n\n`;
    out += `${L.sources}: ${r.sources.join(" · ")}  \n${L.verified}: ${r.lastVerified}\n\n---\n\n`;
  }
  return out;
}

writeFileSync(join(dist, "rules.md"), markdown("de"));
writeFileSync(join(dist, "rules.en.md"), markdown("en"));

writeFileSync(join(dist, "llms.txt"), `# ${SITE_NAME}

> Monthly updated, AI-generated list of German and EU legal rules relevant to ERP software: CRM & data protection, e-commerce, accounting & tax, invoicing, HR & payroll, inventory & products, IT security, AI and accessibility. Each rule includes the legal provision, a link, a plain-language summary, who is affected (thresholds, exemptions, business model, activities), validity dates, status (live / transition / planned) and a checklist of concrete software requirements.

IMPORTANT: ${DISCLAIMER.en}

Data version: ${data.dataVersion} · Last updated: ${data.lastUpdated} · Status computed: ${today}

## How to use this for compliance checks

1. Load ${siteUrl}/rules.json (full structured data, schema: ${siteUrl}/schema.json).
2. Filter rules by \`categories\` and by \`appliesTo\` (businessModels, activities, thresholds, exemptions) matching the software's context.
3. Use \`softwareRequirements\` as a checklist against the codebase. Treat \`status: "planned"\` as upcoming, \`"transition"\` as in force with a running grace period.
4. Always cite the rule \`id\` and the \`url\` of the provision. Recommend verification by a qualified professional.

## Data

- [rules.json](${siteUrl}/rules.json): all rules with metadata, taxonomy and computed status
- [rules.md](${siteUrl}/rules.md): all rules as Markdown (German)
- [rules.en.md](${siteUrl}/rules.en.md): all rules as Markdown (English)
- [schema.json](${siteUrl}/schema.json): JSON schema of a rule

## Categories

${Object.entries(taxonomy.categories).map(([k, v]) => `- \`${k}\`: ${v.en}`).join("\n")}
`);

console.log(`✓ Build nach dist/ (Status berechnet zum ${today})`);

import { computeStatus, evaluateApplicability } from "./logic.js";
import { initContact } from "./contact.js";

const UI = {
  de: {
    tagline: "Gesetze & Regeln für CRM, E-Commerce, Buchhaltung, HR und ERP in Deutschland – für Unternehmer filterbar, für KI maschinenlesbar.",
    disclaimerTitle: "Keine Rechtsberatung.",
    search: "Suchen, z. B. E-Rechnung, § 312k …",
    reset: "Filter zurücksetzen",
    categories: "Kategorien",
    status: "Status",
    jurisdiction: "Ebene",
    profileTitle: "Betroffenheits-Check",
    profileHint: "Welche Regeln betreffen mein Unternehmen?",
    businessModel: "Geschäftsmodell",
    activities: "Was trifft auf dein Unternehmen zu?",
    onlyRelevant: "Nur Regeln anzeigen, die mich (wahrscheinlich) betreffen",
    profileNote: "Grobe Vorfilterung anhand vereinfachter Schwellenwerte. Ersetzt keine rechtliche Prüfung. Eingaben bleiben in deinem Browser.",
    count: (n, t) => `${n} von ${t} Regeln`,
    validFrom: "Gültig ab",
    transitionUntil: "Übergang bis",
    open: "Zur Norm",
    affected: "Wer ist betroffen?",
    exemptions: "Ausnahmen",
    requirements: "Was muss Software leisten?",
    milestones: "Meilensteine",
    stage: "Verfahrensstand",
    sources: "Quellen",
    lastVerified: "Zuletzt geprüft",
    aiDraft: "KI-Entwurf",
    reviewed: "Fachlich geprüft",
    details: "Details",
    unknownDate: "noch offen",
    rel: { applies: "Betrifft dich", check: "Prüfen", exempt: "Ausgenommen", no: "Betrifft dich nicht" },
    empty: "Keine Regeln gefunden. Filter anpassen?",
    imprint: "Impressum",
    reportNav: "Gesetz melden",
    filters: "Filter",
    filterToggle: (n) => (n ? `Filter (${n})` : "Filter"),
    showResults: "Ergebnisse anzeigen",
    footer: (m) => `Keine Rechtsberatung · mit KI erstellt · Stand ${m.lastUpdated}`,
    reportRule: "Fehler melden",
    mailSubject: "ERP-Rechtsradar: Gesetz fehlt / Korrektur",
    mailBody: "Hallo,\n\nfolgendes Gesetz fehlt bzw. ist nicht korrekt:\n\nGesetz / Paragraph:\nLink zum Gesetz:\nBeschreibung:\n",
    mailRuleSubject: (r) => `ERP-Rechtsradar: Korrektur zu ${r.id}`,
    mailRuleBody: (r) => `Hallo,\n\nder Eintrag „${r.law} ${r.norm} – ${r.title.de}“ (ID ${r.id}) ist aus meiner Sicht nicht korrekt:\n\nWas ist falsch:\nLink zur Quelle:\n`,
    privacy: "Datenschutz",
    meta: (m) => `Datenstand ${m.lastUpdated} · Version ${m.dataVersion} · Status berechnet am ${m.statusComputedAt} · erstellt mit KI, monatlich aktualisiert`,
    num: { employees: "Mitarbeitende", revenue: "Jahresumsatz in €", balanceSheet: "Bilanzsumme in €", profit: "Jahresgewinn in €" }
  },
  en: {
    tagline: "Laws & rules for CRM, e-commerce, accounting, HR and ERP in Germany – filterable for business owners, machine-readable for AI.",
    disclaimerTitle: "Not legal advice.",
    search: "Search, e.g. e-invoice, § 312k …",
    reset: "Reset filters",
    categories: "Categories",
    status: "Status",
    jurisdiction: "Level",
    profileTitle: "Applicability check",
    profileHint: "Which rules affect my business?",
    businessModel: "Business model",
    activities: "What applies to your business?",
    onlyRelevant: "Only show rules that (probably) affect me",
    profileNote: "Rough pre-filter based on simplified thresholds. Does not replace legal review. Inputs stay in your browser.",
    count: (n, t) => `${n} of ${t} rules`,
    validFrom: "Valid from",
    transitionUntil: "Transition until",
    open: "Open provision",
    affected: "Who is affected?",
    exemptions: "Exemptions",
    requirements: "What must software do?",
    milestones: "Milestones",
    stage: "Legislative stage",
    sources: "Sources",
    lastVerified: "Last verified",
    aiDraft: "AI draft",
    reviewed: "Expert reviewed",
    details: "Details",
    unknownDate: "not yet set",
    rel: { applies: "Affects you", check: "Check", exempt: "Exempt", no: "Does not affect you" },
    empty: "No rules found. Adjust filters?",
    imprint: "Legal notice",
    reportNav: "Report a law",
    filters: "Filters",
    filterToggle: (n) => (n ? `Filters (${n})` : "Filters"),
    showResults: "Show results",
    footer: (m) => `Not legal advice · AI-generated · as of ${m.lastUpdated}`,
    reportRule: "Report an error",
    mailSubject: "ERP-Rechtsradar: missing law / correction",
    mailBody: "Hello,\n\nthe following law is missing or incorrect:\n\nLaw / section:\nLink to the law:\nDescription:\n",
    mailRuleSubject: (r) => `ERP-Rechtsradar: correction for ${r.id}`,
    mailRuleBody: (r) => `Hello,\n\nthe entry "${r.law} ${r.norm} – ${r.title.en}" (ID ${r.id}) seems incorrect:\n\nWhat is wrong:\nLink to source:\n`,
    privacy: "Privacy",
    meta: (m) => `Data as of ${m.lastUpdated} · version ${m.dataVersion} · status computed ${m.statusComputedAt} · AI-generated, updated monthly`,
    num: { employees: "Employees", revenue: "Annual revenue in €", balanceSheet: "Balance sheet total in €", profit: "Annual profit in €" }
  }
};

const NUMBER_FIELDS = ["employees", "revenue", "balanceSheet", "profit"];
const PROFILE_KEY = "rechtsradar-profile";
const $ = (id) => document.getElementById(id);

let data;
const state = {
  lang: "de",
  q: "",
  cats: new Set(),
  statuses: new Set(),
  jur: new Set(),
  onlyRelevant: false,
  profile: { businessModels: [], activities: [] }
};

// ---------- state <-> URL / storage ----------
function readUrl() {
  const p = new URLSearchParams(location.search);
  const list = (k) => (p.get(k) ? p.get(k).split(",").filter(Boolean) : []);
  if (p.get("lang") === "en") state.lang = "en";
  state.q = p.get("q") || "";
  state.cats = new Set(list("cat"));
  state.statuses = new Set(list("status"));
  state.jur = new Set(list("j"));
  state.onlyRelevant = p.get("relevant") === "1";
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.lang !== "de") p.set("lang", state.lang);
  if (state.q) p.set("q", state.q);
  if (state.cats.size) p.set("cat", [...state.cats].join(","));
  if (state.statuses.size) p.set("status", [...state.statuses].join(","));
  if (state.jur.size) p.set("j", [...state.jur].join(","));
  if (state.onlyRelevant) p.set("relevant", "1");
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (saved) state.profile = { businessModels: [], activities: [], ...saved };
  } catch {}
}

function saveProfile() {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile)); } catch {}
}

function profileActive() {
  const p = state.profile;
  return p.businessModels.length > 0 || p.activities.length > 0 || NUMBER_FIELDS.some((k) => p[k] !== undefined);
}

// ---------- helpers ----------
const t = () => UI[state.lang];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmtDate = (d) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString(state.lang === "de" ? "de-DE" : "en-GB", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }) : t().unknownDate);
const fmtNum = (n) => n.toLocaleString(state.lang === "de" ? "de-DE" : "en-GB");
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/§\s*/g, "§");

function conditionText(c) {
  const m = data.taxonomy.metrics[c.metric][state.lang];
  const parts = [];
  if (c.min !== undefined) parts.push(`≥ ${fmtNum(c.min)}`);
  if (c.max !== undefined) parts.push(`≤ ${fmtNum(c.max)}`);
  return `${m} ${parts.join(" & ")}`;
}

function searchText(r) {
  const tx = data.taxonomy;
  return norm([
    r.id, r.law, r.norm, r.title.de, r.title.en, r.summary.de, r.summary.en,
    ...r.softwareRequirements.de, ...r.softwareRequirements.en,
    r.appliesTo.text.de, r.appliesTo.text.en,
    ...r.categories.flatMap((c) => [tx.categories[c].de, tx.categories[c].en])
  ].join(" "));
}

// ---------- filter ----------
function filtered() {
  const terms = norm(state.q).split(/\s+/).filter(Boolean);
  const useProfile = profileActive();
  return data.rules
    .map((r) => ({ r, rel: useProfile ? evaluateApplicability(r, state.profile) : null }))
    .filter(({ r, rel }) => {
      if (state.cats.size && !r.categories.some((c) => state.cats.has(c))) return false;
      if (state.statuses.size && !state.statuses.has(r.status)) return false;
      if (state.jur.size && !state.jur.has(r.jurisdiction)) return false;
      if (terms.length && !terms.every((term) => r._search.includes(term))) return false;
      if (state.onlyRelevant && rel && (rel === "no" || rel === "exempt")) return false;
      return true;
    });
}

// ---------- render ----------
function chip(group, key, label, active, extraClass = "") {
  return `<button type="button" class="chip ${extraClass}" data-group="${group}" data-key="${esc(key)}" aria-pressed="${active}">${esc(label)}</button>`;
}

function renderStatic() {
  const L = t();
  const tx = data.taxonomy;
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = L[el.dataset.i18n]));
  $("lang-toggle").textContent = state.lang === "de" ? "EN" : "DE";
  $("search").placeholder = L.search;
  $("search").value = state.q;
  $("disclaimer-text").textContent = data.meta.disclaimer[state.lang];
  $("footer-meta").textContent = L.footer(data.meta);
  $("footer-meta").title = L.meta(data.meta);
  $("report-link").dataset.subject = L.mailSubject;
  $("report-link").dataset.body = L.mailBody;
  $("filter-close").textContent = L.showResults;

  const catCounts = {};
  data.rules.forEach((r) => r.categories.forEach((c) => (catCounts[c] = (catCounts[c] || 0) + 1)));
  $("cat-chips").innerHTML = Object.entries(tx.categories)
    .map(([k, v]) => chip("cat", k, `${v[state.lang]} (${catCounts[k] || 0})`, state.cats.has(k)))
    .join("");
  $("status-chips").innerHTML = Object.entries(tx.statuses)
    .map(([k, v]) => chip("status", k, v[state.lang], state.statuses.has(k), `status-chip status-${k}`))
    .join("");
  $("jur-chips").innerHTML = ["DE", "EU"].map((k) => chip("jur", k, k === "DE" ? (state.lang === "de" ? "Deutschland" : "Germany") : "EU", state.jur.has(k))).join("");

  $("profile-numbers").innerHTML = NUMBER_FIELDS.map((k) => `
    <label class="num-field"><span>${esc(L.num[k])}</span>
      <input type="number" min="0" step="1" inputmode="numeric" data-num="${k}" value="${state.profile[k] ?? ""}">
    </label>`).join("");
  $("profile-models").innerHTML = Object.entries(tx.businessModels).map(([k, v]) => `
    <label><input type="checkbox" data-model="${k}" ${state.profile.businessModels.includes(k) ? "checked" : ""}> ${esc(v[state.lang])}</label>`).join("");
  $("profile-activities").innerHTML = Object.entries(tx.activities).map(([k, v]) => `
    <label><input type="checkbox" data-activity="${k}" ${state.profile.activities.includes(k) ? "checked" : ""}> ${esc(v[state.lang])}</label>`).join("");
  $("only-relevant").checked = state.onlyRelevant;
  if (profileActive()) $("profile").open = true;
}

function renderRule({ r, rel }) {
  const L = t();
  const tx = data.taxonomy;
  const lang = state.lang;
  const a = r.appliesTo;
  const link = lang === "en" && r.urlEn ? r.urlEn : r.url;
  const reqs = r.softwareRequirements[lang];

  const affected = [
    a.businessModels?.length ? `<li>${esc(L.businessModel)}: ${a.businessModels.map((m) => m.toUpperCase()).join(", ")}</li>` : "",
    a.activities?.length ? `<li>${a.activities.map((x) => esc(tx.activities[x][lang])).join(" · ")}</li>` : "",
    a.thresholds ? `<li>${a.thresholds.conditions.map(conditionText).map(esc).join(a.thresholds.mode === "any" ? (lang === "de" ? " oder " : " or ") : (lang === "de" ? " und " : " and "))}</li>` : "",
    ...(a.exemptions || []).map((ex) => `<li>${esc(L.exemptions)}: ${esc(ex.text[lang])} (${ex.conditions.map(conditionText).map(esc).join(" & ")})</li>`)
  ].join("");

  return `
  <li class="rule" id="${esc(r.id)}">
    <div class="rule-head">
      <span class="status status-${r.status}"><span class="dot" aria-hidden="true"></span>${esc(tx.statuses[r.status][lang])}</span>
      ${rel ? `<span class="rel rel-${rel}">${esc(L.rel[rel])}</span>` : ""}
      <span class="jur">${r.jurisdiction}</span>
    </div>
    <h2 class="rule-title">${esc(r.title[lang])}</h2>
    <p class="rule-norm"><a href="${esc(link)}" target="_blank" rel="noopener">${esc(r.law)} ${esc(r.norm)} <span aria-hidden="true">↗</span></a></p>
    <p class="rule-summary">${esc(r.summary[lang])}</p>
    <dl class="rule-facts">
      <div><dt>${esc(L.validFrom)}</dt><dd>${fmtDate(r.validFrom)}</dd></div>
      ${r.transitionUntil ? `<div><dt>${esc(L.transitionUntil)}</dt><dd>${fmtDate(r.transitionUntil)}</dd></div>` : ""}
      ${r.stage ? `<div><dt>${esc(L.stage)}</dt><dd>${esc(r.stage[lang])}</dd></div>` : ""}
    </dl>
    <div class="tags">${r.categories.map((c) => `<span class="tag">${esc(tx.categories[c][lang])}</span>`).join("")}</div>
    <details class="rule-details">
      <summary>${esc(L.details)}</summary>
      <h3>${esc(L.affected)}</h3>
      <p>${esc(a.text[lang])}</p>
      ${affected ? `<ul class="affected">${affected}</ul>` : ""}
      ${reqs.length ? `<h3>${esc(L.requirements)}</h3><ul class="reqs">${reqs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
      ${r.milestones?.length ? `<h3>${esc(L.milestones)}</h3><ul class="milestones">${r.milestones.map((m) => `<li><time>${fmtDate(m.date)}</time> ${esc(m.label[lang])}</li>`).join("")}</ul>` : ""}
      <h3>${esc(L.sources)}</h3>
      <ul class="sources">${r.sources.map((s) => `<li><a href="${esc(s)}" target="_blank" rel="noopener">${esc(new URL(s).hostname.replace(/^www\./, ""))}</a></li>`).join("")}</ul>
      <p class="fine">${esc(L.lastVerified)}: ${fmtDate(r.lastVerified)} · <span class="badge">${esc(r.reviewedBy ? L.reviewed : L.aiDraft)}</span> · ID <code>${esc(r.id)}</code> · <a href="#" data-contact data-subject="${esc(L.mailRuleSubject(r))}" data-body="${esc(L.mailRuleBody(r))}">${esc(L.reportRule)}</a></p>
    </details>
  </li>`;
}

function activeFilterCount() {
  return state.cats.size + state.statuses.size + state.jur.size + (state.q.trim() ? 1 : 0) + (profileActive() ? 1 : 0);
}

function setFiltersOpen(open) {
  document.body.classList.toggle("filters-open", open);
  $("filter-toggle").setAttribute("aria-expanded", open);
}

function renderList() {
  $("filter-toggle").textContent = t().filterToggle(activeFilterCount());
  const items = filtered();
  $("count").textContent = t().count(items.length, data.rules.length);
  $("rules").innerHTML = items.length ? items.map(renderRule).join("") : `<li class="empty">${esc(t().empty)}</li>`;
}

function update({ full = false } = {}) {
  if (full) renderStatic();
  else document.querySelectorAll(".chip").forEach((b) => {
    const set = { cat: state.cats, status: state.statuses, jur: state.jur }[b.dataset.group];
    b.setAttribute("aria-pressed", set.has(b.dataset.key));
  });
  renderList();
  writeUrl();
}

// ---------- events ----------
function bind() {
  $("search").addEventListener("input", (e) => { state.q = e.target.value; update(); });
  $("filter-toggle").addEventListener("click", () => setFiltersOpen(!document.body.classList.contains("filters-open")));
  $("filter-close").addEventListener("click", () => { setFiltersOpen(false); window.scrollTo({ top: 0 }); });
  document.addEventListener("keydown", (e) => e.key === "Escape" && setFiltersOpen(false));
  $("lang-toggle").addEventListener("click", () => { state.lang = state.lang === "de" ? "en" : "de"; update({ full: true }); });
  $("reset").addEventListener("click", () => {
    Object.assign(state, { q: "", cats: new Set(), statuses: new Set(), jur: new Set(), onlyRelevant: false, profile: { businessModels: [], activities: [] } });
    saveProfile();
    $("profile").open = false;
    update({ full: true });
  });
  $("sidebar").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const set = { cat: state.cats, status: state.statuses, jur: state.jur }[b.dataset.group];
    set.has(b.dataset.key) ? set.delete(b.dataset.key) : set.add(b.dataset.key);
    update();
  });
  $("profile").addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.num) {
      const v = el.value === "" ? undefined : Number(el.value);
      if (v === undefined) delete state.profile[el.dataset.num]; else state.profile[el.dataset.num] = v;
    } else if (el.dataset.model || el.dataset.activity) {
      const key = el.dataset.model ? "businessModels" : "activities";
      const val = el.dataset.model || el.dataset.activity;
      state.profile[key] = el.checked ? [...state.profile[key], val] : state.profile[key].filter((x) => x !== val);
    } else if (el.id === "only-relevant") {
      state.onlyRelevant = el.checked;
    }
    saveProfile();
    update();
  });
}

async function init() {
  readUrl();
  loadProfile();
  const res = await fetch("rules.json");
  data = await res.json();
  // Recompute status for today so the page is correct even between rebuilds
  const today = new Date().toISOString().slice(0, 10);
  data.rules.forEach((r) => {
    r.status = computeStatus(r, today);
    r._search = searchText(r);
  });
  bind();
  initContact();
  update({ full: true });
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

init();

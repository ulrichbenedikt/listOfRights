#!/usr/bin/env node
// Checks that every url/urlEn/source in data/rules.json responds. Exits 1 on broken links.
import { readFileSync } from "node:fs";

const { rules } = JSON.parse(readFileSync(new URL("../data/rules.json", import.meta.url), "utf8"));
const urls = new Map();
for (const r of rules) for (const u of [r.url, r.urlEn, ...r.sources].filter(Boolean)) urls.set(u, [...(urls.get(u) || []), r.id]);

async function check(u, attempt = 1) {
  const result = await checkOnce(u);
  if (result && attempt < 3) {
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return check(u, attempt + 1);
  }
  return result;
}

async function checkOnce(u) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(u, { method, redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "Mozilla/5.0 (link-check)" } });
      if (res.ok) return null;
      if (method === "GET") return res.status;
    } catch (e) {
      if (method === "GET") return e.cause?.code || e.name;
    }
  }
}

const broken = [];
const list = [...urls.keys()];
for (let i = 0; i < list.length; i += 4) {
  const batch = list.slice(i, i + 4);
  const results = await Promise.all(batch.map(check));
  batch.forEach((u, j) => results[j] && broken.push(`${results[j]}  ${u}  (${urls.get(u).join(", ")})`));
}
if (broken.length) {
  console.error(`✗ ${broken.length} von ${list.length} Links fehlerhaft:\n` + broken.map((b) => "  - " + b).join("\n"));
  process.exit(1);
}
console.log(`✓ ${list.length} Links erreichbar`);

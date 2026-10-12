# ERP-Rechtsradar

Monatlich aktualisierte, **KI-erstellte** Übersicht der Gesetze und Regeln in Deutschland (inkl. EU-Recht) rund um CRM, E-Commerce, Buchhaltung, Rechnungsstellung, HR, Warenwirtschaft, IT-Sicherheit, KI und Barrierefreiheit.

- **Für Unternehmer:** filterbare Liste mit Suche, Kategorien, Status, Betroffenheits-Check (DE/EN)
- **Für KI:** `rules.json`, `rules.md`, `rules.en.md`, `llms.txt`, `schema.json`

> ⚠️ Keine Rechtsberatung. Mit KI erstellt, ohne Gewähr für Richtigkeit, Vollständigkeit und Aktualität.

## Struktur

| Pfad | Inhalt |
|---|---|
| `data/rules.json` | **Einzige Datenquelle** – alle Regeln |
| `data/taxonomy.json` | Kategorien, Tätigkeiten, Kennzahlen, Status-Labels |
| `data/schema.json` | JSON-Schema (Doku für Menschen & KI) |
| `site/` | Statische Website (HTML/CSS/Vanilla-JS, keine Abhängigkeiten) |
| `scripts/build.mjs` | Validiert Daten, berechnet Status, erzeugt `dist/` inkl. JSON/Markdown/llms.txt |
| `scripts/check-links.mjs` | Prüft alle Links |
| `UPDATE_PROMPT.md` | Anweisung für das monatliche KI-Update |
| `vercel.json` | Vercel-Build, Header (CORS für KI-Endpunkte, Markdown-Content-Type) |
| `.github/workflows/` | Validierung bei PRs, tägliches Rebuild via Vercel Deploy Hook, monatlicher Update-PR |

## Lokal

```bash
npm run dev        # baut und startet http://localhost:8080
npm run check      # nur validieren
npm run links      # Links prüfen
```

Node ≥ 20, keine npm-Abhängigkeiten.

## Status-Logik

Der Status wird beim Build (täglich) und zusätzlich live im Browser aus den Daten berechnet:
- `validFrom` in der Zukunft → **In Planung** (grau)
- `transitionUntil` noch nicht erreicht → **Übergangsphase** (orange)
- sonst → **In Kraft** (grün)

Für Regeln ohne festes Datum (Entwürfe) wird `statusOverride: "planned"` plus `stage` gesetzt.

## Einrichtung (GitHub + Vercel)

1. Repo auf GitHub anlegen und pushen.
2. Auf [vercel.com/new](https://vercel.com/new) das Repo importieren. Build-Einstellungen kommen aus `vercel.json`, nichts weiter nötig.
3. Vercel → *Project Settings → Git → Deploy Hooks:* Hook für `main` anlegen, URL als GitHub-Secret `VERCEL_DEPLOY_HOOK` speichern (tägliches Rebuild).
4. GitHub → *Settings → Actions → General:* „Allow GitHub Actions to create and approve pull requests“ aktivieren.
5. GitHub → *Settings → Secrets → Actions:* `ANTHROPIC_API_KEY` anlegen.
6. Optional Vercel → *Environment Variables:* `SITE_URL` bei eigener Domain (sonst wird die Vercel-Produktions-URL verwendet).
7. Impressum und Datenschutz in `site/` ausfüllen.

Jeder PR bekommt automatisch eine Vercel-Vorschau-URL – ideal zum Prüfen des monatlichen Updates.

Das monatliche Update läuft am 1. jedes Monats und erstellt einen PR. **Vor dem Merge fachlich prüfen.** Geprüfte Einträge bekommen `"reviewedBy": "<Name>"` – dann zeigt die Seite „Fachlich geprüft“ statt „KI-Entwurf“.

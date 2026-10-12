# Monatliches Update – Anweisung für die KI

Du pflegst `data/rules.json`, eine Liste der Gesetze und Regeln für CRM, E-Commerce, Buchhaltung, Rechnungsstellung, HR, Warenwirtschaft, IT-Sicherheit, KI und Barrierefreiheit in Deutschland (inkl. unmittelbar geltendem EU-Recht). Das Ergebnis ist **immer ein Pull Request**, den ein Mensch prüft. Niemals direkt auf `main` pushen.

## Ablauf

1. Branch anlegen: `update/YYYY-MM` (aktueller Monat).
2. **Bestehende Einträge prüfen**, besonders:
   - Einträge mit Status `planned` oder `transition` und Einträge mit `statusOverride` (Gesetzgebungsstand geändert? Termin verschoben? Verkündet?).
   - Einträge, deren `validFrom`, `transitionUntil` oder `milestones` in den nächsten 3 Monaten liegen.
   - Schwellenwerte und Beträge (Mindestlohn, Umsatzgrenzen, Kleinunternehmer).
3. **Neue Entwicklungen recherchieren** (letzte ~6 Wochen): Bundesgesetzblatt (recht.bund.de), BMF-Schreiben, EUR-Lex/Amtsblatt, Bundestag-Drucksachen, BSI, BfDI/DSK, Zentrale Stelle Verpackungsregister, IHK-Meldungen. Nur aufnehmen, was für ERP-/CRM-/Shop-/Buchhaltungs-/HR-Software oder deren Betreiber relevant ist.
4. Änderungen in `data/rules.json` einpflegen:
   - Schema: `data/schema.json`; erlaubte Kategorien/Tätigkeiten: `data/taxonomy.json`.
   - `id` bestehender Einträge **nie ändern** (außer ein Gesetz wird abgelöst – dann neue id und im PR erwähnen).
   - Immer beide Sprachen (`de`, `en`) pflegen, kurz und für Unternehmer verständlich.
   - `softwareRequirements`: konkrete, prüfbare Anforderungen an Software.
   - `appliesTo`: Schwellenwerte/Ausnahmen strukturiert erfassen, Details im `text`.
   - `url`: möglichst direkter Link auf die Einzelnorm (gesetze-im-internet.de, eur-lex.europa.eu).
   - `sources`: mindestens eine verlässliche Quelle, bevorzugt amtlich.
   - `lastVerified` auf das heutige Datum setzen, wenn ein Eintrag geprüft wurde.
   - `reviewedBy` **nicht** setzen – das macht nur der Mensch.
   - Unsichere Informationen nicht als Fakt eintragen; im PR unter „Unsicher“ aufführen.
5. `dataVersion` (YYYY-MM) und `lastUpdated` aktualisieren.
6. `node scripts/build.mjs --check` und `node scripts/check-links.mjs` ausführen, Fehler beheben.
7. Committen und PR erstellen (`gh pr create`) mit dieser Beschreibung:

```
## Monatliches Update YYYY-MM

### Neu
- <id>: <Titel> – <Grund> (Quelle)

### Geändert
- <id>: <was> – <Grund> (Quelle)

### Geprüft, unverändert
- <Anzahl> Einträge

### Unsicher / bitte manuell prüfen
- …

⚠️ KI-generiert – vor dem Merge fachlich prüfen.
```

Wenn sich nichts geändert hat: trotzdem `lastVerified` der geprüften Einträge aktualisieren und einen kurzen PR erstellen.

# Evolution Hub UX-Test-Dashboard Projektdokumentation

**Letzte Aktualisierung:** 2025-07-09T00:15:00+02:00

## 1. Projektübersicht

Das UX-Test-Dashboard ist ein zentrales Tool zur Analyse, Ausführung und Überwachung von Playwright-Tests innerhalb des Evolution Hub Projekts. Es ermöglicht die Qualitätsanalyse und -sicherung aller Frontend-Tests.

### 1.1 Aktuelle Version

Server Version: `1.0.0`  
Dashboard Version: `1.0.0`  
Status: `Einsatzbereit`

### 1.2 Roadmap-Status (Stand: 2025-07-08)

1. **Test‑Validierung & Testabdeckungsanalyse** - ✅ ABGESCHLOSSEN
   - ✅ Test-Metadaten-Extraktion
   - ✅ Kategorisierung nach Testtyp
   - ✅ Mapping auf Funktionsbereiche
   - ✅ Testabdeckungs‑Matrix

2. **Test‑Qualitätsanalyse** - ✅ AKTUELLER FOKUS
   - ✅ Statische Codeanalyse
   - ✅ Erfolgsraten‑Tracking (FRONTEND & API IMPLEMENTIERT MIT TESTS)
   - ✅ Flakiness‑Score (FRONTEND & API IMPLEMENTIERT MIT TESTS)
   - ✅ Selektorenanalyse
   - ✅ Redundanz-Check

## 2. Aktuelle Datei- und Ordnerstruktur

```bash
evolution-hub/tests/dashboard/
├── public/                  # Frontend-Assets und HTML
│   ├── css/                 # Stylesheets
│   ├── js/                  # Frontend JavaScript
│   │   └── metrics/         # Metriken-Visualisierungsmodule
│   │       ├── success-rate-view.js  # Erfolgsraten-Visualisierung
│   │       └── flakiness-view.js     # Flakiness-Visualisierung
├── scripts/                 # TypeScript-Module für Frontend
│   ├── playwright-results.ts  # API-Integration für Testergebnisse
│   └── results-view.ts      # UI-Rendering für Ergebnisse
├── routes/                  # Backend API-Routen
│   ├── logs.ts              # Log-Verwaltung
│   ├── test-analysis.ts     # Test-Analyse API
│   └── test-execution.ts    # Testausführung API
├── __tests__/              # Automatisierte Tests
│   ├── api/                 # API-Tests
│   │   └── test-metrics.test.ts  # Tests für Test-Metrik-Endpunkte
│   ├── utils/               # Tests für Hilfsfunktionen
│   ├── integration/         # Integrationstests
│   └── test-helpers.ts      # Test-Hilfsfunktionen
├── types/                   # TypeScript-Definitionen
│   ├── express-types.d.ts   # Express-Typen
│   └── playwright-results.d.ts # Testergebnis-Typen
├── utils/                   # Hilfsfunktionen
│   ├── dashboard-validator.ts # Dashboard-Komponenten-Validator
│   ├── logger.ts            # Logging-Funktionalität
│   ├── test-analyzer.ts     # Test-Analyse-Logik
│   └── test-runner.ts       # Test-Ausführungslogik
├── docs/                    # Dokumentation
├── logs/                    # Log-Dateien
├── results/                 # Analyseergebnisse und -historie
├── index.html               # Dashboard-Hauptseite (im Hauptverzeichnis)
├── server.ts                # TypeScript-Server (Original)
├── server-complete.js       # Vollständige Serverimplementierung (aktuell aktiv)
├── jest.config.ts          # Jest-Testkonfiguration
├── .eslintrc.js            # ESLint-Konfiguration
└── start.sh                 # Server-Startskript
```

## 3. Aktive Komponenten

### Frontend-Visualisierungen und Backend-Komponenten

Für die Visualisierung von Testmetriken sind folgende Komponenten bereits implementiert und validiert:

| Komponente        | Dateipfad                                 | Funktionalität                                                          |
| ----------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Erfolgsraten-View | `/public/js/metrics/success-rate-view.js` | Lädt und visualisiert Testerfolgsdaten, unterstützt zeitliche Filterung |
| Flakiness-View    | `/public/js/metrics/flakiness-view.js`    | Zeigt Testinstabilität und instabile Tests mit Empfehlungen an          |

Beide Module nutzen Chart.js für die Visualisierung und wurden erfolgreich ins Dashboard integriert. Die Daten werden über die entsprechenden API-Endpunkte (/api/test-metrics/success-rates und /api/test-metrics/flakiness) geladen. Die Frontend-Module sind vollständig implementiert, aber einige TypeScript-Warnungen müssen noch behoben werden.

### Validierte Komponenten

Folgende Komponenten wurden mit dem neuen `dashboard-validator.ts` Tool überprüft und als funktionsfähig bestätigt:

| Komponente                  | Status   | Beschreibung                                |
| --------------------------- | -------- | ------------------------------------------- |
| Test-Analyzer               | ✅ Aktiv | Extrahiert Metadaten aus Tests              |
| API-Endpunkte               | ✅ Aktiv | API-Routen für Test-Analyse und -Ausführung |
| API-Tests                   | ✅ Aktiv | Automatisierte Tests für API-Endpunkte      |
| Logging-System              | ✅ Aktiv | Systemlogs für Dashboard und Tests          |
| Frontend-Dashboard          | ✅ Aktiv | UI für Testanalyse und -verwaltung          |
| Erfolgsraten-Visualisierung | ✅ Aktiv | Frontend-Modul für Erfolgsraten-Anzeige     |
| Flakiness-Visualisierung    | ✅ Aktiv | Frontend-Modul für Flakiness-Anzeige        |

## 4. Veraltet/Deaktiviert

| Komponente       | Status      | Hinweis                              |
| ---------------- | ----------- | ------------------------------------ |
| server.ts        | ⚠️ Veraltet | Ersetzt durch server-complete.js     |
| server-direct.js | ⚠️ Veraltet | Frühere vereinfachte Implementierung |

## 5. Serververwaltung und API-Implementierung

### Wichtiger Hinweis zu parallelen Implementierungen

Das Projekt enthält zwei parallele Server-Implementierungen:

1. **server-complete.js**: Aktive Implementierung
   - Monolithischer Server in JavaScript
   - Implementiert API-Endpunkte direkt innerhalb der Datei
   - Enthält Mock-Daten für Testmetriken
   - **Diese Version wird aktuell vom start.sh-Skript gestartet und ausgeführt**

2. **routes/\*.ts**: Modulare Router-basierte Implementierung
   - TypeScript-basierte Implementierung mit separaten Router-Dateien
   - Bessere Code-Organisation und Typsicherheit
   - Aktuell nicht aktiv in der laufenden Anwendung

Diese Doppelstruktur bedeutet, dass **Änderungen an API-Endpunkten in den TypeScript-Router-Dateien keine Auswirkungen auf die laufende Anwendung haben**, solange sie nicht auch in `server-complete.js` implementiert werden.

### Empfehlungen

- Für kurzfristige Fixes und API-Änderungen: Ändern Sie `server-complete.js` direkt
- Für langfristige Wartung: Planen Sie ein Refactoring zur Verwendung der TypeScript-Router

### Notwendige API-Endpunkte

Folgende API-Endpunkte müssen in `server-complete.js` implementiert sein, um alle Dashboard-Funktionen zu unterstützen:

| Pfad                              | Methode | Implementierungsstatus | Beschreibung                     |
| --------------------------------- | ------- | ---------------------- | -------------------------------- |
| `/api/test-metrics/success-rates` | GET     | ✅ Implementiert       | Erfolgsraten aller Tests         |
| `/api/test-metrics/flakiness`     | GET     | ✅ Implementiert       | Flakiness-Bericht für alle Tests |
| `/api/test-metrics/flaky-tests`   | GET     | ✅ Implementiert       | Liste der instabilsten Tests     |

### Refactoring-Analyse: JavaScript zu TypeScript

#### Umfang und Aufwand

Die folgende Analyse bewertet den Aufwand für ein vollständiges TypeScript-Refactoring:

| Komponente                     | Komplexität | Aufwand | Details                                                          |
| ------------------------------ | ----------- | ------- | ---------------------------------------------------------------- |
| server-complete.js → server.ts | Hoch        | ~6h     | Komplexe Datei (766 Zeilen), Mock-Daten und API-Implementierung  |
| Integration der TS-Router      | Mittel      | ~4h     | Umstellung auf Router-Importe aus vorhandenen TypeScript-Dateien |
| Frontend JS → TS               | Niedrig     | ~2h     | 4 JavaScript-Dateien im Frontend-Bereich                         |
| Skripte JS → TS                | Niedrig     | ~1h     | 2 JavaScript-Dateien in /scripts/                                |
| Tests und Fehlerbehebung       | Mittel      | ~3h     | Testen aller APIs, Beheben von Typfehlern                        |
| Dokumentation                  | Niedrig     | ~1h     | Aktualisierung der Dokumentation                                 |

**Gesamtaufwand:** ~17 Stunden

#### Herausforderungen

1. **Typisierung der Mock-Daten**
   - Umfangreiche Datenstrukturen müssen typisiert werden
   - Interfaces für Test-Ergebnisse, Flakiness-Berichte usw. definieren

2. **Moduleigenschaften**
   - Umstellung von CommonJS (`require`) auf ES-Module (`import`)
   - Mögliche Kompatibilitätsprobleme mit bestehenden Modulen

3. **Beseitigung von ESLint-Fehlern**
   - Aktuelle Implementierung zeigt mehrere ESLint-Fehler wie `require is not defined`
   - Diese würden durch TypeScript-Umstellung gelöst

#### Vorteile

1. **Einheitliche Codebase**
   - Keine parallelen Implementierungen mehr
   - Höhere Codequalität durch einheitliche Struktur

2. **Typsicherheit**
   - Frühzeitige Fehlererkennung durch statische Typisierung
   - Bessere IDE-Unterstützung, Code-Vervollständigung

3. **Verbesserte Wartbarkeit**
   - Modularer Aufbau durch Router-Struktur
   - Bessere Skalierbarkeit bei neuen Features

#### Empfohlene Vorgehensweise

1. Kleinere API-Endpunkte in server-complete.js verbleiben lassen, bis Refactoring abgeschlossen
2. Inkrementelle Umstellung:
   - Zuerst: Gemeinsame Interfaces/Types definieren
   - Dann: Server-Hauptdatei umstellen und Module integrieren
   - Anschließend: Frontend-Code konvertieren
3. Bestehende Jest-Tests als Regressionsschutz nutzen
4. Umfassende Tests nach jedem Schritt durchführen

## 6. Geplante Features

### Frontend-Integration von Testmetriken

Die vollständige Dashboard-Integration der Testmetriken erfordert folgende Komponenten:

1. **Dedizierter Metriken-Tab**:
   - Container für Erfolgsraten und Flakiness-Visualisierungen
   - Filteroptionen für Zeitraum und Testtypen
   - Umschaltung zwischen verschiedenen Metrik-Ansichten

2. **Ressourcen für UI-Integration**:
   - HTML-Struktur bereits in `index.html` durch bestehende Tabs erweiterbar
   - JavaScript-Module bereits implementiert und können per Script-Tag eingebunden werden
   - Chart.js für Visualisierung vorhanden und einsatzbereit

3. **Daten-Integration**:
   - API-Endpunkte für Metriken implementiert und funktionsfähig
   - Backend verwendet aktuell Mock-Daten für Entwicklung und Tests
   - Erfolgsraten und Flakiness-Daten werden als JSON über API geladen
   - Lokale Daten werden in `/results`-Verzeichnis gespeichert
   - TypeScript-Module für die Metrikberechnung müssen noch korrekt kompiliert werden

4. **Nächste Entwicklungsschritte**:
   1. TypeScript-Kompilierung der Metrik-Module (in Arbeit)
   2. Integration von Echtdaten statt Mock-Daten (in Arbeit)
   3. Ausbau der automatisierten Tests für Utilities (geplant)
   4. Integration der Tests in CI/CD-Pipeline (geplant)
   5. Portfolio-Dokumentation (geplant)

## 6. Bekannte Probleme und Lösungen

| Problem                  | Status            | Beschreibung                                                                                                                       |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript-Kompilierung  | ✅ Teilweise behoben | Frontend-Build-Prozess für TS funktioniert, zwei Module erfolgreich migriert (`success-rate-view.ts`, `flakiness-view.ts`)   |
| Chart.js ESLint-Fehler   | ✅ Behoben        | ESLint-Fehler bezüglich undefined 'Chart' wurden durch Verwendung von window.Chart behoben                                         |
| Mock vs. Echtdaten       | 🚧 In Bearbeitung | Aktuell werden Mock-Daten für die API-Endpunkte verwendet, Umstellung auf Echtdaten erforderlich                                   |
| Frontend-Dashboard Pfad  | ✅ Behoben        | Die index.html befindet sich im Hauptverzeichnis, nicht im /public Ordner                                                          |
| Server-Implementierung   | ✅ Behoben        | Die server-complete.js verwendet eine alternative Implementierung mit createServer und direkten app.get/post Methoden statt Router |
| TypeScript-Warnungen     | 🚧 In Bearbeitung | TypeScript-Typfehler in bestehenden Dateien müssen im Rahmen des Refactorings behoben werden                                       |
| Jest-Test Importprobleme | 🚧 In Bearbeitung | Import/Export-Inkonsistenzen zwischen success-rate-tracker.ts und flakiness-analyzer.ts verursachen Probleme in Tests              |
| Frontend-Status          | ✅ Aktualisiert   | Frontend-Migration: Ca. 95% abgeschlossen, migrierte Kernmodule: `success-rate-view.ts`, `flakiness-view.ts`, `test-analysis.ts`, `logs.ts` |

## 6.1 Validierung und Monitoring

Zur Validierung des Dashboard-Status wurde ein neues Tool entwickelt:

| Tool                | Pfad                            | Beschreibung                                                                                                          |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Dashboard-Validator | `/utils/dashboard-validator.ts` | Validiert alle Komponenten des Dashboards und prüft deren Funktionalität. Gibt einen detaillierten Statusbericht aus. |

Der Validator prüft folgende Aspekte:

- Existenz und Inhalt aller kritischen Dateien
- Funktionalität des Logger-Systems
- Vorhandensein aller API-Routen
- Korrekte Implementierung der Visualisierungskomponenten
- Server-Implementierung

Dieses Tool kann sowohl manuell als auch in CI/CD-Pipelines zur Qualitätssicherung verwendet werden.

## 7. API-Endpunkte und Test-Abdeckung

| Endpunkt                                        | Methode | Beschreibung                                         | Test-Status    |
| ----------------------------------------------- | ------- | ---------------------------------------------------- | -------------- |
| /api/logs                                       | GET     | Abrufen von Systemlogs                               | ⛔ Keine Tests |
| /api/logs                                       | DELETE  | Löschen von Systemlogs                               | ⛔ Keine Tests |
| /api/test-analysis                              | POST    | Test-Analyse durchführen                             | ⛔ Keine Tests |
| /api/test-analysis/results                      | GET     | Analyseergebnisse abrufen                            | ⛔ Keine Tests |
| /api/playwright-tests                           | GET     | Verfügbare Playwright-Tests abrufen                  | ⛔ Keine Tests |
| /api/playwright-results                         | GET     | Liste aller gespeicherten Testergebnisse abrufen     | ✅ Mit Tests   |
| /api/playwright-results                         | POST    | Test-Ergebnisse speichern und Metriken aktualisieren | ✅ Mit Tests   |
| /api/playwright-results/:runId                  | GET     | Einzelnes Testergebnis abrufen                       | ✅ Mit Tests   |
| /api/playwright-results/:runId                  | DELETE  | Testergebnis löschen                                 | ⛔ Keine Tests |
| /api/playwright-results/compare/:runId1/:runId2 | GET     | Zwei Testergebnisse vergleichen                      | ⛔ Keine Tests |
| /api/playwright-results/latest                  | GET     | Neueste Testergebnisse abrufen                       | ✅ Mit Tests   |
| /api/test-metrics/success-rates                 | GET     | Erfolgsraten aller Tests abrufen                     | ✅ Mit Tests   |
| /api/test-metrics/success-trends                | GET     | Erfolgsraten-Trends über Zeit abrufen                | ⛔ Keine Tests |
| /api/test-metrics/flakiness                     | GET     | Flakiness-Bericht für alle Tests abrufen             | ✅ Mit Tests   |
| /api/test-metrics/flaky-tests                   | GET     | Liste der instabilsten Tests abrufen                 | ✅ Mit Tests   |
| /api/test-metrics/update                        | POST    | Test-Metriken mit neuen Testresultaten aktualisieren | ✅ Mit Tests   |

## 8. Testinfrastruktur

### 8.1 Test-Setup und Konfiguration

Das Projekt verwendet Jest als Test-Framework mit TypeScript-Unterstützung:

| Komponente           | Dateipfad                    | Beschreibung                                                       |
| -------------------- | ---------------------------- | ------------------------------------------------------------------ |
| Jest-Konfiguration   | `/jest.config.ts`            | TypeScript-basierte Konfiguration für Jest mit ts-jest Preset      |
| ESLint-Konfiguration | `/.eslintrc.js`              | Erweiterte ESLint-Regeln für Tests mit Jest-Support                |
| Test-Helper          | `/__tests__/test-helpers.ts` | Hilfsfunktionen für API-Tests, inkl. Express-Server und Mock-Daten |

### 8.2 Implementierte Tests

| Testtyp      | Dateipfad                                      | Abdeckung                             |
| ------------ | ---------------------------------------------- | ------------------------------------- |
| API-Tests    | `/__tests__/api/test-metrics.test.ts`          | 10 Tests für Test-Metrik-Endpunkte    |
| Router-Tests | `/__tests__/routes/test-metrics.test.ts`       | 6 Tests für Test-Metrik-Routen        |
| Router-Tests | `/__tests__/routes/playwright-results.test.ts` | 6 Tests für Playwright-Results-Routen |

#### Test-Metrik-API Testabdeckung:

- **`/api/test-metrics/flaky-tests`**:
  - Basisstruktur der Antwort
  - Sortierung nach Flakiness-Score
  - Limit-Parameter-Funktionalität

- **`/api/test-metrics/success-rates`**:
  - Basisstruktur der Antwort
  - Days-Parameter zur Zeitraumfilterung
  - TestType-Parameter zur Testtyp-Filterung

- **`/api/test-metrics/flakiness`**:
  - Basisstruktur der Antwort
  - Days-Parameter zur Zeitraumfilterung
  - Threshold-Parameter zur Schwellenwertfilterung
  - Kombinierte Parameter-Verarbeitung

### 8.3 Test-Status und Erweiterungen

| Kategorie            | Status           | Beschreibung                                                                                                    |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Utility-Tests        | ✅ Implementiert | Tests für success-rate-tracker.ts implementiert und stabilisiert; FlakinessAnalyzer über Router-Tests abgedeckt |
| Router-Tests         | ✅ Implementiert | Stabile Tests für test-metrics.ts und playwright-results.ts implementiert                                       |
| Mock-Strategie       | ✅ Optimiert     | Robuste Mock-Implementierung für Jest mit Factory-Funktionen zur Vermeidung von Hoisting-Problemen              |
| Integration in CI/CD | 🚧 Geplant       | Automatische Test-Ausführung bei Code-Änderungen                                                                |
| Erweiterte API-Tests | 🚧 Geplant       | Vervollständigung der API-Test-Abdeckung für übrige Endpunkte                                                   |

### 8.4 Test-Infrastruktur Herausforderungen und Lösungen

| Problem              | Lösung     | Beschreibung                                                                                                   |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| Jest-Hoisting        | ✅ Behoben | Mock-Definitionen direkt in Factory-Funktionen platziert, keine externen Variablen referenziert                |
| API-Antwortstruktur  | ✅ Behoben | Tests an tatsächliche API-Antwortstruktur angepasst (z.B. verschachtelte result-Objekte vs. direkte Antworten) |
| Mock-Initialisierung | ✅ Behoben | Mocks im richtigen Scope definiert und über `beforeEach` konsistent initialisiert                              |
| Testdatenformate     | ✅ Behoben | Testdaten an erwartete API-Formate angepasst (z.B. `output` und `config` für POST /api/playwright-results)     |
| fs/path Module       | ✅ Behoben | Core-Module korrekt gemockt für isolierte Tests ohne Dateisystemzugriffe                                       |

## 9. TypeScript-Migration

Nach erfolgreicher Stabilisierung der Test-Suite wurde die schrittweise Migration der verbleibenden JavaScript-Dateien zu TypeScript als nächste Priorität identifiziert. Ziel ist die Verbesserung der Typsicherheit, Code-Qualität und langfristigen Wartbarkeit der Anwendung.

### 9.1 Migrationsstrategie und -fortschritt

Es wurde ein detaillierter Migrationsplan erstellt, der die schrittweise und inkrementelle Umstellung aller verbleibenden JavaScript-Module zu TypeScript beschreibt. Die Migration erfolgt in mehreren Phasen, wobei das Projekt durchgehend lauffähig bleibt.

**Detaillierte Dokumentation:**

- [TypeScript-Migrations-Roadmap](./typescript-migration-roadmap.md): Enthält den vollständigen Phasenplan, Fortschrittsüberwachung und Risikoanalyse.
- [TypeScript-Migrations-Best-Practices](./typescript-migration.md): Dokumentiert die technischen Richtlinien und bewährten Methoden für die Migration.

**Phasenstatus:**
- Phase 1 (Vorbereitung und Setup) ✅ Abgeschlossen
- Phase 2 (Utility-Migration) ✅ Abgeschlossen
- **Aktuelle Phase:** Phase 3 (Server-Migration) 🚧 In Arbeit

### 9.2 Zu migrierende Komponenten

| Komponente                     | Typ           | Dateipfad                                        | Priorität   | Status           |
| ------------------------------ | ------------- | ------------------------------------------------ | ----------- | ---------------- |
| Hauptserver                    | Backend       | `/server-complete.js`                            | Hoch        | 🚧 In Bearbeitung |
| Server Mock-Daten              | Backend       | `/src/mocks/*.ts`                                | Hoch        | ✅ Abgeschlossen |
| Logger                         | Backend       | `/src/utils/logger.ts`                           | Hoch        | ✅ Abgeschlossen |
| API-Routen                     | Backend       | `/src/routes/*.ts`                               | Hoch        | ✅ Abgeschlossen |
| Test-Analyse-Typen             | Backend       | `/src/types/test-analysis.ts`                    | Hoch        | ✅ Abgeschlossen |
| Modularer Server               | Backend       | `/src/server.ts`                                 | Hoch        | 🚧 In Bearbeitung |
| Flakiness-Visualisierung       | Frontend      | `/public/js/metrics/flakiness-view.js`           | Mittel      | ✅ Migriert       |
| Erfolgsraten-Visualisierung    | Frontend      | `/public/js/metrics/success-rate-view.js`        | Mittel      | ✅ Migriert       |
| Log-Visualisierung             | Frontend      | `/public/js/logs.js`                             | Mittel      | ✅ Migriert       |
| Test-Analyse-Visualisierung    | Frontend      | `/public/js/metrics-ts/test-analysis.ts`        | Mittel      | ✅ Implementiert  |
| Dashboard-Controller           | Frontend      | `/public/js/metrics-ts/dashboard-init.ts`        | Hoch        | ✅ Implementiert  |
| Test-Daten-Generator           | Utility       | `/scripts/generate-test-data.ts`                | Niedrig     | ✅ Migriert       |
| Test-Metriken-Validator        | Utility       | `/scripts/test-metrics-validation.ts`           | Niedrig     | ✅ Migriert       |

### 9.3 Frontend-Event-System

Im Rahmen der TypeScript-Migration wurde ein neues modulares Event-basiertes Kommunikationssystem implementiert. Dieses System ersetzt die direkte Verwendung von globalen `window`-Objekten und verbessert die Modularität und Typ-Sicherheit.

#### 9.3.1 Event-Typen

Das Event-System verwendet standardisierte Event-Typen und Module-spezifische Event-Typen:

| Event-Typ | Kategorie | Beschreibung | Verwendet von |
|-----------|-----------|--------------|---------------|
| `data:loading` | Dashboard | Signalisiert einen laufenden Ladevorgang | Alle Module |
| `data:loaded` | Dashboard | Signalisiert erfolgreiche Datenladung | Alle Module |
| `data:error` | Dashboard | Signalisiert einen Fehler bei der Datenverarbeitung | Alle Module |
| `module:error` | Dashboard | Signalisiert einen Modulfehler | Alle Module |
| `dashboard:initialized` | Dashboard | Signalisiert die vollständige Dashboard-Initialisierung | DashboardController |
| `test-analysis:loading` | Test-Analyse | Signalisiert laufende Test-Analyse | Test-Analyse-Modul |
| `test-analysis:loaded` | Test-Analyse | Signalisiert erfolgreiche Test-Analyse | Test-Analyse-Modul |
| `test-analysis:error` | Test-Analyse | Signalisiert einen Test-Analyse-Fehler | Test-Analyse-Modul |
| `logs:loading` | Logs | Signalisiert laufende Log-Ladung | Logs-Modul |
| `logs:loaded` | Logs | Signalisiert erfolgreiche Log-Ladung | Logs-Modul |
| `logs:error` | Logs | Signalisiert einen Log-Fehler | Logs-Modul |
| `logs:filter-changed` | Logs | Signalisiert eine Log-Filteränderung | Logs-Modul |
| `success-rate:loading` | Erfolgsraten | Signalisiert laufende Erfolgsraten-Ladung | Erfolgsraten-Modul |
| `success-rate:loaded` | Erfolgsraten | Signalisiert erfolgreiche Erfolgsraten-Ladung | Erfolgsraten-Modul |
| `success-rate:error` | Erfolgsraten | Signalisiert einen Erfolgsraten-Fehler | Erfolgsraten-Modul |
| `success-rate:time-range-changed` | Erfolgsraten | Signalisiert eine Zeitbereichsänderung | Erfolgsraten-Modul |
| `flakiness:loading` | Flakiness | Signalisiert laufende Flakiness-Ladung | Flakiness-Modul |
| `flakiness:loaded` | Flakiness | Signalisiert erfolgreiche Flakiness-Ladung | Flakiness-Modul |
| `flakiness:error` | Flakiness | Signalisiert einen Flakiness-Fehler | Flakiness-Modul |
| `flakiness:days-changed` | Flakiness | Signalisiert eine Änderung des Tagesbereichs | Flakiness-Modul |

#### 9.3.2 Event-Details

Jedes Event trägt typisierte Nutzdaten in seiner `detail`-Eigenschaft:

```typescript
// Beispiel für Dashboard-Event-Details
interface DashboardEventDetail {
  source: string;        // Modul, das das Event ausgelöst hat
  message?: string;      // Optionale Nachricht
  data?: unknown;        // Optionale Daten
  error?: Error | unknown; // Optionaler Fehler
}

// Beispiel für moduleigene Event-Details
interface LogsEventDetail {
  source: string;
  message?: string;
  data?: LogEntry[] | unknown;
  error?: Error | unknown;
  filter?: LogFilter;
}
```

#### 9.3.3 Event-Dispatching

Jedes Modul implementiert eine standardisierte Dispatch-Funktion, die sowohl moduleigene als auch Dashboard-weite Events sendet:

```typescript
function dispatchLogsEvent(eventType: LogsEventType, detail: Partial<LogsEventDetail>): void {
  // Moduleigenes Event senden
  const event = new CustomEvent(eventType, {
    bubbles: true,
    cancelable: true,
    detail: { source: 'LogsViewer', ...detail }
  });
  document.dispatchEvent(event);
  
  // Auf Dashboard-Event mappen und senden
  // z.B. logs:loading -> data:loading
}
```

#### 9.3.4 Event-Listening

Module können sowohl auf ihre eigenen Events als auch auf Dashboard-weite Events reagieren:

```typescript
document.addEventListener('data:loading', (event: Event) => {
  const customEvent = event as CustomEvent<{source: string; message?: string}>;
  if (customEvent.detail.source === 'LogsViewer') {
    // Lade-Indikator anzeigen
  }
});
```

## 10. Build-Struktur und Linting-Konfiguration

### 10.1 Build-Ordner-Struktur

Das Projekt verwendet zwei separate Build-Ordner für unterschiedliche Zwecke:

| Build-Ordner | Pfad | Zweck |
|-------------|------|-------|
| Backend-Build | `/dist/` | Kompilierte TypeScript-Dateien des Backends (Server, Utilities) |
| Frontend-Build | `/public/js/dist/` | Mit esbuild gebundelte Frontend-TypeScript-Module |

#### Build-Prozesse

1. **Backend-Build**: 
   - Verwendet den TypeScript-Compiler (tsc)
   - Konfiguriert in `tsconfig.json`
   - Ausgabe nach `/dist/`
   - Build-Befehl: `npm run build`

2. **Frontend-Build**:
   - Verwendet esbuild für schnelles Bundling
   - Konfiguriert in `esbuild.config.ts`
   - Ausgabe nach `/public/js/dist/`
   - Build-Befehl: `npm run build:frontend` oder `npx ts-node esbuild.config.ts`

### 10.2 ESLint-Konfiguration und bekannte Probleme

Die ESLint-Konfiguration ist so eingerichtet, dass kompilierte und gebundelte Dateien ignoriert werden sollten:

```bash
# Standardmäßig ignorierte Verzeichnisse in .eslintignore
node_modules/
dist/
coverage/
public/js/dist/
public/js/vendor/
public/js/metrics/archive/

# Legacy-Dateien (werden durch TypeScript-Dateien ersetzt)
server-complete.js

# Build-Skripte
scripts/js-to-ts-rename.js
```

**Bekannte Probleme:**

- Trotz korrekter `.eslintignore`-Konfiguration werden manchmal kompilierte Dateien in den Build-Ordnern von ESLint geprüft
- Archivierte JavaScript-Dateien enthalten Syntax- und Linting-Fehler, die für die aktuelle Entwicklung nicht relevant sind
- Legacy-Code wie `server-complete.js` verwendet CommonJS-Module, was zu `no-undef`-Warnungen für `require`, `module`, `exports` etc. führt

**Lösungsansätze:**

1. Für die Entwicklung: `npm run lint:src` verwenden, um nur relevante Quelldateien zu prüfen
2. Für CI/CD-Pipelines: Build-Artefakte aus dem Linting-Prozess explizit ausschließen
3. Bei der Migration zu TypeScript: Module schrittweise konvertieren und dabei ESLint-Regeln anpassen

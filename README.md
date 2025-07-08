# UX-Test-Dashboard

Eine Web-Anwendung zur Visualisierung und Analyse von UI/UX-Testdaten, Metriken und Ergebnissen für Qualitätssicherungs- und Entwicklungsteams.

## Features

- 📊 Visualisierung von Erfolgsraten und Test-Trends
- 🔍 Detaillierte Analyse von Flakiness-Problemen
- 📝 Logs-Visualisierung und -Filterung
- 🧪 Test-Analyse für Komplexität und Abdeckung
- 📈 Interaktive Charts mit Chart.js
- 🚀 Leichte REST API für Datenzugriff

## Technologie-Stack

- **Backend**: Node.js mit Express
- **Frontend**: HTML/CSS/JavaScript/TypeScript
- **Visualisierung**: Chart.js
- **Styling**: Bootstrap
- **Build-Tools**: esbuild, TypeScript-Compiler

## Setup

1. Abhängigkeiten installieren:
   ```
   npm install
   ```

2. Entwicklungsserver starten:
   ```
   npm run dev
   ```

3. Frontend-Build ausführen:
   ```
   npx ts-node esbuild.config.ts
   ```

## Projekt-Struktur

```
/
├── docs/               # Projektdokumentation
├── public/            
│   ├── css/           # Stylesheets
│   ├── js/            
│   │   ├── metrics/   # JavaScript-Module (Legacy)
│   │   ├── metrics-ts/# TypeScript-Module (Migriert)
│   │   └── dist/      # Kompilierte Frontend-Assets
│   └── index.html     # Hauptansicht
├── routes/            # Express-Routen
├── scripts/           # Hilfsskripte
├── test/              # Tests
├── types/             # TypeScript-Typdefinitionen
├── server.ts          # Server-Hauptdatei
└── tsconfig.json      # TypeScript-Konfiguration
```

## TypeScript-Migration

Dieses Projekt durchläuft derzeit eine inkrementelle Migration von JavaScript zu TypeScript. Details zum Migrationsfortschritt und -plan finden sich in der [TypeScript-Migrations-Roadmap](docs/typescript-migration-roadmap.md).

## Lizenz

MIT

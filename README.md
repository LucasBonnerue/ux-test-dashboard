# UX-Test-Dashboard

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chart-dot-js&logoColor=white)
![Status](https://img.shields.io/badge/status-einsatzbereit-brightgreen.svg)
![Test Coverage](https://img.shields.io/badge/test%20coverage-event%20system-blue.svg)

> Umfassende Test-Analyse und Qualitätsüberwachung für UI-Tests mit vollständiger TypeScript-Implementierung, modularer Frontend-Architektur und ereignisbasiertem Kommunikationssystem

## Inhaltsverzeichnis

- [Über das Projekt](#-über-das-projekt)
- [Hauptfunktionen](#-hauptfunktionen)
- [Technologie-Stack](#-technologie-stack)
- [Schnellstart](#-schnellstart)
- [Projektstruktur](#-projektstruktur)
- [Architektur](#-architektur)
- [Migration zu TypeScript](#-migration-zu-typescript)
- [Dokumentation](#-dokumentation)
- [Aktuelle Entwicklung](#-aktuelle-entwicklung)
- [Lizenz](#-lizenz)

## Über das Projekt

UX-Test-Dashboard ist eine spezialisierte Anwendung zur Visualisierung und Analyse von UI-Test-Ergebnissen. Der Fokus liegt auf der Identifikation von Flakiness, der Verfolgung von Erfolgsraten und der effizienten Analyse von Testprotokollen. Das Projekt wurde von JavaScript zu TypeScript migriert und verwendet ein modernes, event-basiertes Frontend-Framework für verbesserte Wartbarkeit und Typsicherheit.

## Hauptfunktionen

- **Flakiness-Analyse**: Identifizierung und Visualisierung flakiger Tests mit Trend-Analyse
- **Erfolgsraten-Monitoring**: Zeitreihenanalyse und Vergleich von Test-Erfolgsraten
- **Log-Management**: Echtzeit-Filterung, Visualisierung und Analyse von Testprotokollen
- **Test-Komplexitätsanalyse**: Bewertung der Testabdeckung und -komplexität
- **Interaktive Dashboards**: Anpassbare Chart.js-basierte Visualisierungen
- **RESTful API**: Umfassende API für Datenintegration
- **Event-basierte Architektur**: Modulare Frontend-Kommunikation durch typisierte Events

## Technologie-Stack

### Backend

- **Node.js**: JavaScript-Runtime
- **Express**: Web-Framework für APIs
- **TypeScript**: Stark typisierte Sprache

### Frontend

- **TypeScript**: Typsicherheit für Frontend-Code
- **Chart.js**: Interaktive Datenvisualisierung
- **Bootstrap 5**: Responsive UI-Komponenten
- **CustomEvent API**: Event-basierte Modularisierung

### Build & Tools

- **esbuild**: Schneller JavaScript-Bundler
- **ESLint**: Code-Qualitätssicherung
- **ts-node**: TypeScript-Ausführung ohne Kompilierung

## Schnellstart

```bash
# Repository klonen
git clone [repository-url]
cd ux-test-dashboard

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Frontend und Backend bauen
npm run build

# Tests ausführen
npm test
```

Der Server ist dann unter http://localhost:3000 verfügbar

## Projektstruktur

```bash
project-root/
├── public/             # Öffentliche Dateien
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript-Dateien (TS-Compilate)
│   │   └── metrics-ts/  # TypeScript-Module
│   └── index.html     # Hauptseite
├── src/               # TypeScript-Quellcode
│   ├── models/        # Datenmodelle
│   ├── services/      # Backend-Dienste
│   ├── controllers/   # Controller
│   └── routes/        # API-Routen
├── test/              # Testdateien
│   ├── unit/          # Unit-Tests
│   │   ├── event-system.test.ts    # Event-System-Tests
│   │   ├── success-rate-events.test.ts  # Success-Rate-Modul-Tests
│   │   ├── flakiness-events.test.ts     # Flakiness-Modul-Tests
│   │   └── types.d.ts               # Typdefinitionen für Tests
│   └── run-tests.js   # Test-Runner
├── docs/              # Dokumentation
│   ├── PROJECT-CONTEXT.md           # Projektkontext und Details
│   ├── typescript-migration.md      # Migrationsdokumentation
│   └── typescript-migration-roadmap.md  # Migrationsfahrplan
├── esbuild.config.ts  # Frontend-Build-Konfiguration
└── server.ts         # Server-Hauptdatei
```

## Architektur

Dieses Projekt durchläuft derzeit eine inkrementelle Migration von JavaScript zu TypeScript. Details zum Migrationsfortschritt und -plan finden sich in der [TypeScript-Migrations-Roadmap](docs/typescript-migration-roadmap.md).

## Lizenz

MIT

/**
 * UX-Test-Dashboard Validator
 *
 * Dieses Skript prüft den Status aller Komponenten, die in der PROJECT-CONTEXT.md
 * als "abgeschlossen" oder "aktiv" gekennzeichnet sind.
 */

import * as fs from "fs";
import * as path from "path";
import logger, { createComponentLogger } from "./logger";

// Komponenten-Logger
const log = createComponentLogger("DashboardValidator");

// Pfade zu wichtigen Dateien und Komponenten
const PATHS = {
  // Analyse-Komponenten
  testAnalyzer: path.resolve(__dirname, "./test-analyzer.ts"),
  testRunner: path.resolve(__dirname, "./test-runner.ts"),

  // API-Routen
  routes: {
    testAnalysis: path.resolve(__dirname, "../routes/test-analysis.ts"),
    logs: path.resolve(__dirname, "../routes/logs.ts"),
    testExecution: path.resolve(__dirname, "../routes/test-execution.ts"),
  },

  // Frontend-Komponenten
  frontend: {
    successRateView: path.resolve(
      __dirname,
      "../public/js/metrics/success-rate-view.js",
    ),
    flakinessView: path.resolve(
      __dirname,
      "../public/js/metrics/flakiness-view.js",
    ),
    dashboard: path.resolve(__dirname, "../index.html"),
  },

  // Ergebnisse und Logs
  results: path.resolve(__dirname, "../results"),
  logs: path.resolve(__dirname, "../logs"),
};

// Komponenten und erwarteter Status basierend auf der Dokumentation
interface ComponentStatus {
  name: string;
  path: string;
  expectedStatus: "active" | "deprecated" | "planned";
  type: "backend" | "frontend" | "api" | "data";
  validationFn: () => Promise<boolean>;
}

// Alle zu prüfenden Komponenten
const componentsToValidate: ComponentStatus[] = [
  {
    name: "Test-Analyzer",
    path: PATHS.testAnalyzer,
    expectedStatus: "active",
    type: "backend",
    validationFn: async () => validateFileExists(PATHS.testAnalyzer),
  },
  {
    name: "API-Endpunkte",
    path: PATHS.routes.testAnalysis,
    expectedStatus: "active",
    type: "api",
    validationFn: async () => validateAllApiRoutes(),
  },
  {
    name: "Logging-System",
    path: path.resolve(__dirname, "./logger.ts"),
    expectedStatus: "active",
    type: "backend",
    validationFn: async () => validateLogger(),
  },
  {
    name: "Frontend-Dashboard",
    path: PATHS.frontend.dashboard,
    expectedStatus: "active",
    type: "frontend",
    validationFn: async () => validateFileExists(PATHS.frontend.dashboard),
  },
  {
    name: "Erfolgsraten-Visualisierung",
    path: PATHS.frontend.successRateView,
    expectedStatus: "active",
    type: "frontend",
    validationFn: async () => validateSuccessRateComponent(),
  },
  {
    name: "Flakiness-Visualisierung",
    path: PATHS.frontend.flakinessView,
    expectedStatus: "active",
    type: "frontend",
    validationFn: async () => validateFlakinessComponent(),
  },
  {
    name: "server-complete.js",
    path: path.resolve(__dirname, "../server-complete.js"),
    expectedStatus: "active",
    type: "backend",
    validationFn: async () =>
      validateServerFile(path.resolve(__dirname, "../server-complete.js")),
  },
];

/**
 * Prüft, ob eine Datei existiert
 */
async function validateFileExists(filePath: string): Promise<boolean> {
  try {
    const exists = fs.existsSync(filePath);
    if (!exists) {
      log.warn(`Datei nicht gefunden: ${filePath}`);
      return false;
    }

    // Prüfe auch, ob die Datei nicht leer ist
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      log.warn(`Datei ist leer: ${filePath}`);
      return false;
    }

    log.info(`Datei existiert und hat Inhalt: ${filePath}`);
    return true;
  } catch (error) {
    log.error(`Fehler beim Prüfen der Datei ${filePath}:`, error);
    return false;
  }
}

/**
 * Validiert das Logger-System
 */
async function validateLogger(): Promise<boolean> {
  try {
    // Prüfe, ob der Logger instanziiert werden kann
    if (typeof logger === "undefined") {
      log.error("Logger-Modul ist nicht definiert");
      return false;
    }

    // Prüfe die Logger-Funktionen
    const requiredFunctions = [
      "debug",
      "info",
      "warn",
      "error",
      "configure",
      "createComponentLogger",
    ];
    const missingFunctions = requiredFunctions.filter(
      (fn) => typeof (logger as any)[fn] !== "function",
    );

    if (missingFunctions.length > 0) {
      log.error(`Logger fehlen Funktionen: ${missingFunctions.join(", ")}`);
      return false;
    }

    // Prüfe, ob der Komponenten-Logger funktioniert
    if (typeof log.info !== "function") {
      log.error("Komponenten-Logger funktioniert nicht");
      return false;
    }

    log.info("Logger-System erfolgreich validiert");
    return true;
  } catch (error) {
    log.error("Fehler bei der Logger-Validierung:", error);
    return false;
  }
}

/**
 * Validiert alle API-Routen
 */
async function validateAllApiRoutes(): Promise<boolean> {
  try {
    const routeFiles = Object.values(PATHS.routes);
    const allExist = routeFiles.every((file) => fs.existsSync(file));

    if (!allExist) {
      const missingFiles = routeFiles.filter((file) => !fs.existsSync(file));
      log.error(`Fehlende API-Routendateien: ${missingFiles.join(", ")}`);
      return false;
    }

    log.info("Alle API-Routen-Dateien existieren");
    return true;
  } catch (error) {
    log.error("Fehler bei der API-Routen-Validierung:", error);
    return false;
  }
}

/**
 * Validiert die Erfolgsraten-Komponente
 */
async function validateSuccessRateComponent(): Promise<boolean> {
  try {
    if (!(await validateFileExists(PATHS.frontend.successRateView))) {
      return false;
    }

    // Prüfe den Inhalt auf wichtige Funktionen
    const content = fs.readFileSync(PATHS.frontend.successRateView, "utf-8");

    // Wichtige Schlüsselelemente, die in der Datei vorhanden sein sollten
    const requiredElements = [
      "Chart", // Chart.js Nutzung
      "success-rate", // CSS-Klasse oder ID
      "fetch", // API-Aufruf
    ];

    const missingElements = requiredElements.filter(
      (element) => !content.includes(element),
    );

    if (missingElements.length > 0) {
      log.error(
        `Erfolgsraten-Komponente fehlen wichtige Elemente: ${missingElements.join(", ")}`,
      );
      return false;
    }

    log.info("Erfolgsraten-Komponente erfolgreich validiert");
    return true;
  } catch (error) {
    log.error("Fehler bei der Validierung der Erfolgsraten-Komponente:", error);
    return false;
  }
}

/**
 * Validiert die Flakiness-Komponente
 */
async function validateFlakinessComponent(): Promise<boolean> {
  try {
    if (!(await validateFileExists(PATHS.frontend.flakinessView))) {
      return false;
    }

    // Prüfe den Inhalt auf wichtige Funktionen
    const content = fs.readFileSync(PATHS.frontend.flakinessView, "utf-8");

    // Wichtige Schlüsselelemente, die in der Datei vorhanden sein sollten
    const requiredElements = [
      "Chart", // Chart.js Nutzung
      "flakiness", // CSS-Klasse oder ID
      "fetch", // API-Aufruf
    ];

    const missingElements = requiredElements.filter(
      (element) => !content.includes(element),
    );

    if (missingElements.length > 0) {
      log.error(
        `Flakiness-Komponente fehlen wichtige Elemente: ${missingElements.join(", ")}`,
      );
      return false;
    }

    log.info("Flakiness-Komponente erfolgreich validiert");
    return true;
  } catch (error) {
    log.error("Fehler bei der Validierung der Flakiness-Komponente:", error);
    return false;
  }
}

/**
 * Validiert die Server-Datei
 */
async function validateServerFile(filePath: string): Promise<boolean> {
  console.log(
    `[${new Date().toISOString()}] [INFO] [DashboardValidator] Validiere Komponente: server-complete.js (backend)`,
  );
  if (!fs.existsSync(filePath)) {
    console.log(
      `[${new Date().toISOString()}] [ERROR] [DashboardValidator] Server-Datei nicht gefunden: ${filePath}`,
    );
    return false;
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  if (!fileContent || fileContent.trim().length < 100) {
    console.log(
      `[${new Date().toISOString()}] [ERROR] [DashboardValidator] Server-Datei existiert, hat aber nicht genügend Inhalt`,
    );
    return false;
  }

  console.log(
    `[${new Date().toISOString()}] [INFO] [DashboardValidator] Datei existiert und hat Inhalt: ${filePath}`,
  );

  // Prüfe auf wichtige Server-Elemente (direkt oder alternativ implementiert)
  const hasListenFunction =
    fileContent.includes("app.listen") ||
    (fileContent.includes("server.listen") &&
      fileContent.includes("createServer"));

  // Prüfe auf API-Endpunkte/Routen (entweder mit Router oder direkt auf app)
  const hasRouting =
    fileContent.includes("router") ||
    fileContent.includes("app.get(") ||
    fileContent.includes("app.post(");

  if (!hasListenFunction || !hasRouting) {
    const missingElements = [];
    if (!hasListenFunction)
      missingElements.push("Server-Listen-Funktionalität");
    if (!hasRouting) missingElements.push("API-Routen-Definition");

    console.log(
      `[${new Date().toISOString()}] [ERROR] [DashboardValidator] Server-Datei fehlen wichtige Elemente: ${missingElements.join(", ")}`,
    );
    return false;
  }

  console.log(
    `[${new Date().toISOString()}] [INFO] [DashboardValidator] Server-Datei enthält alle erforderlichen Elemente`,
  );
  return true;
}

/**
 * Hauptfunktion zur Validierung aller Komponenten
 */
export async function validateAllComponents(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: { component: string; status: boolean; message: string }[];
}> {
  log.info("Starte Validierung aller Dashboard-Komponenten...");

  const results: { component: string; status: boolean; message: string }[] = [];
  let passed = 0;
  let failed = 0;

  for (const component of componentsToValidate) {
    log.info(`Validiere Komponente: ${component.name} (${component.type})`);

    try {
      const isValid = await component.validationFn();

      if (isValid) {
        log.info(
          `✅ Komponente ${component.name} ist aktiv und funktionsfähig`,
        );
        results.push({
          component: component.name,
          status: true,
          message: `Komponente ist aktiv und funktionsfähig`,
        });
        passed++;
      } else {
        log.warn(`❌ Komponente ${component.name} hat Probleme`);
        results.push({
          component: component.name,
          status: false,
          message: `Komponente ist nicht voll funktionsfähig`,
        });
        failed++;
      }
    } catch (error) {
      log.error(`Fehler bei der Validierung von ${component.name}:`, error);
      results.push({
        component: component.name,
        status: false,
        message: `Fehler bei der Validierung: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
      });
      failed++;
    }
  }

  log.info(
    `Validierung abgeschlossen: ${passed} von ${componentsToValidate.length} Komponenten erfolgreich`,
  );

  return {
    total: componentsToValidate.length,
    passed,
    failed,
    results,
  };
}

// Wenn direkt ausgeführt, starte die Validierung
if (require.main === module) {
  validateAllComponents()
    .then((results) => {
      console.log("=== DASHBOARD-KOMPONENTEN-VALIDIERUNG ===");
      console.log(
        `Gesamt: ${results.total}, Bestanden: ${results.passed}, Fehlgeschlagen: ${results.failed}`,
      );
      console.log("=== DETAILERGEBNISSE ===");

      results.results.forEach((result) => {
        const status = result.status ? "✅ AKTIV" : "❌ PROBLEM";
        console.log(`${status}: ${result.component} - ${result.message}`);
      });

      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Fehler bei der Dashboard-Validierung:", error);
      process.exit(1);
    });
}

// Exportiere die Hauptfunktion
export default validateAllComponents;

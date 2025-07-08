/**
 * Test-Ausführung API-Routen
 *
 * Diese Routen stellen Funktionen für die Testausführung und -verwaltung bereit.
 * Enthalten sind APIs zum Starten, Überwachen und Stoppen von Playwright-Tests.
 */

import express from "express";
import type { Request, Response, Router } from "express";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { TestRunner } from "../utils/test-runner";
import logger, { createComponentLogger } from "../utils/logger";

// TypeScript-Deklaration für Express-Router verbessern
declare global {
  namespace Express {
    interface Request {
      // Zusätzliche Eigenschaften, falls benötigt
    }
  }
}

// Typdefinitionen für API-Anfragen
interface RunTestRequest {
  testFile: string;
  browser?: string;
  headless?: boolean;
  timeout?: number;
}

interface RunTestsRequest {
  testFiles: string[];
  browsers?: string[];
  headless?: boolean;
  timeout?: number;
  retries?: number;
  captureScreenshots?: boolean;
}

interface RunIdParams {
  runId: string;
}

// Explizit typisierten Router erstellen
const router: Router = express.Router();

// Komponenten-spezifischer Logger
const log = createComponentLogger("TestExecution");

// Aktive Testläufe
const activeTestRuns = new Map();

// Testlauf-Historie (zuletzt 50 Einträge)
const MAX_HISTORY_SIZE = 50;
let testRunHistory: any[] = [];

/**
 * Fügt einen Testlauf zur Historie hinzu
 */
function addToTestHistory(testRun: any): void {
  // Zur Geschichte hinzufügen
  testRunHistory.unshift(testRun);

  // Auf maximale Größe begrenzen
  if (testRunHistory.length > MAX_HISTORY_SIZE) {
    testRunHistory = testRunHistory.slice(0, MAX_HISTORY_SIZE);
  }

  // Aktiven Testlauf entfernen, wenn er abgeschlossen ist
  if (
    testRun.status === "completed" ||
    testRun.status === "failed" ||
    testRun.status === "aborted"
  ) {
    activeTestRuns.delete(testRun.runId);
    log.info(
      `Testlauf ${testRun.runId} abgeschlossen und in die Historie verschoben`,
      {
        status: testRun.status,
        duration:
          new Date(testRun.endTime).getTime() -
          new Date(testRun.startTime).getTime(),
      },
    );
  }

  // Testhistorie speichern
  try {
    const historyDir = path.join(__dirname, "../history");
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(historyDir, "test-history.json"),
      JSON.stringify(testRunHistory, null, 2),
    );
  } catch (error) {
    log.error("Fehler beim Speichern der Test-Historie:", error);
  }
}

/**
 * Lädt die Testhistorie aus der Datei
 */
function loadTestHistory(): void {
  try {
    const historyFile = path.join(__dirname, "../history/test-history.json");

    if (fs.existsSync(historyFile)) {
      const historyData = fs.readFileSync(historyFile, "utf8");
      testRunHistory = JSON.parse(historyData);
      log.info(`Test-Historie geladen: ${testRunHistory.length} Einträge`);
    }
  } catch (error) {
    log.error("Fehler beim Laden der Test-Historie:", error);
  }
}

// Historie beim Start laden
loadTestHistory();

/**
 * GET /api/playwright-tests
 * Listet alle verfügbaren Playwright-Tests auf
 */
router.get("/playwright-tests", async function (req: Request, res: Response) {
  try {
    log.info("API-Anfrage: Liste aller Playwright-Tests");
    const testRunner = new TestRunner();
    const tests = await testRunner.listAvailableTests();

    res.json({
      status: "success",
      tests,
    });
  } catch (error) {
    log.error("Fehler beim Abrufen der Tests:", error);
    res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
    });
  }
});

/**
 * GET /api/test-run-status/:runId
 * Liefert den Status eines Testlaufs
 */
router.get(
  "/test-run-status/:runId",
  function getTestRunStatus(req: Request, res: Response) {
    try {
      log.info("API-Anfrage: Status eines Testlaufs");
      const testRun = activeTestRuns.get(req.params.runId);

      if (!testRun) {
        return res.status(404).json({
          status: "error",
          message: "Testlauf nicht gefunden",
        });
      }

      res.json({
        status: "success",
        testRun,
      });
    } catch (error) {
      log.error("Fehler beim Abrufen des Testlaufs:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  },
);

/**
 * POST /api/run-playwright-test
 * Führt einen einzelnen Playwright-Test aus
 */
router.post(
  "/run-playwright-test",
  async function (req: Request, res: Response) {
    try {
      const {
        testFile,
        browser = "chromium",
        headless = true,
        timeout,
      } = req.body;

      if (!testFile) {
        return res.status(400).json({
          status: "error",
          message: "Test-Datei nicht angegeben",
        });
      }

      log.info("Starte Playwright-Test", { testFile, browser, headless });

      // Generiere eine eindeutige Run-ID
      const runId = uuidv4();

      // Erstelle ein Testlauf-Objekt
      const testRun = {
        runId,
        startTime: new Date().toISOString(),
        endTime: null,
        status: "running",
        testFiles: [testFile],
        config: {
          browsers: [browser],
          headless,
          timeout,
        },
        logs: [],
        progress: {
          total: 1,
          completed: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
        },
      };

      // Speichere den Testlauf
      activeTestRuns.set(runId, testRun);

      // Führe den Test asynchron aus
      const testRunner = new TestRunner();
      testRunner
        .runTest(
          testFile,
          {
            browser,
            headless,
            timeout,
            runId,
          },
          (message) => {
            // Log-Nachricht zum Testlauf hinzufügen
            const testRunInstance = activeTestRuns.get(runId);
            if (testRunInstance) {
              testRunInstance.logs.push(message);

              // Begrenze die Anzahl der Log-Einträge
              if (testRunInstance.logs.length > 1000) {
                testRunInstance.logs = testRunInstance.logs.slice(
                  testRunInstance.logs.length - 1000,
                );
              }
            }
          },
        )
        .then((result) => {
          // Test abgeschlossen
          log.info(`Test ${testFile} abgeschlossen`, { result });

          const currentRun = activeTestRuns.get(runId);
          if (currentRun) {
            currentRun.endTime = new Date().toISOString();
            currentRun.status = result.success ? "completed" : "failed";

            // Fortschritt aktualisieren
            currentRun.progress.completed = 1;
            currentRun.progress.passed = result.success ? 1 : 0;
            currentRun.progress.failed = result.success ? 0 : 1;

            // Zur Historie hinzufügen
            addToTestHistory({ ...currentRun });
          }
        })
        .catch((error: any) => {
          // Test fehlgeschlagen
          log.error("Test fehlgeschlagen:", error);

          const currentRun = activeTestRuns.get(runId);
          if (currentRun) {
            currentRun.endTime = new Date().toISOString();
            currentRun.status = "failed";
            currentRun.logs.push(
              `Fehler: ${error.message || "Unbekannter Fehler"}`,
            );

            // Fortschritt aktualisieren
            currentRun.progress.completed = 1;
            currentRun.progress.failed = 1;

            // Zur Historie hinzufügen
            addToTestHistory({ ...currentRun });
          }
        });

      res.json({
        status: "success",
        runId,
      });
    } catch (error) {
      log.error("Fehler beim Starten des Tests:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  },
);

/**
 * POST /api/run-playwright-tests
 * Führt mehrere Playwright-Tests aus
 */
router.post(
  "/run-playwright-tests",
  async function (req: Request, res: Response) {
    try {
      const {
        testFiles,
        browsers = ["chromium"],
        headless = true,
        timeout,
        retries = 0,
        captureScreenshots = false,
      } = req.body;

      if (!testFiles || !Array.isArray(testFiles) || testFiles.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Keine Test-Dateien angegeben",
        });
      }

      log.info("Starte mehrere Playwright-Tests", {
        testCount: testFiles.length,
        browsers,
        headless,
      });

      // Generiere eine eindeutige Run-ID
      const runId = uuidv4();

      // Erstelle ein Testlauf-Objekt
      const testRun = {
        runId,
        startTime: new Date().toISOString(),
        endTime: null,
        status: "running",
        testFiles,
        config: {
          browsers,
          headless,
          timeout,
          retries,
          captureScreenshots,
        },
        logs: [],
        progress: {
          total: testFiles.length * browsers.length,
          completed: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
        },
      };

      // Speichere den Testlauf
      activeTestRuns.set(runId, testRun);

      // Führe die Tests asynchron aus
      const testRunner = new TestRunner();
      testRunner
        .runTests(
          testFiles,
          {
            browsers,
            headless,
            timeout,
            retries,
            captureScreenshots,
            runId,
          },
          // Log-Callback
          (message) => {
            const testRunInstance = activeTestRuns.get(runId);
            if (testRunInstance) {
              testRunInstance.logs.push(message);

              // Begrenze die Anzahl der Log-Einträge
              if (testRunInstance.logs.length > 1000) {
                testRunInstance.logs = testRunInstance.logs.slice(
                  testRunInstance.logs.length - 1000,
                );
              }
            }
          },
          // Fortschritts-Callback
          (progress) => {
            const testRunInstance = activeTestRuns.get(runId);
            if (testRunInstance) {
              testRunInstance.progress = progress;
            }
          },
        )
        .then((results) => {
          // Tests abgeschlossen
          log.info("Mehrere Tests abgeschlossen", { results });

          const currentRun = activeTestRuns.get(runId);
          if (currentRun) {
            currentRun.endTime = new Date().toISOString();
            currentRun.status = "completed";

            // Zur Historie hinzufügen
            addToTestHistory({ ...currentRun });
          }
        })
        .catch((error: any) => {
          // Tests fehlgeschlagen
          log.error("Tests fehlgeschlagen:", error);

          const currentRun = activeTestRuns.get(runId);
          if (currentRun) {
            currentRun.endTime = new Date().toISOString();
            currentRun.status = "failed";
            currentRun.logs.push(
              `Fehler: ${error.message || "Unbekannter Fehler"}`,
            );

            // Zur Historie hinzufügen
            addToTestHistory({ ...currentRun });
          }
        });

      res.json({
        status: "success",
        runId,
      });
    } catch (error) {
      log.error("Fehler beim Starten der Tests:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  },
);

export default router;

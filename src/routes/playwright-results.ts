/**
 * API-Routen für Playwright-Testergebnisse
 * TypeScript-Migration des UX-Test-Dashboards
 */

import { Router, Request, Response } from "express";
import { Logger } from "../utils/logger";
import { mockSuccessRates } from "../mocks/success-rates";

// Typdefinitionen für Playwright-Ergebnisse
export interface PlaywrightTestResult {
  runId: string;
  timestamp: number;
  runName: string;
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    suites: number;
    errors: Array<{
      message: string;
      location?: string;
    }>;
    warnings: string[];
    successRate: number;
    averageDuration: number;
  };
}

// Router erstellen
export function createPlaywrightResultsRouter(logger: Logger): Router {
  const router = Router();

  // API-Endpunkt für neueste Playwright-Ergebnisse
  router.get("/latest", (req: Request, res: Response) => {
    logger.info("API", "Neueste Testergebnisse abgerufen");

    // Beispiel-Testergebnis generieren
    const result: PlaywrightTestResult = {
      runId: `run-${Date.now()}`,
      timestamp: Date.now(),
      runName: `Run-${new Date().toISOString().slice(0, 10)}`,
      success: Math.random() > 0.2, // 80% Erfolgsrate für Demo
      summary: {
        total: mockSuccessRates.testSuccessRates.length,
        passed: mockSuccessRates.testSuccessRates.filter(
          (t) => t.lastRun.status === "passed",
        ).length,
        failed: mockSuccessRates.testSuccessRates.filter(
          (t) => t.lastRun.status === "failed",
        ).length,
        skipped: 0,
        duration: mockSuccessRates.testSuccessRates.reduce(
          (acc, t) => acc + t.lastRun.duration,
          0,
        ),
        suites: Math.ceil(mockSuccessRates.testSuccessRates.length / 3),
        errors:
          Math.random() > 0.7
            ? [{ message: "Beispiel-Fehler für Simulationszwecke" }]
            : [],
        warnings: Math.random() > 0.8 ? ["Beispiel-Warnung"] : [],
        successRate: mockSuccessRates.overallSuccessRate,
        averageDuration:
          mockSuccessRates.testSuccessRates.reduce(
            (acc, t) => acc + t.lastRun.duration,
            0,
          ) / mockSuccessRates.testSuccessRates.length,
      },
    };

    res.json(result);
  });

  // POST-Endpunkt zum Speichern von Playwright-Ergebnissen (Stub)
  router.post("/", (req: Request, res: Response) => {
    try {
      logger.info(
        "API",
        `Neue Playwright-Testergebnisse empfangen: ${req.body.runName || "Unbekannt"}`,
      );

      // In einer echten Implementierung würden die Ergebnisse hier gespeichert werden

      res.json({
        success: true,
        runId: `run-${Date.now()}`,
        message: "Testergebnisse erfolgreich gespeichert",
      });
    } catch (error) {
      logger.error(
        "API",
        `Fehler beim Speichern der Testergebnisse: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({
        success: false,
        error: `Fehler beim Speichern der Testergebnisse: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  return router;
}

export default createPlaywrightResultsRouter;

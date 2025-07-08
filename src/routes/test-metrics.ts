/**
 * API-Routen für Testmetriken (Erfolgsraten und Flakiness)
 * TypeScript-Migration des UX-Test-Dashboards
 */

import { Router, Request, Response } from "express";
import { mockSuccessRates, SuccessRatesReport } from "../mocks/success-rates";
import {
  mockFlakinessReport,
  FlakinessReport,
} from "../mocks/flakiness-report";
import { Logger } from "../utils/logger";

// Router erstellen
export function createTestMetricsRouter(logger: Logger): Router {
  const router = Router();

  // Erfolgsraten-API
  router.get("/success-rates", (req: Request, res: Response) => {
    // Parameter für Zeitraum und Filterung verarbeiten
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    // Logging
    logger.info("API", `Erfolgsraten abgerufen: Zeitraum=${days} Tage`);

    // Kopie der Daten für Filterung erstellen
    const filteredData: SuccessRatesReport = JSON.parse(
      JSON.stringify(mockSuccessRates),
    );

    // Zeitraumfilterung (simuliert)
    if (days !== 30) {
      // Anpassung des Zeitraums
      filteredData.timeRange.start = Date.now() - days * 86400000;

      // Filterung der Testdaten (vereinfacht)
      filteredData.testSuccessRates = filteredData.testSuccessRates.map(
        (test) => {
          const filteredTest = { ...test };

          // History auf den Zeitraum beschränken
          filteredTest.history = test.history.filter(
            (run) => run.timestamp >= filteredData.timeRange.start,
          );

          // Erfolgsrate neu berechnen falls nötig
          if (filteredTest.history.length !== test.history.length) {
            const successful = filteredTest.history.filter(
              (run) => run.status === "passed",
            ).length;
            filteredTest.successRate =
              filteredTest.history.length > 0
                ? (successful / filteredTest.history.length) * 100
                : 0;
          }

          return filteredTest;
        },
      );

      // Gesamterfolgsrate neu berechnen
      if (filteredData.testSuccessRates.length > 0) {
        const sum = filteredData.testSuccessRates.reduce(
          (acc, test) => acc + test.successRate,
          0,
        );
        filteredData.overallSuccessRate =
          sum / filteredData.testSuccessRates.length;
      } else {
        filteredData.overallSuccessRate = 0;
      }
    }

    res.json(filteredData);
  });

  // Flakiness-API
  router.get("/flakiness", (req: Request, res: Response) => {
    // Parameter für Zeitraum und Schwellenwert verarbeiten
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const threshold = req.query.threshold
      ? parseInt(req.query.threshold as string)
      : 20;

    // Logging
    logger.info(
      "API",
      `Flakiness-Bericht abgerufen: Zeitraum=${days} Tage, Schwellenwert=${threshold}`,
    );

    // Kopie der Daten für Filterung erstellen
    const filteredData: FlakinessReport = JSON.parse(
      JSON.stringify(mockFlakinessReport),
    );

    // Zeitraumfilterung (simuliert)
    if (days !== 30) {
      // Anpassung des Zeitraums
      filteredData.timePeriod.start = Date.now() - days * 86400000;

      // Einfache Simulation der Datenfilterung nach Zeitraum
      // In einer echten Anwendung würden hier tatsächliche Daten gefiltert
    }

    // Schwellenwertfilterung
    if (threshold !== 20) {
      filteredData.flakinessThreshold = threshold;
    }

    // Filtern nach Schwellenwert
    filteredData.flakinessMeasures = filteredData.flakinessMeasures.filter(
      (test) => test.flakinessScore >= threshold,
    );
    filteredData.flakyTestsCount = filteredData.flakinessMeasures.length;

    res.json(filteredData);
  });

  // API-Endpunkt für instabile Tests
  router.get("/flaky-tests", (req: Request, res: Response) => {
    try {
      // Parameter verarbeiten
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      // Logging
      logger.info("API", `Instabile Tests abgerufen: Limit=${limit}`);

      // Instabile Tests filtern und sortieren
      const flakyTests = [...mockFlakinessReport.flakinessMeasures]
        .sort((a, b) => b.flakinessScore - a.flakinessScore)
        .slice(0, limit);

      res.json({
        success: true,
        flakyTests,
        count: flakyTests.length,
        totalAnalyzed: mockFlakinessReport.totalTestsAnalyzed,
      });
    } catch (error) {
      logger.error(
        "API",
        `Fehler beim Abrufen der instabilen Tests: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({
        success: false,
        error: `Fehler beim Abrufen der instabilen Tests: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  return router;
}

export default createTestMetricsRouter;

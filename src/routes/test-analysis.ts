/**
 * API-Routen für Test-Analyse
 * TypeScript-Migration des UX-Test-Dashboards
 */

import { Router, Request, Response } from "express";
import * as path from "path";
import { Logger } from "../utils/logger";
import { TestAnalyzer, createTestAnalyzer } from "../services/test-analyzer";
import { TestMetadata } from "../types/test-analysis";

// Konfiguration
interface TestAnalysisConfig {
  testDir: string;
  resultsDir: string;
}

// Router erstellen
export function createTestAnalysisRouter(
  logger: Logger,
  config: TestAnalysisConfig,
): Router {
  const router = Router();

  // TestAnalyzer initialisieren
  const analyzer = createTestAnalyzer({
    testDir: config.testDir,
    resultsDir: config.resultsDir,
    logger,
  });

  // GET-Route für Test-Analyse
  router.get("/analyze", async (req: Request, res: Response) => {
    try {
      const searchPattern = req.query.pattern as string;
      logger.info(
        "API",
        `Test-Analyse angefordert${searchPattern ? ` für Pattern: ${searchPattern}` : ""}`,
      );

      // Tests analysieren
      const results = await analyzer.analyzeTestSuite(searchPattern);

      res.json({
        success: true,
        ...results,
      });
    } catch (error) {
      logger.error(
        "API",
        `Fehler bei der Test-Analyse: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({
        success: false,
        error: `Fehler bei der Test-Analyse: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  // GET-Route für einen einzelnen Test
  router.get("/test/:testId", async (req: Request, res: Response) => {
    try {
      const testId = req.params.testId;
      logger.info("API", `Test-Analyse für Test-ID: ${testId}`);

      // Testpfad zusammenbauen
      const testFilePath = path.join(config.testDir, testId);

      // Test analysieren
      const metadata = await analyzer.analyzeTest(testFilePath);

      res.json({
        success: true,
        testMetadata: metadata,
      });
    } catch (error) {
      logger.error(
        "API",
        `Fehler bei der Analyse des Tests: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({
        success: false,
        error: `Fehler bei der Analyse des Tests: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  // GET-Route für Coverage-Matrix
  router.get("/coverage", async (req: Request, res: Response) => {
    try {
      logger.info("API", "Test-Coverage-Matrix angefordert");

      // Alle Tests analysieren
      const testMetadata = await analyzer.analyzeAllTests();

      // Coverage-Matrix generieren
      const coverageMatrix = analyzer.generateCoverageMatrix(testMetadata);

      res.json({
        success: true,
        coverageMatrix,
      });
    } catch (error) {
      logger.error(
        "API",
        `Fehler beim Abrufen der Test-Coverage: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({
        success: false,
        error: `Fehler beim Abrufen der Test-Coverage: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  // POST-Route für das Speichern von Test-Metadaten (z.B. nach CI/CD-Läufen)
  router.post("/metadata", (req: Request, res: Response) => {
    try {
      logger.info("API", "Test-Metadaten empfangen");

      const metadata: TestMetadata[] = req.body.metadata;

      if (!Array.isArray(metadata)) {
        return res.status(400).json({
          success: false,
          error: "Ungültiges Format der Test-Metadaten. Array erwartet.",
        });
      }

      // Hier würde man die Metadaten normalerweise speichern
      // In dieser Demo-Version loggen wir sie einfach
      logger.info("API", `${metadata.length} Test-Metadaten empfangen`);

      res.json({
        success: true,
        message: `${metadata.length} Test-Metadaten erfolgreich verarbeitet`,
      });
    } catch (error) {
      logger.error(
        "API",
        `Fehler beim Speichern der Test-Metadaten: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({
        success: false,
        error: `Fehler beim Speichern der Test-Metadaten: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  return router;
}

export default createTestAnalysisRouter;

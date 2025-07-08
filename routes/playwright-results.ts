/**
 * Playwright-Testergebnisse API-Routen
 *
 * Implementiert die API-Endpunkte zur Verwaltung von Playwright-Testergebnissen
 * mit Integration der Erfolgsraten und Flakiness-Metriken.
 */

import { Router } from "express";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import SuccessRateTracker from "../utils/metrics/success-rate-tracker";
import FlakinessAnalyzer from "../utils/metrics/flakiness-analyzer";
import {
  PlaywrightTestResultFile,
  PlaywrightTestRunConfig,
  PlaywrightSingleTestResult,
} from "../types/playwright-results";
import { TestChange, TestComparison } from "../types/test-changes";

const router = Router();
const baseDir = process.cwd();
const resultsDir = path.join(baseDir, "results", "playwright-results");
const successRateTracker = new SuccessRateTracker(baseDir);
const flakinessAnalyzer = new FlakinessAnalyzer(baseDir);

// Verzeichnis erstellen, wenn nicht vorhanden
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

/**
 * POST /api/playwright-results
 * Speichert ein neues Testergebnis und aktualisiert Metriken
 */
router.post("/", async (req, res) => {
  try {
    const { output, config, runName } = req.body;

    if (!output || !config) {
      return res.status(400).json({
        success: false,
        error: "Output und Config sind erforderlich",
      });
    }

    // Parsing der Playwright-Ausgabe (vereinfachte Implementierung)
    const testResults = parsePlaywrightOutput(output);

    // Metrics berechnen
    const metrics = calculateMetrics(testResults);

    // Testergebnis speichern
    const runId = uuidv4();
    const timestamp = Date.now();
    const success = metrics.failed === 0;

    const resultFile: PlaywrightTestResultFile = {
      runId,
      timestamp,
      runName:
        runName || `Testlauf ${new Date(timestamp).toLocaleString("de-DE")}`,
      success,
      testResults,
      config,
      metrics,
    };

    // In Datei speichern
    const resultPath = path.join(resultsDir, `${runId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(resultFile, null, 2));

    // Erfolgsraten und Flakiness aktualisieren
    successRateTracker.updateSuccessRates(resultFile);
    flakinessAnalyzer.updateWithNewTestResult(resultFile);

    res.json({
      success: true,
      runId,
      message: "Testergebnis erfolgreich gespeichert",
      metricsUpdated: true,
    });
  } catch (error) {
    console.error("Fehler beim Speichern des Testergebnisses:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Speichern des Testergebnisses: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/playwright-results
 * Gibt eine Liste aller gespeicherten Testergebnisse zurück
 */
router.get("/", (req, res) => {
  try {
    const results = loadAllTestResults();

    res.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Fehler beim Laden der Testergebnisse:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Laden der Testergebnisse: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/playwright-results/:runId
 * Gibt ein spezifisches Testergebnis zurück
 */
router.get("/:runId", (req, res) => {
  try {
    const { runId } = req.params;
    const resultPath = path.join(resultsDir, `${runId}.json`);

    if (!fs.existsSync(resultPath)) {
      return res.status(404).json({
        success: false,
        error: `Testergebnis mit ID ${runId} nicht gefunden`,
      });
    }

    const result = JSON.parse(fs.readFileSync(resultPath, "utf-8"));

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Fehler beim Laden des Testergebnisses:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Laden des Testergebnisses: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * DELETE /api/playwright-results/:runId
 * Löscht ein Testergebnis
 */
router.delete("/:runId", (req, res) => {
  try {
    const { runId } = req.params;
    const resultPath = path.join(resultsDir, `${runId}.json`);

    if (!fs.existsSync(resultPath)) {
      return res.status(404).json({
        success: false,
        error: `Testergebnis mit ID ${runId} nicht gefunden`,
      });
    }

    fs.unlinkSync(resultPath);

    res.json({
      success: true,
      message: `Testergebnis ${runId} erfolgreich gelöscht`,
    });
  } catch (error) {
    console.error("Fehler beim Löschen des Testergebnisses:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Löschen des Testergebnisses: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/playwright-results/compare/:runId1/:runId2
 * Vergleicht zwei Testergebnisse
 */
router.get("/compare/:runId1/:runId2", (req, res) => {
  try {
    const { runId1, runId2 } = req.params;

    const result1Path = path.join(resultsDir, `${runId1}.json`);
    const result2Path = path.join(resultsDir, `${runId2}.json`);

    if (!fs.existsSync(result1Path) || !fs.existsSync(result2Path)) {
      return res.status(404).json({
        success: false,
        error: "Mindestens eines der Testergebnisse wurde nicht gefunden",
      });
    }

    const result1 = JSON.parse(
      fs.readFileSync(result1Path, "utf-8"),
    ) as PlaywrightTestResultFile;
    const result2 = JSON.parse(
      fs.readFileSync(result2Path, "utf-8"),
    ) as PlaywrightTestResultFile;

    // Vergleich erstellen
    const comparison: TestComparison = {
      baseline: {
        runId: result1.runId,
        timestamp: result1.timestamp,
        runName: result1.runName,
        metrics: result1.metrics,
      },
      current: {
        runId: result2.runId,
        timestamp: result2.timestamp,
        runName: result2.runName,
        metrics: result2.metrics,
      },
      testChanges: [],
      metricsComparison: {
        durationChange:
          result2.metrics.totalDuration - result1.metrics.totalDuration,
        passRateChange: result2.metrics.passRate - result1.metrics.passRate,
        failRateChange: result2.metrics.failRate - result1.metrics.failRate,
        skipRateChange: result2.metrics.skipRate - result1.metrics.skipRate,
      },
    };

    // Für jeden Test Änderungen erfassen
    const testMap1 = new Map(
      result1.testResults.map((test) => [test.path, test]),
    );

    for (const test2 of result2.testResults) {
      const test1 = testMap1.get(test2.path);

      if (test1) {
        const statusChanged = test1.status !== test2.status;
        const durationChange = test2.duration - test1.duration;

        comparison.testChanges.push({
          filename: test2.filename,
          previousStatus: test1.status,
          currentStatus: test2.status,
          statusChanged,
          durationChange,
        });
      } else {
        // Neuer Test
        comparison.testChanges.push({
          filename: test2.filename,
          previousStatus: "new",
          currentStatus: test2.status,
          statusChanged: true,
          durationChange: test2.duration,
        });
      }
    }

    // Tests suchen, die nicht mehr vorhanden sind
    const test2Paths = new Set(result2.testResults.map((test) => test.path));
    for (const test1 of result1.testResults) {
      if (!test2Paths.has(test1.path)) {
        comparison.testChanges.push({
          filename: test1.filename,
          previousStatus: test1.status,
          currentStatus: "removed",
          statusChanged: true,
          durationChange: -test1.duration,
        });
      }
    }

    res.json({
      success: true,
      comparison,
    });
  } catch (error) {
    console.error("Fehler beim Vergleichen der Testergebnisse:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Vergleichen der Testergebnisse: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/playwright-results/latest
 * Gibt das neueste Testergebnis zurück
 */
router.get("/latest", (req, res) => {
  try {
    if (!fs.existsSync(resultsDir)) {
      return res.json({
        success: true,
        result: {},
      });
    }

    const files = fs
      .readdirSync(resultsDir)
      .filter((file) => file.endsWith(".json"));

    if (files.length === 0) {
      return res.json({
        success: true,
        result: {},
      });
    }

    // Alle Ergebnisse laden und das neueste finden
    let newestResult = null;
    let newestTimestamp = 0;

    for (const file of files) {
      try {
        const fullPath = path.join(resultsDir, file);
        const content = fs.readFileSync(fullPath, "utf-8");
        const result = JSON.parse(content);

        if (result.timestamp > newestTimestamp) {
          newestResult = result;
          newestTimestamp = result.timestamp;
        }
      } catch (error) {
        console.error(`Fehler beim Laden von ${file}:`, error);
      }
    }

    res.json({
      success: true,
      result: newestResult || {},
    });
  } catch (error) {
    console.error("Fehler beim Laden des neuesten Testergebnisses:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Laden des neuesten Testergebnisses: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * Hilfsfunktionen
 */

/**
 * Lädt alle gespeicherten Testergebnisse
 */
function loadAllTestResults() {
  if (!fs.existsSync(resultsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(resultsDir)
    .filter((file) => file.endsWith(".json"));

  return files
    .map((file) => {
      try {
        const fullPath = path.join(resultsDir, file);
        const content = fs.readFileSync(fullPath, "utf-8");
        const result = JSON.parse(content) as PlaywrightTestResultFile;

        return {
          runId: result.runId,
          timestamp: result.timestamp,
          runName: result.runName,
          success: result.success,
          testCount: result.testResults.length,
          metrics: result.metrics,
          filename: file,
        };
      } catch (error) {
        console.error(`Fehler beim Laden von ${file}:`, error);
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Berechnet die Metriken aus den Testergebnissen
 */
function calculateMetrics(testResults: PlaywrightSingleTestResult[]) {
  const passed = testResults.filter((test) => test.status === "passed").length;
  const failed = testResults.filter(
    (test) => test.status === "failed" || test.status === "timed-out",
  ).length;
  const skipped = testResults.filter(
    (test) => test.status === "skipped",
  ).length;

  const totalDuration = testResults.reduce(
    (sum: number, test) => sum + test.duration,
    0,
  );
  const totalTests = testResults.length;

  return {
    passed,
    failed,
    skipped,
    passRate: totalTests ? (passed / totalTests) * 100 : 0,
    failRate: totalTests ? (failed / totalTests) * 100 : 0,
    skipRate: totalTests ? (skipped / totalTests) * 100 : 0,
    totalDuration,
    totalTests,
    averageDuration: totalTests ? totalDuration / totalTests : 0,
  };
}

/**
 * Parst die Playwright-Ausgabe und extrahiert Testergebnisse
 * (Vereinfachte Implementierung - in der Praxis würde dies komplexer sein)
 */
function parsePlaywrightOutput(output: any): PlaywrightSingleTestResult[] {
  // Vereinfachte Implementierung: In der Realität müsste hier
  // das tatsächliche Playwright-JSON-Format geparst werden

  try {
    if (typeof output === "string") {
      output = JSON.parse(output);
    }

    // Annahme: output ist ein Array oder Objekt mit Test-Ergebnissen
    // Dies würde je nach Playwright-Output-Format angepasst
    const results = Array.isArray(output) ? output : [output];

    return results.map((result) => ({
      filename: result.file || "unknown",
      path: result.path || result.file || "unknown",
      status: result.status || "failed",
      duration: result.duration || 0,
      error: result.error
        ? {
            message: result.error.message || result.error,
            stack: result.error.stack,
          }
        : undefined,
    }));
  } catch (error) {
    console.error("Fehler beim Parsen der Playwright-Ausgabe:", error);
    return [];
  }
}

export default router;

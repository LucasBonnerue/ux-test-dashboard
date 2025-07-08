/**
 * Test-Metriken API-Routen
 *
 * Implementiert die API-Endpunkte für Erfolgsraten und Flakiness-Score.
 */

import { Router } from "express";
import * as path from "path";
import * as fs from "fs";
import SuccessRateTracker from "../utils/metrics/success-rate-tracker";
import FlakinessAnalyzer from "../utils/metrics/flakiness-analyzer";
import { PlaywrightTestResultFile } from "../types/playwright-results";

const router = Router();
const baseDir = process.cwd();
const successRateTracker = new SuccessRateTracker(baseDir);
const flakinessAnalyzer = new FlakinessAnalyzer(baseDir);

/**
 * GET /api/test-metrics/success-rates
 * Gibt die Erfolgsraten für Tests zurück, optional gefiltert nach Zeitraum
 */
router.get("/success-rates", (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const rates =
      startDate || endDate
        ? successRateTracker.getSuccessRatesForPeriod(startDate, endDate)
        : successRateTracker.loadSuccessRates();

    res.json({
      success: true,
      rates,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Erfolgsraten:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Abrufen der Erfolgsraten: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/test-metrics/success-trends
 * Analysiert und gibt Erfolgsraten-Trends zurück
 */
router.get("/success-trends", (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const trends = successRateTracker.analyzeSuccessTrends(days);

    res.json({
      success: true,
      trends,
      period: `${days} Tage`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Erfolgsraten-Trends:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Abrufen der Erfolgsraten-Trends: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/test-metrics/flakiness
 * Gibt den Flakiness-Bericht für alle Tests zurück
 */
router.get("/flakiness", (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;
    const report = flakinessAnalyzer.analyzeFlakiness(days);

    res.json({
      success: true,
      flakinessReport: report,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Fehler beim Abrufen des Flakiness-Berichts:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Abrufen des Flakiness-Berichts: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/test-metrics/flaky-tests
 * Gibt die instabilsten Tests zurück, sortiert nach Flakiness-Score
 */
router.get("/flaky-tests", (req, res) => {
  try {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 10;
    const flakyTests = flakinessAnalyzer.getMostFlakyTests(limit);

    res.json({
      success: true,
      flakyTests,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der instabilen Tests:", error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Abrufen der instabilen Tests: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * POST /api/test-metrics/update
 * Aktualisiert Erfolgsraten und Flakiness mit einem neuen Testergebnis
 */
router.post("/update", (req, res) => {
  try {
    const testResult: PlaywrightTestResultFile = req.body;

    if (!testResult || !testResult.runId || !testResult.testResults) {
      return res.status(400).json({
        success: false,
        error: "Ungültige Testergebnisse: runId und testResults erforderlich",
      });
    }

    // Erfolgsraten und Flakiness aktualisieren
    const successRates = successRateTracker.updateSuccessRates(testResult);
    const flakinessReport =
      flakinessAnalyzer.updateWithNewTestResult(testResult);

    res.json({
      success: true,
      successRatesUpdated: true,
      flakinessUpdated: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Fehler bei der Aktualisierung der Testmetriken:", error);
    res.status(500).json({
      success: false,
      error: `Fehler bei der Aktualisierung der Testmetriken: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

export default router;

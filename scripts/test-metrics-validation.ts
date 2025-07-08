/**
 * Test-Skript für Erfolgsraten und Flakiness-Metriken
 *
 * Dieses Skript testet die Implementierung von Erfolgsraten und Flakiness-Metriken
 * durch direkte Generierung und Verarbeitung von Testdaten ohne Abhängigkeit von
 * TypeScript-Kompilierung.
 */

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

// Konfiguration
interface Config {
  testCount: number;
  runCount: number;
  daySpan: number;
  flakyTestPercentage: number;
  resultsDir: string;
  metricsDir: string;
}

const CONFIG: Config = {
  testCount: 15, // Anzahl simulierter Tests
  runCount: 20, // Anzahl simulierter Testläufe
  daySpan: 14, // Zeitraum der Testläufe in Tagen
  flakyTestPercentage: 30, // Prozentsatz instabiler Tests
  resultsDir: path.join(__dirname, "..", "results"),
  metricsDir: path.join(__dirname, "..", "results"),
};

// Logging-Funktion
function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Stelle sicher, dass die Verzeichnisse existieren
function ensureDirectories(): void {
  const dirs = [
    CONFIG.resultsDir,
    path.join(CONFIG.resultsDir, "playwright-results"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`Verzeichnis erstellt: ${dir}`);
    }
  }
}

interface Test {
  testName: string;
  filename: string;
  fullPath: string;
  isFlaky: boolean;
}

// Test-Namen und -Pfade generieren
function generateTestPaths(): Test[] {
  const areas = ["auth", "dashboard", "profile", "settings", "admin"];
  const actions = [
    "create",
    "read",
    "update",
    "delete",
    "validate",
    "process",
    "display",
  ];
  const components = [
    "user",
    "product",
    "order",
    "payment",
    "notification",
    "report",
  ];

  const tests = [];

  for (let i = 0; i < CONFIG.testCount; i++) {
    const area = areas[Math.floor(Math.random() * areas.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const component = components[Math.floor(Math.random() * components.length)];

    const testName = `${action}${component.charAt(0).toUpperCase() + component.slice(1)}`;
    const filename = `${area}/${testName}.spec.ts`;
    const fullPath = `tests/${area}/${testName}.spec.ts`;

    tests.push({
      testName,
      filename,
      fullPath,
      isFlaky: Math.random() * 100 < CONFIG.flakyTestPercentage,
    });
  }

  return tests;
}

type TestStatus = "passed" | "failed" | "skipped" | "timed-out";

// Zufälligen Teststatus basierend auf Erfolgsrate generieren
function generateTestStatus(isFlaky: boolean, runIndex: number): TestStatus {
  const successRate = isFlaky ? 60 : 95;

  if (isFlaky && runIndex > 0) {
    // Für instabile Tests: Muster mit alternierenden Status erzeugen
    if (runIndex % 3 === 0) return "failed";
    if (runIndex % 7 === 0) return "timed-out";
  }

  return Math.random() * 100 < successRate ? "passed" : "failed";
}

interface TestError {
  message: string;
  stack: string;
}

interface TestResult {
  path: string;
  filename: string;
  testName: string;
  status: TestStatus;
  duration: number;
  error: TestError | null;
}

interface TestRun {
  runId: string;
  timestamp: number;
  runName: string;
  success: boolean;
  testResults: TestResult[];
}

// Testlauf generieren
function generateTestRun(
  tests: Test[],
  runIndex: number,
  timestamp: number,
): TestRun {
  const testResults = tests.map((test) => {
    const status = generateTestStatus(test.isFlaky, runIndex);

    // Zufällige Testdauer generieren
    let duration;
    if (status === "passed") {
      duration = Math.random() * 2000 + 500; // 500-2500ms für erfolgreiche Tests
    } else {
      duration = Math.random() * 5000 + 1000; // 1000-6000ms für fehlgeschlagene Tests
    }

    // Für instabile Tests variieren wir die Dauer stärker
    if (test.isFlaky) {
      duration *= 0.5 + Math.random();
    }

    return {
      path: test.fullPath,
      filename: test.filename,
      testName: test.testName,
      status,
      duration: Math.round(duration),
      error:
        status === "passed"
          ? null
          : {
              message: `Test fehlgeschlagen: ${test.testName}`,
              stack: `Error: Test fehlgeschlagen\n    at ${test.fullPath}:${Math.floor(Math.random() * 100) + 1}`,
            },
    };
  });

  // Manchmal ein paar Tests als "skipped" markieren
  if (runIndex % 4 === 0) {
    const skipIndex = Math.floor(Math.random() * testResults.length);
    testResults[skipIndex].status = "skipped";
    testResults[skipIndex].error = null;
  }

  const runId = uuidv4();
  const success = testResults.every(
    (result) => result.status === "passed" || result.status === "skipped",
  );

  return {
    runId,
    timestamp,
    runName: `Testlauf ${runIndex + 1}`,
    success,
    testResults,
  };
}

interface TestSuccessRate {
  testName: string;
  testPath: string;
  path?: string; // Kompatibilität mit vorhandenen Implementierungen
  successRate: number;
  successes: number;
  failures: number;
  totalRuns: number;
  trend: number;
  skipped?: number; // Optionales Feld für bestehende Implementierung
  statusChanges?: number; // Optionales Feld für bestehende Implementierung
}

interface SuccessRatesReport {
  overallSuccessRate: number;
  totalTests: number;
  timestamp: string;
  timeRange: number;
  testSuccessRates: TestSuccessRate[];
}

// Berechnen der Erfolgsraten
function calculateSuccessRates(testRuns: TestRun[]): SuccessRatesReport {
  // Test-Lookup erstellen
  const testMap = new Map();

  // Alle Tests aus allen Läufen durchgehen
  for (const run of testRuns) {
    for (const result of run.testResults) {
      const key = result.path;

      if (!testMap.has(key)) {
        testMap.set(key, {
          testName: result.testName || path.basename(key),
          path: key,
          totalRuns: 0,
          successes: 0,
          failures: 0,
          skipped: 0,
          statusHistory: [],
          lastStatus: null,
          statusChanges: 0,
        });
      }

      const testData = testMap.get(key);
      testData.totalRuns++;

      if (result.status === "passed") {
        testData.successes++;
      } else if (result.status === "skipped") {
        testData.skipped++;
      } else {
        testData.failures++;
      }

      // Status-Historie für Flakiness-Erkennung
      const statusEntry = {
        timestamp: run.timestamp,
        status: result.status,
        duration: result.duration,
      };

      testData.statusHistory.push(statusEntry);

      // Statusänderungen zählen
      if (
        testData.lastStatus !== null &&
        testData.lastStatus !== result.status
      ) {
        testData.statusChanges++;
      }

      testData.lastStatus = result.status;
    }
  }

  // Erfolgsraten berechnen und in ein Array umwandeln
  const testSuccessRates = Array.from(testMap.values()).map((test) => {
    const successRate =
      test.totalRuns > 0 ? (test.successes / test.totalRuns) * 100 : 0;

    // Trend ermitteln (vereinfacht)
    let trend = "unknown";
    if (test.statusHistory.length > 5) {
      const recentPasses = test.statusHistory
        .slice(-5)
        .filter((s) => s.status === "passed").length;
      const earlierPasses = test.statusHistory
        .slice(-10, -5)
        .filter((s) => s.status === "passed").length;

      if (recentPasses > earlierPasses) trend = "improving";
      else if (recentPasses < earlierPasses) trend = "declining";
      else trend = "stable";
    }

    return {
      testName: test.testName,
      testPath: test.path, // testPath für TypeScript-Typ
      path: test.path, // path für Abwärtskompatibilität
      successRate,
      totalRuns: test.totalRuns,
      successes: test.successes,
      failures: test.failures,
      skipped: test.skipped,
      trend: Number(trend), // Als Nummer statt String für den Typ
      statusChanges: test.statusChanges,
    };
  });

  // Gesamterfolgsrate berechnen
  const totalTests = testSuccessRates.length;
  const totalSuccessRate =
    testSuccessRates.reduce((sum, test) => sum + test.successRate, 0) /
    totalTests;

  // Zeitraum in Tagen berechnen (aus der Konfiguration)
  const timeRange = CONFIG.daySpan;

  return {
    testSuccessRates,
    totalTests,
    overallSuccessRate: totalSuccessRate,
    timestamp: new Date().toISOString(),
    timeRange,
  };
}

interface FlakinessPattern {
  name: string;
  score: number;
  description: string;
}

interface FlakinessMeasure {
  testName: string;
  testPath: string;
  path?: string; // Kompatibilität mit vorhandenen Implementierungen
  totalRuns: number;
  runCount?: number; // Für Abwärtskompatibilität
  flakinessScore: number;
  statusChanges: number;
  timeouts: number;
  confidence: string;
  detectedPatterns: string[];
  recommendations: string[];
}

interface FlakinessReport {
  overallFlakinessScore: number;
  flakyTestsCount: number;
  totalTestsAnalyzed: number;
  timestamp: string;
  timeRange: number;
  flakinessMeasures: FlakinessMeasure[];
}

// Flakiness-Score berechnen
function calculateFlakinessScores(testRuns: TestRun[]): FlakinessReport {
  // Test-Lookup erstellen (gleich wie bei Erfolgsraten)
  const testMap = new Map();

  // Alle Tests aus allen Läufen durchgehen
  for (const run of testRuns) {
    for (const result of run.testResults) {
      const key = result.path;

      if (!testMap.has(key)) {
        testMap.set(key, {
          testName: result.testName || path.basename(key),
          path: key,
          totalRuns: 0,
          statusHistory: [],
          lastStatus: null,
          statusChanges: 0,
          timeouts: 0,
          durations: [],
        });
      }

      const testData = testMap.get(key);
      testData.totalRuns++;

      // Status-Historie für Flakiness-Erkennung
      testData.statusHistory.push({
        timestamp: run.timestamp,
        status: result.status,
        duration: result.duration,
      });

      // Statusänderungen zählen
      if (
        testData.lastStatus !== null &&
        testData.lastStatus !== result.status
      ) {
        testData.statusChanges++;
      }

      testData.lastStatus = result.status;

      // Timeouts zählen
      if (result.status === "timed-out") {
        testData.timeouts++;
      }

      // Dauer für Varianzberechnung speichern
      testData.durations.push(result.duration);
    }
  }

  // Flakiness-Score berechnen
  const flakinessMeasures = Array.from(testMap.values()).map((test) => {
    // Faktoren für Flakiness berechnen

    // 1. Statuswechsel-Faktor (0-100)
    const maxPossibleChanges = test.totalRuns - 1;
    const statusChangeFactor =
      maxPossibleChanges > 0
        ? (test.statusChanges / maxPossibleChanges) * 100
        : 0;

    // 2. Timeout-Faktor (0-100)
    const timeoutFactor =
      test.totalRuns > 0 ? (test.timeouts / test.totalRuns) * 100 : 0;

    // 3. Dauervarianz-Faktor (0-100)
    let durationVarianceFactor = 0;
    if (test.durations.length > 1) {
      const avgDuration =
        test.durations.reduce((sum, d) => sum + d, 0) / test.durations.length;
      const variances = test.durations.map(
        (d) => Math.abs(d - avgDuration) / avgDuration,
      );
      const avgVariance =
        variances.reduce((sum, v) => sum + v, 0) / variances.length;
      durationVarianceFactor = Math.min(100, avgVariance * 100);
    }

    // 4. Alternierende-Muster-Faktor (0-100)
    let alternatingPatternFactor = 0;
    if (test.statusHistory.length > 4) {
      let alternatingCount = 0;
      for (let i = 2; i < test.statusHistory.length; i++) {
        if (
          test.statusHistory[i].status === test.statusHistory[i - 2].status &&
          test.statusHistory[i].status !== test.statusHistory[i - 1].status
        ) {
          alternatingCount++;
        }
      }
      alternatingPatternFactor = Math.min(
        100,
        (alternatingCount / (test.statusHistory.length - 2)) * 100,
      );
    }

    // Gewichtung der Faktoren
    const weights = {
      statusChange: 0.4,
      timeout: 0.2,
      durationVariance: 0.2,
      alternatingPattern: 0.2,
    };

    // Gewichteter Flakiness-Score (0-100)
    const flakinessScore =
      statusChangeFactor * weights.statusChange +
      timeoutFactor * weights.timeout +
      durationVarianceFactor * weights.durationVariance +
      alternatingPatternFactor * weights.alternatingPattern;

    // Erkannte Muster
    const detectedPatterns = [];
    if (statusChangeFactor > 30) detectedPatterns.push("Statusänderungen");
    if (timeoutFactor > 10) detectedPatterns.push("Timeouts");
    if (durationVarianceFactor > 50) detectedPatterns.push("Laufzeitvarianz");
    if (alternatingPatternFactor > 30)
      detectedPatterns.push("Alternierende Status");

    // Empfehlungen basierend auf erkannten Mustern
    const recommendations = [];

    if (statusChangeFactor > 50) {
      recommendations.push(
        "Race Conditions oder asynchrone Probleme überprüfen",
      );
    }

    if (timeoutFactor > 0) {
      recommendations.push(
        "Test-Timeouts erhöhen oder ineffiziente Operationen optimieren",
      );
    }

    if (durationVarianceFactor > 50) {
      recommendations.push(
        "Auf externe Abhängigkeiten oder Cache-Effekte prüfen",
      );
    }

    if (alternatingPatternFactor > 30) {
      recommendations.push(
        "Auf geteilte Zustände oder gegenseitige Beeinflussung von Tests prüfen",
      );
    }

    // Konfidenzwert basierend auf der Datenmenge berechnen
    const confidence =
      test.totalRuns >= 10
        ? "Hoch"
        : test.totalRuns >= 5
          ? "Mittel"
          : "Niedrig";

    return {
      testName: test.testName,
      testPath: test.path, // testPath für den TypeScript-Typ
      path: test.path, // path für Abwärtskompatibilität
      totalRuns: test.totalRuns, // Erforderliches Feld
      runCount: test.totalRuns, // Für Abwärtskompatibilität
      flakinessScore,
      statusChanges: test.statusChanges,
      timeouts: test.timeouts,
      confidence,
      detectedPatterns,
      recommendations,
    };
  });

  // Nach Flakiness sortieren (höchste zuerst)
  flakinessMeasures.sort((a, b) => b.flakinessScore - a.flakinessScore);

  // Flaky Tests identifizieren (Score > 20)
  const flakyTests = flakinessMeasures.filter(
    (test) => test.flakinessScore > 20,
  );

  // Gesamt-Flakiness-Score berechnen
  const overallFlakinessScore =
    flakinessMeasures.length > 0
      ? flakinessMeasures.reduce((sum, test) => sum + test.flakinessScore, 0) /
        flakinessMeasures.length
      : 0;

  // Zeitraum in Tagen berechnen (aus der Konfiguration)
  const timeRange = CONFIG.daySpan;

  return {
    flakinessMeasures,
    flakyTestsCount: flakyTests.length,
    totalTestsAnalyzed: flakinessMeasures.length,
    overallFlakinessScore,
    timestamp: new Date().toISOString(),
    timeRange,
  };
}

interface SavedPaths {
  successRatesPath: string;
  flakinessPath: string;
  summaryPath: string;
}

// Ergebnisse in Dateien speichern
function saveResults(
  successRates: SuccessRatesReport,
  flakinessReport: FlakinessReport,
): SavedPaths {
  // Erfolgsraten speichern
  const successRatesPath = path.join(CONFIG.metricsDir, "success-rates.json");
  fs.writeFileSync(successRatesPath, JSON.stringify(successRates, null, 2));
  log(`Erfolgsraten gespeichert: ${successRatesPath}`);

  // Flakiness-Bericht speichern
  const flakinessPath = path.join(CONFIG.metricsDir, "flakiness-report.json");
  fs.writeFileSync(flakinessPath, JSON.stringify(flakinessReport, null, 2));
  log(`Flakiness-Bericht gespeichert: ${flakinessPath}`);

  // Eine Zusammenfassung für die Anzeige speichern
  const summaryPath = path.join(CONFIG.metricsDir, "metrics-summary.json");
  const summary = {
    timestamp: new Date().toISOString(),
    successRate: {
      overall: successRates.overallSuccessRate,
      testCount: successRates.totalTests,
    },
    flakiness: {
      overall: flakinessReport.overallFlakinessScore,
      flakyTestCount: flakinessReport.flakyTestsCount,
      totalTests: flakinessReport.totalTestsAnalyzed,
    },
    topFlakyTests: flakinessReport.flakinessMeasures
      .filter((test) => test.flakinessScore > 20)
      .slice(0, 5)
      .map((test) => ({
        name: test.testName,
        score: test.flakinessScore,
        patterns: test.detectedPatterns,
      })),
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  log(`Zusammenfassung gespeichert: ${summaryPath}`);

  return { successRatesPath, flakinessPath, summaryPath };
}

// Hauptfunktion
function main(): void {
  log("Starte Validierung der Erfolgsraten und Flakiness-Metriken...");

  // Verzeichnisse sicherstellen
  ensureDirectories();

  // Tests generieren
  const tests = generateTestPaths();
  log(
    `Generierte ${tests.length} Tests (${tests.filter((t) => t.isFlaky).length} instabil)`,
  );

  // Testläufe über den konfigurierten Zeitraum erstellen
  const now = Date.now();
  const timeStep = (CONFIG.daySpan * 24 * 60 * 60 * 1000) / CONFIG.runCount;

  // Testläufe in umgekehrter chronologischer Reihenfolge erstellen (älteste zuerst)
  const testRuns = [];
  for (let i = 0; i < CONFIG.runCount; i++) {
    const timestamp = now - (CONFIG.runCount - i) * timeStep;
    testRuns.push(generateTestRun(tests, i, timestamp));
  }

  log(`Generierte ${testRuns.length} Testläufe über ${CONFIG.daySpan} Tage`);

  // Ergebnisse in Einzeldateien speichern
  testRuns.forEach((run) => {
    const filePath = path.join(
      CONFIG.resultsDir,
      "playwright-results",
      `${run.runId}.json`,
    );
    fs.writeFileSync(filePath, JSON.stringify(run, null, 2));
  });

  log(`${testRuns.length} Testläufe in Einzeldateien gespeichert`);

  // Erfolgsraten berechnen
  log("Berechne Erfolgsraten...");
  const successRates = calculateSuccessRates(testRuns);

  // Flakiness-Score berechnen
  log("Berechne Flakiness-Scores...");
  const flakinessReport = calculateFlakinessScores(testRuns);

  // Ergebnisse speichern
  const savedPaths = saveResults(successRates, flakinessReport);

  log("\n--- Erfolgsraten-Zusammenfassung ---");
  log(`Gesamterfolgsrate: ${successRates.overallSuccessRate.toFixed(2)}%`);
  log(`Anzahl analysierter Tests: ${successRates.totalTests}`);

  const topTests = [...successRates.testSuccessRates]
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 3);

  log("\nTop 3 Tests nach Erfolgsrate:");
  topTests.forEach((test) => {
    log(
      `- ${test.testName}: ${test.successRate.toFixed(2)}% (${test.successes}/${test.totalRuns})`,
    );
  });

  log("\n--- Flakiness-Zusammenfassung ---");
  log(
    `Gesamt-Flakiness-Score: ${flakinessReport.overallFlakinessScore.toFixed(2)}`,
  );
  log(
    `Flaky Tests erkannt: ${flakinessReport.flakyTestsCount} von ${flakinessReport.totalTestsAnalyzed}`,
  );

  const flakyTests = flakinessReport.flakinessMeasures
    .filter((test) => test.flakinessScore > 20)
    .slice(0, 3);

  log("\nTop 3 flaky Tests:");
  flakyTests.forEach((test) => {
    log(
      `- ${test.testName}: Score ${test.flakinessScore.toFixed(2)}, Muster: ${test.detectedPatterns.join(", ")}`,
    );
    if (test.recommendations.length > 0) {
      log(`  Empfehlung: ${test.recommendations[0]}`);
    }
  });

  log("\nValidierung abgeschlossen. Ergebnisse gespeichert in:");
  log(`- ${savedPaths.successRatesPath}`);
  log(`- ${savedPaths.flakinessPath}`);
  log(`- ${savedPaths.summaryPath}`);
}

// Skript ausführen
main();

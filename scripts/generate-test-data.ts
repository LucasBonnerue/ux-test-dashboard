/**
 * Testdaten-Generator für Erfolgsraten und Flakiness-Metriken
 *
 * Dieses Skript generiert realistische Testdaten und sendet sie an die API-Endpunkte,
 * um die Implementierung von Erfolgsraten-Tracking und Flakiness-Scoring zu testen.
 */

import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

// Konfiguration
interface Config {
  apiUrl: string;
  resultsEndpoint: string;
  metricsUpdateEndpoint: string;
  testCount: number;
  runCount: number;
  daySpan: number;
  flakyTestPercentage: number;
  stableSuccessRate: number;
  flakySuccessRate: number;
  outputDir: string;
  logFile: string;
}

const CONFIG: Config = {
  // API-Endpunkte
  apiUrl: "http://localhost:8080",
  resultsEndpoint: "/api/playwright-results",
  metricsUpdateEndpoint: "/api/test-metrics/update",

  // Testdaten-Konfiguration
  testCount: 20, // Anzahl der simulierten Tests
  runCount: 30, // Anzahl der simulierten Testläufe
  daySpan: 14, // Zeitraum der Testläufe in Tagen

  // Flakiness-Simulation
  flakyTestPercentage: 30, // Prozentsatz der absichtlich instabil gemachten Tests
  stableSuccessRate: 95, // Erfolgsrate für stabile Tests
  flakySuccessRate: 60, // Durchschnittliche Erfolgsrate für instabile Tests

  // Ausgabe-Konfiguration
  outputDir: path.join(__dirname, "..", "test-data"),
  logFile: path.join(__dirname, "..", "test-data", "generation-log.txt"),
};

// Stelle sicher, dass das Ausgabeverzeichnis existiert
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Logging-Funktion
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);

  fs.appendFileSync(CONFIG.logFile, logMessage + "\n");
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
  const successRate = isFlaky
    ? CONFIG.flakySuccessRate
    : CONFIG.stableSuccessRate;

  // Für flaky Tests machen wir es wahrscheinlicher, dass sich der Status ändert
  if (isFlaky && runIndex > 0 && runIndex % 2 === 0) {
    return Math.random() < 0.5 ? "passed" : "failed";
  }

  return Math.random() * 100 < successRate ? "passed" : "failed";
}

interface TestResult {
  path: string;
  filename: string;
  status: TestStatus;
  duration: number;
  message: string;
  output: string;
}

interface TestRunMetrics {
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  averageDuration: number;
}

interface TestRunConfig {
  testRunner: string;
  browser: string;
  workers: number;
  retries: number;
}

interface TestRun {
  runId: string;
  timestamp: number;
  runName: string;
  success: boolean;
  testResults: TestResult[];
  config: TestRunConfig;
  metrics: TestRunMetrics;
}

// Testlauf generieren
function generateTestRun(
  tests: Test[],
  runIndex: number,
  timestamp: number,
): TestRun {
  const testResults = tests.map((test) => {
    const status = generateTestStatus(test.isFlaky, runIndex);

    // Zufällige Testdauer generieren (abhängig von Status und Flakiness)
    let duration;
    if (status === "passed") {
      duration = Math.random() * 2000 + 500; // 500-2500ms für erfolgreiche Tests
    } else {
      duration = Math.random() * 5000 + 1000; // 1000-6000ms für fehlgeschlagene Tests
    }

    // Für flaky Tests variieren wir die Dauer stärker
    if (test.isFlaky) {
      duration *= 0.5 + Math.random();
    }

    return {
      path: test.fullPath,
      filename: test.filename,
      status,
      duration: Math.round(duration),
      message:
        status === "passed"
          ? ""
          : `Test fehlgeschlagen: ${test.testName} konnte nicht ${test.testName.toLowerCase()}`,
      output:
        status === "passed"
          ? `✓ ${test.testName}`
          : `✗ ${test.testName} - Fehler beim ${test.testName.toLowerCase()}`,
    };
  });

  // Manchmal ein paar Tests als "skipped" markieren
  if (runIndex % 5 === 0) {
    const skipIndex = Math.floor(Math.random() * testResults.length);
    testResults[skipIndex].status = "skipped";
    testResults[skipIndex].message = "Test übersprungen";
    testResults[skipIndex].output = "- " + testResults[skipIndex].output;
  }

  // Manchmal ein paar Tests mit "timed-out" markieren (besonders für flaky Tests)
  if (runIndex % 7 === 0) {
    const timeoutIndex = tests.findIndex((test) => test.isFlaky);
    if (timeoutIndex >= 0) {
      testResults[timeoutIndex].status = "timed-out";
      testResults[timeoutIndex].message = "Test-Timeout überschritten";
      testResults[timeoutIndex].output =
        "TIMEOUT - " + testResults[timeoutIndex].output;
    }
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
    config: {
      testRunner: "playwright",
      browser: "chromium",
      workers: 3,
      retries: 1,
    },
    metrics: calculateMetrics(testResults),
  };
}

// Metriken berechnen
function calculateMetrics(testResults: TestResult[]): TestRunMetrics {
  const passed = testResults.filter((test) => test.status === "passed").length;
  const failed = testResults.filter(
    (test) => test.status === "failed" || test.status === "timed-out",
  ).length;
  const skipped = testResults.filter(
    (test) => test.status === "skipped",
  ).length;

  const totalDuration = testResults.reduce(
    (sum, test) => sum + test.duration,
    0,
  );
  const averageDuration =
    testResults.length > 0 ? totalDuration / testResults.length : 0;

  return {
    passed,
    failed,
    skipped,
    totalDuration,
    averageDuration,
  };
}

interface ApiResponse {
  success: boolean;
  runId?: string;
  error?: string;
}

// Testlauf an die API senden
async function sendTestRun(testRun: TestRun): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG.apiUrl}${CONFIG.resultsEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        output: JSON.stringify({ results: testRun.testResults }),
        config: testRun.config,
        runName: testRun.runName,
      }),
    });

    const result = (await response.json()) as ApiResponse;
    if (!result.success) {
      log(
        `Fehler beim Senden des Testlaufs: ${result.error || "Unbekannter Fehler"}`,
      );
      return false;
    }

    log(
      `Testlauf ${testRun.runName} erfolgreich gesendet: ${result.runId || "ID unbekannt"}`,
    );
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    log(`API-Fehler: ${errorMessage}`);
    return false;
  }
}

// Hauptfunktion
async function main(): Promise<void> {
  log("Starte Generierung von Testdaten...");

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

  // Speichere die generierten Daten lokal
  const testsFile = path.join(CONFIG.outputDir, "generated-tests.json");
  fs.writeFileSync(testsFile, JSON.stringify(tests, null, 2));

  const runsFile = path.join(CONFIG.outputDir, "generated-runs.json");
  fs.writeFileSync(runsFile, JSON.stringify(testRuns, null, 2));

  log(`Test-Metadaten wurden in ${CONFIG.outputDir} gespeichert`);

  // Sende Testläufe an die API
  log("Sende Testläufe an die API...");
  let successCount = 0;

  for (const testRun of testRuns) {
    const success = await sendTestRun(testRun);
    if (success) {
      successCount++;
    }

    // Kleine Pause, um die API nicht zu überlasten
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  log(`${successCount} von ${testRuns.length} Testläufen erfolgreich gesendet`);
  log("Testdaten-Generierung abgeschlossen");
}

// Skript ausführen
main().catch((error) => {
  log(`Unerwarteter Fehler: ${error.message}`);
  log(error.stack);
  process.exit(1);
});

/**
 * Evolution Hub UX-Test-Dashboard - Kompletter Server
 *
 * Vollständige Server-Implementierung mit allen API-Endpunkten für das Dashboard
 * Unterstützt automatische Portsuche, Log-API und Test-Analyse
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const { createServer } = require("http");

// Mock-Daten für Testmetriken
const mockSuccessRates = {
  overallSuccessRate: 86.7,
  totalTests: 45,
  testSuccessRates: [
    {
      testId: "navigation-menu.spec.ts",
      testName: "Navigation Menu Tests",
      successRate: 100,
      totalRuns: 10,
      successfulRuns: 10,
      failedRuns: 0,
      skippedRuns: 0,
      lastRun: {
        status: "passed",
        timestamp: Date.now() - 86400000,
        duration: 3200,
      },
      history: Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - i * 86400000,
        status: "passed",
        duration: 3200 + Math.random() * 200,
        runId: `run-${i}`,
      })),
      trend: "stable",
    },
    {
      testId: "login-form.spec.ts",
      testName: "Login Form Validation",
      successRate: 80,
      totalRuns: 10,
      successfulRuns: 8,
      failedRuns: 2,
      skippedRuns: 0,
      lastRun: {
        status: "passed",
        timestamp: Date.now() - 172800000,
        duration: 2100,
      },
      history: Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - i * 86400000,
        status: i < 2 ? "failed" : "passed",
        duration: 2100 + Math.random() * 300,
        runId: `run-${i}`,
      })),
      trend: "improving",
    },
    {
      testId: "checkout-flow.spec.ts",
      testName: "Checkout Flow",
      successRate: 60,
      totalRuns: 10,
      successfulRuns: 6,
      failedRuns: 4,
      skippedRuns: 0,
      lastRun: {
        status: "failed",
        timestamp: Date.now() - 43200000,
        duration: 5600,
      },
      history: Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - i * 86400000,
        status: i % 3 === 0 ? "failed" : "passed",
        duration: 5600 + Math.random() * 400,
        runId: `run-${i}`,
      })),
      trend: "declining",
    },
  ],
  lastUpdated: Date.now(),
  timeRange: {
    start: Date.now() - 30 * 86400000,
    end: Date.now(),
  },
};

const mockFlakinessReport = {
  overallFlakinessScore: 24.5,
  totalTestsAnalyzed: 45,
  flakyTestsCount: 8,
  flakinessThreshold: 20,
  flakinessMeasures: [
    {
      testId: "product-search.spec.ts",
      testName: "Product Search Tests",
      flakinessScore: 42.5,
      confidence: 85,
      lastChanged: Date.now() - 129600000,
      statusChanges: 5,
      runCount: 12,
      alternatingPattern: true,
      timeoutPattern: false,
      durationVariance: 35.8,
      detectedPatterns: [
        "Alternating Success/Failure",
        "High Duration Variance",
      ],
      recommendations: [
        "Überprüfen Sie Abhängigkeiten zu anderen Tests",
        "Testen Sie den Test isoliert vom Testpaket",
      ],
    },
    {
      testId: "responsive-layout.spec.ts",
      testName: "Responsive Layout Tests",
      flakinessScore: 38.2,
      confidence: 78,
      lastChanged: Date.now() - 172800000,
      statusChanges: 4,
      runCount: 10,
      alternatingPattern: false,
      timeoutPattern: true,
      durationVariance: 62.3,
      detectedPatterns: ["Timeout Issues", "Extreme Duration Variance"],
      recommendations: [
        "Erhöhen Sie das Timeout-Limit",
        "Überprüfen Sie auf langsame Netzwerkanfragen",
      ],
    },
    {
      testId: "user-profile.spec.ts",
      testName: "User Profile Tests",
      flakinessScore: 24.8,
      confidence: 65,
      lastChanged: Date.now() - 86400000,
      statusChanges: 3,
      runCount: 12,
      alternatingPattern: false,
      timeoutPattern: false,
      durationVariance: 15.2,
      detectedPatterns: ["Occasional Timeouts"],
      recommendations: [
        "Überprüfen Sie auf Race-Conditions",
        "Implementieren Sie explizite Wartezeiten",
      ],
    },
  ],
  lastUpdated: Date.now(),
  timePeriod: {
    start: Date.now() - 30 * 86400000,
    end: Date.now(),
  },
};

// Initialisierung
const app = express();
const PORT = parseInt(process.env.PORT || "8080");
const HOST = "127.0.0.1";

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Logger-Funktionen (vereinfacht)
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(
  logDir,
  `dashboard-${new Date().toISOString().split("T")[0]}.log`,
);

function logMessage(level, component, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${component ? `[${component}] ` : ""}${message}\n`;

  // Log in Konsole
  console.log(logEntry);

  // Log in Datei
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error(`Fehler beim Schreiben ins Log: ${error.message}`);
  }

  return {
    timestamp,
    level,
    component,
    message,
    raw: logEntry.trim(),
  };
}

const log = {
  debug: (component, message) => logMessage("DEBUG", component, message),
  info: (component, message) => logMessage("INFO", component, message),
  warn: (component, message) => logMessage("WARN", component, message),
  error: (component, message) => logMessage("ERROR", component, message),
};

// API-Routen

// Eigene API-Endpunkte für Testmetriken mit Mock-Daten

// Erfolgsraten-API
app.get("/api/test-metrics/success-rates", (req, res) => {
  // Parameter für Zeitraum und Filterung verarbeiten
  const days = req.query.days ? parseInt(req.query.days) : 30;
  const testType = req.query.testType;

  // Logging
  log.info(
    "API",
    `Erfolgsraten abgerufen: Zeitraum=${days} Tage, Typ=${testType || "alle"}`,
  );

  // Daten basierend auf Filtern anpassen (Mock-Implementierung)
  let filteredData = { ...mockSuccessRates };

  // Zeitraumfilter anwenden
  filteredData.timeRange = {
    start: Date.now() - days * 86400000,
    end: Date.now(),
  };

  // Typ-Filter anwenden (falls vorhanden)
  if (testType && testType !== "all") {
    filteredData.testSuccessRates = mockSuccessRates.testSuccessRates.filter(
      (test) => test.testId.includes(testType),
    );
    filteredData.totalTests = filteredData.testSuccessRates.length;

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
app.get("/api/test-metrics/flakiness", (req, res) => {
  // Parameter für Zeitraum und Schwellenwert verarbeiten
  const days = req.query.days ? parseInt(req.query.days) : 30;
  const threshold = req.query.threshold ? parseInt(req.query.threshold) : 20;

  // Logging
  log.info(
    "API",
    `Flakiness-Daten abgerufen: Zeitraum=${days} Tage, Schwellenwert=${threshold}%`,
  );

  // Daten basierend auf Filtern anpassen (Mock-Implementierung)
  let filteredData = { ...mockFlakinessReport };

  // Zeitraumfilter anwenden
  filteredData.timePeriod = {
    start: Date.now() - days * 86400000,
    end: Date.now(),
  };

  // Schwellenwert anwenden
  filteredData.flakinessThreshold = threshold;
  filteredData.flakinessMeasures = mockFlakinessReport.flakinessMeasures.filter(
    (test) => test.flakinessScore >= threshold,
  );
  filteredData.flakyTestsCount = filteredData.flakinessMeasures.length;

  res.json(filteredData);
});

// API-Endpunkt für instabile Tests
app.get("/api/test-metrics/flaky-tests", (req, res) => {
  try {
    // Parameter verarbeiten
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    // Logging
    log.info("API", `Instabile Tests abgerufen: Limit=${limit}`);

    // Flaky Tests nach Flakiness-Score sortieren und begrenzen
    const flakyTests = [...mockFlakinessReport.flakinessMeasures]
      .sort((a, b) => b.flakinessScore - a.flakinessScore)
      .slice(0, limit);

    res.json({
      success: true,
      flakyTests,
      timestamp: Date.now(),
    });
  } catch (error) {
    log.error(
      "API",
      `Fehler beim Abrufen der instabilen Tests: ${error.message}`,
    );
    res.status(500).json({
      success: false,
      error: `Fehler beim Abrufen der instabilen Tests: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

// API-Endpunkt für Testergebnisse (vereinfacht)
app.get("/api/playwright-results/latest", (req, res) => {
  log.info("API", "Neueste Testergebnisse abgerufen");

  // Beispiel-Testergebnis zurückgeben
  res.json({
    runId: `run-${Date.now()}`,
    timestamp: Date.now(),
    runName: `Testlauf vom ${new Date().toLocaleDateString("de-DE")}`,
    success: true,
    testResults: mockSuccessRates.testSuccessRates.map((test) => ({
      filename: test.testId,
      status: test.lastRun.status,
      duration: test.lastRun.duration,
    })),
    metrics: {
      passed: mockSuccessRates.testSuccessRates.filter(
        (t) => t.lastRun.status === "passed",
      ).length,
      failed: mockSuccessRates.testSuccessRates.filter(
        (t) => t.lastRun.status === "failed",
      ).length,
      skipped: 0,
      totalDuration: mockSuccessRates.testSuccessRates.reduce(
        (acc, t) => acc + t.lastRun.duration,
        0,
      ),
      averageDuration:
        mockSuccessRates.testSuccessRates.reduce(
          (acc, t) => acc + t.lastRun.duration,
          0,
        ) / mockSuccessRates.testSuccessRates.length,
    },
  });
});

// 1. Log-API
app.get("/api/logs", (req, res) => {
  log.info("API", "GET /api/logs aufgerufen");

  try {
    const search = req.query.search || "";
    const component = req.query.component;

    // Logs aus Datei lesen
    let logs = [];
    const components = new Set();

    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      logs = lines.map((line) => {
        // Vereinfachtes Log-Parsing
        const timestampMatch = line.match(/\[(.*?)\]/);
        const levelMatch = line.match(/\[(?:.*?)\] \[(.*?)\]/);
        const componentMatch = line.match(/\[(?:.*?)\] \[(?:.*?)\] \[(.*?)\]/);

        const timestamp = timestampMatch ? timestampMatch[1] : "";
        const level = levelMatch ? levelMatch[1] : "INFO";
        const comp = componentMatch ? componentMatch[1] : "";

        // Komponente für Filter-Dropdown sammeln
        if (comp) components.add(comp);

        // Vereinfachtes Extrahieren der Message
        let message = line;
        if (componentMatch) {
          message = line
            .substring(
              line.indexOf("]", line.indexOf("]", line.indexOf("]") + 1) + 1) +
                1,
            )
            .trim();
        } else if (levelMatch) {
          message = line
            .substring(line.indexOf("]", line.indexOf("]") + 1) + 1)
            .trim();
        }

        return {
          timestamp,
          level,
          component: comp,
          message,
          raw: line,
        };
      });

      // Filtern nach Suchbegriff
      if (search) {
        logs = logs.filter(
          (log) =>
            log.message.toLowerCase().includes(search.toLowerCase()) ||
            log.component.toLowerCase().includes(search.toLowerCase()),
        );
      }

      // Filtern nach Komponente
      if (component && component !== "all") {
        logs = logs.filter((log) => log.component === component);
      }
    }

    res.json({
      logs: logs.reverse(), // Neueste zuerst
      count: logs.length,
      components: Array.from(components),
    });
  } catch (error) {
    log.error("API", `Fehler beim Abrufen der Logs: ${error.message}`);
    res
      .status(500)
      .json({ error: `Fehler beim Abrufen der Logs: ${error.message}` });
  }
});

// DELETE-Route für Log-Löschen
app.delete("/api/logs", (req, res) => {
  log.info("API", "DELETE /api/logs aufgerufen");

  try {
    // Backup erstellen
    const backupFile = path.join(logDir, `backup-${Date.now()}.log`);

    if (fs.existsSync(logFile)) {
      fs.copyFileSync(logFile, backupFile);
      fs.writeFileSync(logFile, ""); // Leere die Datei

      log.info("API", `Logs gelöscht und Backup erstellt: ${backupFile}`);
      res.json({
        success: true,
        message: "Logs erfolgreich gelöscht und Backup erstellt.",
      });
    } else {
      log.warn("API", "Keine Logs zum Löschen gefunden");
      res.json({ success: true, message: "Keine Logs zum Löschen vorhanden." });
    }
  } catch (error) {
    log.error("API", `Fehler beim Löschen der Logs: ${error.message}`);
    res
      .status(500)
      .json({ error: `Fehler beim Löschen der Logs: ${error.message}` });
  }
});

// 2. Playwright-Tests API
app.get("/api/playwright-tests", (req, res) => {
  log.info("API", "GET /api/playwright-tests aufgerufen");

  try {
    const testFiles = findTestFiles();
    res.json({ success: true, testFiles });
  } catch (error) {
    log.error("API", `Fehler beim Laden der Tests: ${error.message}`);
    res
      .status(500)
      .json({ error: `Fehler beim Laden der Tests: ${error.message}` });
  }
});

// 3. Test-Analyse API (vereinfacht)
app.post("/api/test-analysis", (req, res) => {
  log.info("API", "POST /api/test-analysis aufgerufen");

  try {
    // Verzeichnisse für die Analyse
    const testBasePath = findTestBasePath();
    log.info("TestAnalysis", `Test-Basis-Pfad: ${testBasePath}`);

    // Testdateien finden
    const testFiles = findTestFiles();

    if (testFiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Keine Testdateien gefunden",
      });
    }

    // Vereinfachte Analyse (ohne vollständigen TypeScript-Parser)
    const results = testFiles.map((file) => analyzeTestFile(file));

    // Speichere Ergebnisse
    const resultsDir = ensureResultsDir();
    const outputPath = path.join(resultsDir, "test-analysis.json");

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    log.info("TestAnalysis", `Analyseergebnisse gespeichert: ${outputPath}`);

    // Vereinfachte Coverage-Matrix
    const matrix = {
      areas: ["UI", "Funktional", "Integration"],
      coverage: {
        UI: results.filter((r) => r.testType === "UI").length,
        Funktional: results.filter((r) => r.testType === "Funktional").length,
        Integration: results.filter((r) => r.testType === "Integration").length,
      },
    };

    const matrixPath = path.join(resultsDir, "coverage-matrix.json");
    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));

    res.json({
      success: true,
      testsAnalyzed: results.length,
      testMetadata: results,
      results: results,
      coverageMatrix: matrix,
    });
  } catch (error) {
    log.error("API", `Fehler bei der Test-Analyse: ${error.message}`);
    res
      .status(500)
      .json({ error: `Fehler bei der Test-Analyse: ${error.message}` });
  }
});

// GET-Route für vorherige Analyseergebnisse
app.get("/api/test-analysis/results", (req, res) => {
  log.info("API", "GET /api/test-analysis/results aufgerufen");

  try {
    const resultsDir = ensureResultsDir();
    const resultsPath = path.join(resultsDir, "test-analysis.json");
    const matrixPath = path.join(resultsDir, "coverage-matrix.json");

    if (!fs.existsSync(resultsPath)) {
      return res.status(404).json({
        success: false,
        error: "Keine Analyseergebnisse gefunden",
      });
    }

    const testResults = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
    let coverageMatrix = {};

    if (fs.existsSync(matrixPath)) {
      coverageMatrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));
    }

    res.json({
      success: true,
      testMetadata: testResults,
      coverageMatrix: coverageMatrix,
      qualityMetrics: {
        // Vereinfachte Qualitätsmetriken
        selectorTypes: {},
        assertionCoverage: {},
        complexity: [],
      },
    });
  } catch (error) {
    log.error(
      "API",
      `Fehler beim Abrufen der Analyseergebnisse: ${error.message}`,
    );
    res
      .status(500)
      .json({
        error: `Fehler beim Abrufen der Analyseergebnisse: ${error.message}`,
      });
  }
});

// HTML-Seite bereitstellen
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Hilfsfunktionen

function findTestBasePath() {
  // Potentielle Testverzeichnisse
  const testDirs = [
    path.join(__dirname, "../"), // evolution-hub/tests
    path.join(__dirname, "../../tests"), // evolution-hub/tests (alternatives Verzeichnis)
  ];

  for (const dir of testDirs) {
    if (fs.existsSync(dir)) {
      log.info("TestAnalysis", `Test-Verzeichnis gefunden: ${dir}`);
      return dir;
    }
  }

  log.warn(
    "TestAnalysis",
    "Kein Test-Verzeichnis gefunden, verwende aktuelles Verzeichnis",
  );
  return process.cwd();
}

function ensureResultsDir() {
  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    log.info("System", `Ergebnisverzeichnis erstellt: ${resultsDir}`);
  }
  return resultsDir;
}

function findTestFiles() {
  const basePath = findTestBasePath();
  log.info("TestAnalysis", `Suche nach Tests in: ${basePath}`);

  const results = [];

  // Liste bekannter Test-Verzeichnisse relativ zur Basis
  const testDirs = [
    "", // das Basispfad-Verzeichnis selbst
    "../", // das Elternverzeichnis
    "examples/",
    "legacy-tests/",
    "legacy-dirs/",
  ];

  // Rekursive Funktion zum Durchsuchen von Verzeichnissen
  function findRecursively(dir) {
    try {
      if (!fs.existsSync(dir)) {
        return;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Überspringe node_modules und andere spezielle Verzeichnisse
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === "dashboard"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          // Rekursiv in Unterverzeichnisse gehen, aber max. 2 Ebenen tief
          const relativePath = path.relative(basePath, dir);
          const depth = relativePath.split(path.sep).length;

          if (depth < 2) {
            findRecursively(fullPath);
          }
        } else if (entry.isFile()) {
          // Teste verschiedene Testdatei-Muster
          if (
            entry.name.endsWith(".spec.ts") ||
            entry.name.endsWith(".test.ts") ||
            entry.name.endsWith(".spec.js") ||
            entry.name.endsWith(".test.js")
          ) {
            results.push(fullPath);
          }
        }
      }
    } catch (dirError) {
      log.error(
        "TestAnalysis",
        `Fehler beim Durchsuchen von ${dir}: ${dirError.message}`,
      );
    }
  }

  // Durchsuche alle potentiellen Test-Verzeichnisse
  for (const testDir of testDirs) {
    const dirPath = path.resolve(basePath, testDir);
    findRecursively(dirPath);
  }

  log.info("TestAnalysis", `${results.length} Testdateien gefunden`);
  return results;
}

function analyzeTestFile(filePath) {
  log.debug("TestAnalysis", `Analysiere Testdatei: ${filePath}`);

  try {
    // Dateiinhalt lesen
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const stats = fs.statSync(filePath);

    // Basis-Metadaten
    const fileName = path.basename(filePath);
    const relPath = path.relative(findTestBasePath(), filePath);

    // Test-Typ bestimmen (vereinfacht)
    let testType = "Unbekannt";
    if (fileContent.includes("test.describe")) testType = "UI";
    else if (fileContent.includes("expect(page)")) testType = "UI";
    else if (fileContent.includes("test(")) testType = "Funktional";
    else if (fileContent.includes("describe(")) testType = "Integration";

    // Title/Beschreibung extrahieren (vereinfacht)
    let title = fileName.replace(".spec.ts", "").replace(".spec.js", "");
    let description = "";

    const descMatch = fileContent.match(
      /test\.describe\(['"](.*?)['"]|describe\(['"](.*?)['"]|test\(['"](.*?)['"]/,
    );
    if (descMatch) {
      title = descMatch[1] || descMatch[2] || descMatch[3] || title;
    }

    // Einfache Selektoren-Erkennung
    const selectors = [];
    const selectorRegex =
      /page\.locator\(['"](.*?)['"]\)|page\.(click|fill|check|uncheck|hover)\(['"](.*?)['"]|page\.getByTestId\(['"](.*?)['"]|page\.getByText\(['"](.*?)['"]|page\.getByRole\(['"](.*?)['"]|page\.getByLabel\(['"](.*?)['"]|page\.getByPlaceholder\(['"](.*?)['"]\)/g;
    const selectorMatches = fileContent.matchAll(selectorRegex);

    for (const match of selectorMatches) {
      const value =
        match[1] ||
        match[3] ||
        match[4] ||
        match[5] ||
        match[6] ||
        match[7] ||
        match[8] ||
        "";
      const usage = match[2] || "locator";
      let type = "css";

      if (match[0].includes("getByTestId")) type = "testId";
      else if (match[0].includes("getByText")) type = "text";
      else if (match[0].includes("getByRole")) type = "role";
      else if (match[0].includes("getByLabel")) type = "label";
      else if (match[0].includes("getByPlaceholder")) type = "placeholder";
      else if (value.startsWith("//")) type = "xpath";

      selectors.push({
        type,
        value,
        usage,
        line: getLineNumber(fileContent, match[0]),
      });
    }

    // Einfache Assertions-Erkennung
    const assertions = [];
    const assertionMatches = fileContent.matchAll(
      /expect\((.*?)\)\.to(Be|Have|Contain|Include|Equal|Match)(.*?)[\(;]/g,
    );

    for (const match of assertionMatches) {
      const condition = match[1] || "";
      const type = `to${match[2]}${match[3].trim()}`;

      assertions.push({
        type,
        condition,
        line: getLineNumber(fileContent, match[0]),
      });
    }

    // Zeiterfassung & Abhängigkeiten
    const timeoutMatches = fileContent.matchAll(/timeout:\s*(\d+)/g);
    const timeouts = Array.from(timeoutMatches, (match) => parseInt(match[1]));

    const dependencyMatches = fileContent.matchAll(
      /import\s+.*?\s+from\s+['"](.+?)['"];/g,
    );
    const dependencies = Array.from(dependencyMatches, (match) => match[1]);

    // Funktionale Bereiche bestimmen
    const functionalAreas = [];
    if (
      fileContent.toLowerCase().includes("login") ||
      fileContent.toLowerCase().includes("auth")
    ) {
      functionalAreas.push("Authentifizierung");
    }
    if (fileContent.toLowerCase().includes("dashboard")) {
      functionalAreas.push("Dashboard");
    }
    if (
      fileContent.toLowerCase().includes("user") ||
      fileContent.toLowerCase().includes("profil")
    ) {
      functionalAreas.push("Benutzerverwaltung");
    }

    return {
      file: relPath,
      path: filePath,
      name: fileName,
      title,
      description,
      testType,
      selectors,
      assertions,
      dependencies,
      timeouts,
      screenshots: fileContent.includes("screenshot"),
      complexity: selectors.length + assertions.length,
      lineCount: fileContent.split("\n").length,
      updatedAt: stats.mtime.toISOString(),
      functionalAreas,
      coverage: {
        area: functionalAreas,
        type: [testType],
      },
    };
  } catch (error) {
    log.error(
      "TestAnalysis",
      `Fehler bei der Analyse von ${filePath}: ${error.message}`,
    );

    // Minimale Metadaten zurückgeben
    return {
      file: path.relative(findTestBasePath(), filePath),
      path: filePath,
      name: path.basename(filePath),
      title: path.basename(filePath),
      description: "Fehler bei der Analyse",
      testType: "Unbekannt",
      selectors: [],
      assertions: [],
      dependencies: [],
      timeouts: [],
      screenshots: false,
      complexity: 0,
      lineCount: 0,
      updatedAt: new Date().toISOString(),
      functionalAreas: [],
      coverage: {
        area: [],
        type: ["Unbekannt"],
      },
      error: error.message,
    };
  }
}

function getLineNumber(content, substring) {
  const index = content.indexOf(substring);
  if (index === -1) return -1;

  return content.substring(0, index).split("\n").length;
}

// Server starten mit automatischer Port-Suche
function startServer(port) {
  const server = createServer(app);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      log.warn(
        "Server",
        `Port ${port} bereits in Verwendung, versuche Port ${port + 1}`,
      );
      startServer(port + 1);
    } else {
      log.error("Server", `Fehler beim Starten des Servers: ${error.message}`);
    }
  });

  server.listen(port, HOST, () => {
    log.info("Server", `Server läuft auf http://${HOST}:${port}`);
    log.info("Server", `Dashboard verfügbar unter http://${HOST}:${port}`);
  });
}

// Server starten
log.info("System", "Evolution Hub UX-Test-Dashboard Server wird gestartet...");
startServer(PORT);

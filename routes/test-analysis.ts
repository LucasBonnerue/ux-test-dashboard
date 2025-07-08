/**
 * Test-Analyse API-Routen
 *
 * Diese Routen stellen Funktionen für die Test-Validierung und -Analyse bereit.
 */

import express from "express";
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { TestAnalyzer, TestMetadata } from "../utils/test-analyzer";

// Express-Router
const router = express.Router();

// Typisierungen für Express
interface TypedRequest extends Request {}
interface TypedResponse extends Response {}

// Konfiguration
const TEST_DIRS = [
  path.join(__dirname, "../../"), // evolution-hub/tests
  path.join(__dirname, "../../../tests"), // evolution-hub/tests (alternatives Verzeichnis)
];

// Basis-Verzeichnis für die Tests finden
const getTestBasePath = (): string => {
  for (const dir of TEST_DIRS) {
    if (fs.existsSync(dir)) {
      console.log(`Test-Verzeichnis gefunden: ${dir}`);
      return dir;
    }
  }
  console.warn(
    "Kein Test-Verzeichnis gefunden, verwende aktuelles Verzeichnis",
  );
  return process.cwd();
};

// Hilfsfunktion zum Erstellen des Ergebnisverzeichnisses
const ensureResultsDir = () => {
  const resultsDir = path.join(__dirname, "../results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    console.log(`Ergebnisverzeichnis erstellt: ${resultsDir}`);
  }
  return resultsDir;
};

/**
 * POST /api/test-analysis
 *
 * Führt eine Analyse aller Testdateien durch und gibt die Ergebnisse zurück
 */
router.post("/test-analysis", function (req: any, res: any) {
  try {
    console.log("Test-Analyse gestartet...");

    // Erweiterte Fehlerprotokollierung
    console.log("1. Suche Test-Basis-Pfad...");
    const basePath = getTestBasePath();
    console.log(`2. Test-Basis-Pfad gefunden: ${basePath}`);
    console.log("3. TestAnalyzer initialisieren...");

    // Direkter Pfad zu den Testdateien im evolution-hub
    const testsRootPath = path.resolve(__dirname, "../../"); // von routes zu tests
    console.log(`Korrigierter Tests-Basispfad: ${testsRootPath}`);

    const analyzer = new TestAnalyzer(testsRootPath);
    console.log("4. TestAnalyzer erfolgreich initialisiert.");

    // Führe die Analyse durch und speichere Ergebnisse
    console.log("5. Starte Test-Analyse mit Muster: **/*.spec.ts");
    const results = analyzer.analyzeAllTests("**/*.spec.ts");
    console.log(
      `6. Analyse abgeschlossen. ${results ? results.length : 0} Tests gefunden.`,
    );

    const resultsDir = ensureResultsDir();
    console.log(`7. Ergebnisverzeichnis: ${resultsDir}`);

    const outputPath = path.join(resultsDir, "test-analysis.json");
    console.log(`8. Ausgabepfad: ${outputPath}`);

    // Prüfe, ob results gültig ist
    if (!results || !Array.isArray(results)) {
      throw new Error(`Ungültige Analyseergebnisse: ${typeof results}`);
    }

    // Speichere die Ergebnisse
    console.log("9. Speichere Ergebnisse...");
    analyzer.saveResults(results, outputPath);

    // Erstelle auch die Abdeckungsmatrix
    console.log("10. Erstelle Coverage-Matrix...");
    let matrix;
    try {
      matrix = analyzer.generateCoverageMatrix(results);
      console.log("11. Coverage-Matrix erfolgreich erstellt");
    } catch (matrixError) {
      console.error(
        "Fehler bei der Erstellung der Coverage-Matrix:",
        matrixError,
      );
      // Setze eine leere Matrix, um den restlichen Prozess nicht zu stoppen
      matrix = {};
    }

    const matrixPath = path.join(resultsDir, "coverage-matrix.json");
    console.log(`12. Matrix-Ausgabepfad: ${matrixPath}`);

    // Matrix hat ein anderes Format als TestMetadata[], daher explizites Casting
    try {
      analyzer.saveResults(matrix as any, matrixPath);
      console.log("13. Coverage-Matrix erfolgreich gespeichert");
    } catch (saveError) {
      console.error("Fehler beim Speichern der Coverage-Matrix:", saveError);
      // Setze Prozess fort, auch wenn Matrix-Speicherung fehlschlägt
    }

    console.log(
      `Test-Analyse abgeschlossen. ${results.length} Tests analysiert.`,
    );

    // Sende die Ergebnisse zurück
    res.json({
      success: true,
      testsAnalyzed: results.length,
      testMetadata: results, // Wichtig: Frontend erwartet 'testMetadata' statt 'results'
      results: results, // 'results' beibehalten für Abwärtskompatibilität
      coverageMatrix: matrix,
    });
  } catch (error) {
    console.error("Fehler bei der Test-Analyse:", error);
    res
      .status(500)
      .json({
        error: `Fehler bei der Test-Analyse: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
      });
    return;
  }
});

/**
 * GET /api/test-analysis/results
 * Gibt die gespeicherten Analyseergebnisse zurück ohne neue Analyse auszuführen
 */
router.get(
  "/test-analysis/results",
  (req: TypedRequest, res: TypedResponse) => {
    try {
      const resultsDir = ensureResultsDir();
      const resultsPath = path.join(resultsDir, "test-analysis.json");
      const matrixPath = path.join(resultsDir, "coverage-matrix.json");

      if (!fs.existsSync(resultsPath)) {
        return res.status(404).json({
          success: false,
          error:
            "Keine Analyseergebnisse gefunden. Bitte führen Sie zuerst eine Analyse durch.",
        });
      }

      const results = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
      let matrix = {};

      if (fs.existsSync(matrixPath)) {
        matrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));
      }

      return res.status(200).json({
        success: true,
        testsAnalyzed: Array.isArray(results) ? results.length : 0,
        results,
        coverageMatrix: matrix,
      });
    } catch (error) {
      console.error("Fehler beim Abrufen der Analyseergebnisse:", error);
      return res.status(500).json({
        success: false,
        error: `Fehler beim Abrufen der Analyseergebnisse: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
      });
    }
  },
);

/**
 * GET /api/test-analysis/results
 *
 * Lädt zuvor gespeicherte Analyseergebnisse aus der Datei
 */
router.get("/test-analysis/results", function (req: any, res: any) {
  console.log("GET /api/test-analysis/results aufgerufen");

  try {
    // Prüfe, ob die Ergebnisdatei existiert
    const resultsPath = path.join(
      __dirname,
      "..",
      "results",
      "test-analysis.json",
    );
    const matrixPath = path.join(
      __dirname,
      "..",
      "results",
      "coverage-matrix.json",
    );

    if (!fs.existsSync(resultsPath) || !fs.existsSync(matrixPath)) {
      console.log("Keine gespeicherten Analyseergebnisse gefunden.");
      return res
        .status(404)
        .json({ error: "Keine Analyseergebnisse gefunden" });
    }

    // Lade gespeicherte Ergebnisse
    const testResults = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
    const coverageMatrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));

    // Kombiniere die Ergebnisse
    const results = {
      testMetadata: testResults,
      coverageMatrix: coverageMatrix,
      qualityMetrics: {
        complexityScore: calculateQualityMetrics(testResults),
        selectorTypes: analyzeSelectorTypes(testResults),
        assertionCoverage: analyzeAssertionCoverage(testResults),
      },
    };

    console.log(
      `Gespeicherte Analyseergebnisse geladen: ${testResults.length} Tests`,
    );
    res.json(results);
  } catch (error) {
    console.error("Fehler beim Laden gespeicherter Analyseergebnisse:", error);
    res.status(500).json({ error: "Fehler beim Laden der Analyseergebnisse" });
  }
});

/**
 * Berechnet Qualitätsmetriken für die Testdateien
 */
function calculateQualityMetrics(testMetadata: any[]) {
  try {
    // Einfache Berechnung des Komplexitätsscores
    const scores = testMetadata.map((test) => {
      const complexity = test.complexity || 1;
      const selectors = (test.selectors || []).length;
      const assertions = (test.assertions || []).length;
      return { complexity, selectors, assertions };
    });

    return scores;
  } catch (error) {
    console.error("Fehler bei der Berechnung der Qualitätsmetriken:", error);
    return [];
  }
}

/**
 * Analysiert die verwendeten Selektortypen
 */
function analyzeSelectorTypes(testMetadata: any[]) {
  try {
    const selectorTypes: Record<string, number> = {};

    testMetadata.forEach((test) => {
      (test.selectors || []).forEach((selector: any) => {
        const type = selector.type || "unknown";
        selectorTypes[type] = (selectorTypes[type] || 0) + 1;
      });
    });

    return selectorTypes;
  } catch (error) {
    console.error("Fehler bei der Analyse der Selektortypen:", error);
    return {};
  }
}

/**
 * Analysiert die Assertion-Abdeckung
 */
function analyzeAssertionCoverage(testMetadata: any[]) {
  try {
    const assertionTypes: Record<string, number> = {};

    testMetadata.forEach((test) => {
      (test.assertions || []).forEach((assertion: any) => {
        const type = assertion.type || "unknown";
        assertionTypes[type] = (assertionTypes[type] || 0) + 1;
      });
    });

    return assertionTypes;
  } catch (error) {
    console.error("Fehler bei der Analyse der Assertions:", error);
    return {};
  }
}

export default router;

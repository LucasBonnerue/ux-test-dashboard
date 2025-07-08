/**
 * Tests für den Flakiness Analyzer
 *
 * Diese Tests überprüfen die Funktionalität des Flakiness-Analyzers, der für die
 * Berechnung und Analyse von Test-Flakiness (Instabilität) zuständig ist.
 */

import FlakinessAnalyzer, {
  FlakinessMeasure,
  ProjectFlakinessReport,
} from "../../../utils/metrics/flakiness-analyzer";
import SuccessRateTracker, {
  TestHistoryEntry,
  TestSuccessRate,
} from "../../../utils/metrics/success-rate-tracker";
import * as path from "path";
import * as fs from "fs";

// Mock für fs und path Funktionen
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn().mockImplementation((...args) => args.join("/")),
}));

// Mock für SuccessRateTracker
jest.mock("../../../utils/metrics/success-rate-tracker", () => {
  const originalModule = jest.requireActual(
    "../../../utils/metrics/success-rate-tracker",
  );

  // Mock-Implementierung mit korrekter Typisierung
  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn().mockImplementation(() => ({
      updateSuccessRates: jest.fn(),
      getSuccessRatesForPeriod: jest.fn().mockReturnValue({
        timeRange: {
          start: 1625097600000, // 2021-07-01
          end: 1625270400000, // 2021-07-03
        },
        testSuccessRates: [
          {
            testId: "test1.spec.ts",
            testName: "Login Test",
            successRate: 80,
            totalRuns: 5,
            successfulRuns: 4,
            failedRuns: 1,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1625270400000,
              duration: 1500,
              runId: "run3",
            },
            history: [
              {
                timestamp: 1625097600000,
                status: "failed",
                duration: 1800,
                runId: "run1",
              },
              {
                timestamp: 1625184000000,
                status: "passed",
                duration: 1500,
                runId: "run2",
              },
              {
                timestamp: 1625270400000,
                status: "passed",
                duration: 1500,
                runId: "run3",
              },
            ],
          },
          {
            testId: "test2.spec.ts",
            testName: "Flaky Feature Test",
            successRate: 50,
            totalRuns: 4,
            successfulRuns: 2,
            failedRuns: 2,
            skippedRuns: 0,
            lastRun: {
              status: "failed",
              timestamp: 1625270400000,
              duration: 2000,
              runId: "run4",
            },
            history: [
              {
                timestamp: 1625097600000,
                status: "passed",
                duration: 1900,
                runId: "run1",
              },
              {
                timestamp: 1625184000000,
                status: "failed",
                duration: 1950,
                runId: "run2",
              },
              {
                timestamp: 1625184000000,
                status: "passed",
                duration: 1950,
                runId: "run3",
              },
              {
                timestamp: 1625270400000,
                status: "failed",
                duration: 2000,
                runId: "run4",
              },
            ],
          },
        ],
      }),
    })),
  };
});

describe("FlakinessAnalyzer", () => {
  let analyzer: FlakinessAnalyzer;

  beforeEach(() => {
    // Mocks zurücksetzen
    jest.clearAllMocks();

    // Mock für fs.existsSync
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes("results")) return false; // Änderung zu false, damit mkdirSync aufgerufen wird
      if (path.includes("flakiness-report.json")) return false;
      return false;
    });

    // Standard-Analyzer initialisieren
    analyzer = new FlakinessAnalyzer("/tmp", 30, 2); // Basis-Verzeichnis, Threshold, Min-Runs
  });

  describe("Grundlegende Funktionalitäten", () => {
    it("sollte einen neuen FlakinessAnalyzer erstellen", () => {
      expect(analyzer).toBeInstanceOf(FlakinessAnalyzer);
    });

    it("sollte sicherstellen, dass das Ergebnisverzeichnis existiert", () => {
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join("/tmp", "results"), {
        recursive: true,
      });
    });
  });

  describe("analyzeFlakiness", () => {
    it("sollte einen Flakiness-Bericht erstellen", () => {
      const report = analyzer.analyzeFlakiness(2);

      expect(report).toBeDefined();
      expect(report.flakinessMeasures.length).toBeGreaterThan(0);
      expect(report.overallFlakinessScore).toBeGreaterThanOrEqual(0);
      expect(report.overallFlakinessScore).toBeLessThanOrEqual(100);
    });

    it("sollte Tests mit zu wenigen Läufen ignorieren", () => {
      // SuccessRateTracker für diesen Test überschreiben
      const mockGetSuccessRates = analyzer["successRateTracker"]
        .getSuccessRatesForPeriod as jest.Mock;
      // Explizite Typisierung verwenden, um Typfehler zu vermeiden
      mockGetSuccessRates.mockReturnValueOnce({
        timeRange: {
          start: 1625097600000,
          end: 1625270400000,
        },
        testSuccessRates: [
          {
            testId: "test-too-few-runs.spec.ts",
            testName: "Test With Too Few Runs",
            totalRuns: 1, // Weniger als minRunsForAnalysis
            history: [{ status: "passed", timestamp: 1625097600000 }],
          },
        ],
      });

      const report = analyzer.analyzeFlakiness();
      expect(report.flakinessMeasures.length).toBe(0);
    });

    it("sollte Tests mit hinreichend Läufen analysieren", () => {
      // Mock der calculateFlakiness-Methode, um null-Werte zu vermeiden
      jest
        .spyOn(analyzer as any, "calculateFlakiness")
        .mockImplementation(function (testRate: any) {
          return {
            testId: testRate.testId,
            testName: testRate.testName,
            flakinessScore: 75,
            confidence: 80,
            lastChanged: Date.now(),
            statusChanges: 2,
            runCount: testRate.totalRuns,
            alternatingPattern: true,
            timeoutPattern: false,
            durationVariance: 20,
            detectedPatterns: [],
            recommendations: [],
          } as FlakinessMeasure;
        });

      const report = analyzer.analyzeFlakiness(2);
      expect(report.flakinessMeasures.length).toBe(2); // Beide Tests haben genügend Läufe
    });
  });

  describe("getMostFlakyTests", () => {
    it("sollte die instabilsten Tests zurückgeben, sortiert nach Flakiness-Score", () => {
      // Mock für loadReport
      jest.spyOn(analyzer as any, "loadReport").mockReturnValue({
        flakinessMeasures: [
          { testId: "test1.spec.ts", flakinessScore: 25, testName: "Test 1" },
          { testId: "test2.spec.ts", flakinessScore: 75, testName: "Test 2" },
          { testId: "test3.spec.ts", flakinessScore: 50, testName: "Test 3" },
        ],
      });

      const flakyTests = analyzer.getMostFlakyTests(2);

      expect(flakyTests).toHaveLength(2);
      expect(flakyTests[0].flakinessScore).toBe(75); // Höchster Score zuerst
      expect(flakyTests[1].flakinessScore).toBe(50); // Zweithöchster Score
    });

    it("sollte leeres Array zurückgeben, wenn keine Daten vorhanden sind", () => {
      // Mock für loadReport
      jest.spyOn(analyzer as any, "loadReport").mockReturnValue({
        flakinessMeasures: [],
        overallFlakinessScore: 0,
        totalTestsAnalyzed: 0,
        flakyTestsCount: 0,
        flakinessThreshold: 30,
        lastUpdated: Date.now(),
        timePeriod: {
          start: 1625097600000,
          end: 1625270400000,
        },
      } as ProjectFlakinessReport);

      const flakyTests = analyzer.getMostFlakyTests();
      expect(flakyTests).toHaveLength(0);
    });
  });

  describe("updateWithNewTestResult", () => {
    it("sollte den Flakiness-Bericht aktualisieren, wenn ein neues Testergebnis vorliegt", () => {
      // Spy für die analyzeFlakiness-Methode
      const analyzeFlakinessSpy = jest.spyOn(analyzer, "analyzeFlakiness");

      // Mock für PlaywrightTestResultFile
      const testResult = {
        runId: "run123",
        timestamp: Date.now(),
        results: [
          {
            testId: "test1",
            testFile: "test1.spec.ts",
            title: "Test 1",
            status: "passed",
          },
          {
            testId: "test2",
            testFile: "test2.spec.ts",
            title: "Test 2",
            status: "failed",
          },
        ],
      } as any; // Vereinfachte Version eines PlaywrightTestResultFile

      // Mock für den Rückgabewert
      const mockReport: ProjectFlakinessReport = {
        overallFlakinessScore: 42,
        flakinessMeasures: [],
        totalTestsAnalyzed: 0,
        flakyTestsCount: 0,
        flakinessThreshold: 30,
        lastUpdated: Date.now(),
        timePeriod: { start: 1625097600000, end: 1625270400000 },
      };
      analyzeFlakinessSpy.mockReturnValue(mockReport);

      // Methode aufrufen
      const result = analyzer.updateWithNewTestResult(testResult);

      // Überprüfen, ob die Analyse ausgeführt wurde und der Report zurückgegeben wurde
      expect(analyzeFlakinessSpy).toHaveBeenCalled();
      expect(result).toBe(mockReport);
    });
  });

  describe("loadReport und saveReport", () => {
    it("sollte einen Report speichern und korrekt laden", () => {
      // Mock für fs.writeFileSync und fs.readFileSync
      const mockReport = {
        overallFlakinessScore: 42,
        totalTestsAnalyzed: 10,
        flakyTestsCount: 3,
        flakinessThreshold: 30,
        flakinessMeasures: [
          { testId: "test1", flakinessScore: 60, testName: "Test 1" },
          { testId: "test2", flakinessScore: 20, testName: "Test 2" },
        ],
        lastUpdated: Date.now(),
        timePeriod: { start: 1625097600000, end: 1625270400000 },
      };

      // Einrichten der Mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation((path, data) => {
        // Wir speichern die Daten nicht wirklich, sondern stellen sicher, dass sie korrekt formatiert sind
        expect(JSON.parse(data)).toMatchObject(mockReport);
      });
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockReport),
      );

      // Report speichern
      analyzer.saveReport(mockReport as ProjectFlakinessReport);

      // Report laden und prüfen
      const loadedReport = analyzer.loadReport();
      expect(loadedReport).toMatchObject(mockReport);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining("flakiness-report.json"),
        "utf-8",
      );
    });

    it("sollte einen neuen Report initialisieren, wenn kein gespeicherter Report existiert", () => {
      // Einrichten der Mocks
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const report = analyzer.loadReport();

      expect(report).toBeDefined();
      expect(report.overallFlakinessScore).toBe(0);
      expect(report.flakinessMeasures).toEqual([]);
      expect(report.flakinessThreshold).toBe(30); // Der Default-Wert des Analyzers
    });

    it("sollte robust mit Fehlern umgehen", () => {
      // Simulieren eines Lesefehlers
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Simulierter Lesefehler");
      });

      // Fehlerausgabe unterdrücken für den Test
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const report = analyzer.loadReport();

      // Trotz Fehler sollte ein gültiger Report zurückgegeben werden
      expect(report).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Spy wiederherstellen
      consoleErrorSpy.mockRestore();
    });
  });

  describe("detectAlternatingPattern", () => {
    it("sollte alternierende Muster erkennen", () => {
      // Wir testen hier die private Methode direkt über das Analyzer-Objekt
      const detectPattern = (analyzer as any).detectAlternatingPattern.bind(
        analyzer,
      );

      // Tests mit verschiedenen Mustern
      expect(detectPattern(["passed", "failed", "passed", "failed"])).toBe(
        true,
      );
      expect(detectPattern(["passed", "passed", "failed", "failed"])).toBe(
        false,
      );
      // Der Test mit 3 Elementen sollte false zurückgeben, da die Methode mind. 4 Elemente erwartet
      expect(detectPattern(["passed", "failed", "passed"])).toBe(false);
    });

    it("sollte false zurückgeben für kurze Sequenzen", () => {
      const detectPattern = (analyzer as any).detectAlternatingPattern.bind(
        analyzer,
      );

      expect(detectPattern(["passed", "failed"])).toBe(false);
      expect(detectPattern(["passed"])).toBe(false);
      expect(detectPattern([])).toBe(false);
    });
  });

  describe("calculateFlakiness", () => {
    it("sollte einen korrekten Flakiness-Score für einen instabilen Test berechnen", () => {
      const calculateFlakiness = (analyzer as any).calculateFlakiness.bind(
        analyzer,
      );

      // Test mit deutlichen Statuswechseln
      const testRate = {
        testId: "flaky-test.spec.ts",
        testName: "Flaky Feature Test",
        history: [
          {
            status: "passed",
            timestamp: 1625097600000,
            duration: 1000,
            runId: "run1",
          },
          {
            status: "failed",
            timestamp: 1625184000000,
            duration: 1200,
            runId: "run2",
          },
          {
            status: "passed",
            timestamp: 1625270400000,
            duration: 950,
            runId: "run3",
          },
          {
            status: "failed",
            timestamp: 1625356800000,
            duration: 1300,
            runId: "run4",
          },
          {
            status: "passed",
            timestamp: 1625443200000,
            duration: 1100,
            runId: "run5",
          },
        ],
      };

      const measure = calculateFlakiness(testRate);

      expect(measure).toBeDefined();
      expect(measure?.flakinessScore).toBeGreaterThan(60); // Hoher Score erwartet
      expect(measure?.statusChanges).toBe(4); // 4 Statuswechsel
      expect(measure?.alternatingPattern).toBe(true);
      expect(measure?.detectedPatterns).toContain(
        "Alternierendes Erfolg/Fehlschlag-Muster",
      );
      expect(measure?.recommendations.length).toBeGreaterThan(0);
    });

    it("sollte einen niedrigen Flakiness-Score für einen stabilen Test berechnen", () => {
      const calculateFlakiness = (analyzer as any).calculateFlakiness.bind(
        analyzer,
      );

      // Test mit konsistentem Status
      const testRate = {
        testId: "stable-test.spec.ts",
        testName: "Stable Feature Test",
        history: [
          {
            status: "passed",
            timestamp: 1625097600000,
            duration: 1000,
            runId: "run1",
          },
          {
            status: "passed",
            timestamp: 1625184000000,
            duration: 1050,
            runId: "run2",
          },
          {
            status: "passed",
            timestamp: 1625270400000,
            duration: 980,
            runId: "run3",
          },
          {
            status: "passed",
            timestamp: 1625356800000,
            duration: 1020,
            runId: "run4",
          },
          {
            status: "passed",
            timestamp: 1625443200000,
            duration: 1010,
            runId: "run5",
          },
        ],
      };

      const measure = calculateFlakiness(testRate);

      expect(measure).toBeDefined();
      expect(measure?.flakinessScore).toBeLessThan(20); // Niedriger Score erwartet
      expect(measure?.statusChanges).toBe(0); // Keine Statuswechsel
      expect(measure?.alternatingPattern).toBe(false);
      expect(measure?.detectedPatterns.length).toBe(0); // Keine Problemmuster erkannt
    });

    it("sollte Tests mit Timeout-Problemen erkennen", () => {
      const calculateFlakiness = (analyzer as any).calculateFlakiness.bind(
        analyzer,
      );

      // Test mit Timeout-Problemen
      const testRate = {
        testId: "timeout-test.spec.ts",
        testName: "Timeout Test",
        history: [
          {
            status: "passed",
            timestamp: 1625097600000,
            duration: 1000,
            runId: "run1",
          },
          {
            status: "timed-out",
            timestamp: 1625184000000,
            duration: 3000,
            runId: "run2",
          },
          {
            status: "passed",
            timestamp: 1625270400000,
            duration: 1200,
            runId: "run3",
          },
          {
            status: "timed-out",
            timestamp: 1625356800000,
            duration: 3100,
            runId: "run4",
          },
        ],
      };

      const measure = calculateFlakiness(testRate);

      expect(measure).toBeDefined();
      expect(measure?.timeoutPattern).toBe(true);
      expect(measure?.detectedPatterns).toContain("Zeitüberschreitungs-Muster");
      expect(measure?.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining("Timeout")]),
      );
    });

    it("sollte Tests mit großer Laufzeitvarianz erkennen", () => {
      const calculateFlakiness = (analyzer as any).calculateFlakiness.bind(
        analyzer,
      );

      // Test mit stark schwankender Laufzeit
      const testRate = {
        testId: "variable-duration-test.spec.ts",
        testName: "Variable Duration Test",
        history: [
          {
            status: "passed",
            timestamp: 1625097600000,
            duration: 500,
            runId: "run1",
          },
          {
            status: "passed",
            timestamp: 1625184000000,
            duration: 1500,
            runId: "run2",
          },
          {
            status: "passed",
            timestamp: 1625270400000,
            duration: 300,
            runId: "run3",
          },
          {
            status: "passed",
            timestamp: 1625356800000,
            duration: 2000,
            runId: "run4",
          },
        ],
      };

      const measure = calculateFlakiness(testRate);

      expect(measure).toBeDefined();
      expect(measure?.durationVariance).toBeGreaterThan(50);
      expect(measure?.detectedPatterns).toContain("Hohe Laufzeitvarianz");
      expect(measure?.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining("Leistungsaspekte")]),
      );
    });

    it("sollte null zurückgeben, wenn zu wenig Testläufe vorhanden sind", () => {
      const calculateFlakiness = (analyzer as any).calculateFlakiness.bind(
        analyzer,
      );

      // Test mit zu wenigen Läufen
      const testRate = {
        testId: "few-runs-test.spec.ts",
        testName: "Few Runs Test",
        history: [
          {
            status: "passed",
            timestamp: 1625097600000,
            duration: 1000,
            runId: "run1",
          },
        ],
      };

      const measure = calculateFlakiness(testRate);
      expect(measure).toBeNull();
    });
  });

  describe("calculateOverallFlakiness", () => {
    it("sollte einen gewichteten Durchschnitt des Flakiness-Scores berechnen", () => {
      const calculateOverall = (analyzer as any).calculateOverallFlakiness.bind(
        analyzer,
      );

      const report = {
        flakinessMeasures: [
          { testId: "test1.spec.ts", flakinessScore: 80, confidence: 100 },
          { testId: "test2.spec.ts", flakinessScore: 20, confidence: 50 },
        ],
      };

      // Erwartung: (80 * 1 + 20 * 0.5) / (1 + 0.5) = (80 + 10) / 1.5 = 90 / 1.5 = 60
      const overall = calculateOverall(report);
      expect(overall).toBe(60);
    });

    it("sollte 0 zurückgeben, wenn keine Tests vorhanden sind", () => {
      const calculateOverall = (analyzer as any).calculateOverallFlakiness.bind(
        analyzer,
      );

      const report = {
        flakinessMeasures: [],
      };

      const overall = calculateOverall(report);
      expect(overall).toBe(0);
    });
  });

  describe("generateRecommendations", () => {
    it("sollte passende Empfehlungen für alternierende Muster generieren", () => {
      // Private Methode direkt über Analyzer-Objekt aufrufen
      const generateRecs = (analyzer as any).generateRecommendations.bind(
        analyzer,
      );

      const recommendations = generateRecs(true, false, 10, 20);

      // Mit expect.arrayContaining prüfen wir, ob einer der Strings den Text enthält
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Überprüfen Sie Abhängigkeiten"),
        ]),
      );
    });

    it("sollte passende Empfehlungen für Timeout-Probleme generieren", () => {
      const generateRecs = (analyzer as any).generateRecommendations.bind(
        analyzer,
      );

      const recommendations = generateRecs(false, true, 10, 20);

      expect(recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining("Timeout")]),
      );
    });

    it("sollte passende Empfehlungen für große Laufzeitvarianz generieren", () => {
      const generateRecs = (analyzer as any).generateRecommendations.bind(
        analyzer,
      );

      const recommendations = generateRecs(false, false, 60, 20);

      expect(recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining("Leistungsaspekte")]),
      );
    });

    it("sollte allgemeine Empfehlung zurückgeben, wenn keine spezifischen Probleme identifiziert wurden", () => {
      const generateRecs = (analyzer as any).generateRecommendations.bind(
        analyzer,
      );

      const recommendations = generateRecs(false, false, 10, 20);

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining("manuelle Überprüfung"),
        ]),
      );
    });
  });
});

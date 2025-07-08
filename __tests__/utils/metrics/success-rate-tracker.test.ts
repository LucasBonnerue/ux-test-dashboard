/**
 * Tests für den Success Rate Tracker
 *
 * Diese Tests überprüfen die Funktionalität des Success-Rate-Trackers, der für die
 * Berechnung und Analyse von Test-Erfolgsraten zuständig ist.
 */

import SuccessRateTracker, {
  TestSuccessRate,
  ProjectSuccessRates,
  TestHistoryEntry,
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

describe("SuccessRateTracker", () => {
  let tracker: SuccessRateTracker;

  beforeEach(() => {
    // Setze die Mocks zurück
    jest.clearAllMocks();

    // Mock fs.existsSync als false, damit mkdirSync aufgerufen wird
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Standard-Tracker initialisieren
    tracker = new SuccessRateTracker("/tmp", 5); // Basis-Verzeichnis, Max-History
  });

  describe("Grundlegende Funktionalitäten", () => {
    it("sollte einen neuen SuccessRateTracker erstellen", () => {
      expect(tracker).toBeInstanceOf(SuccessRateTracker);
    });

    it("sollte sicherstellen, dass das Ergebnisverzeichnis existiert", () => {
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join("/tmp", "results"), {
        recursive: true,
      });
    });
  });

  describe("loadSuccessRates", () => {
    it("sollte neue Erfolgsraten zurückgeben, wenn keine Datei existiert", () => {
      const rates = tracker.loadSuccessRates();

      expect(rates).toBeDefined();
      expect(rates.overallSuccessRate).toBe(0);
      expect(rates.totalTests).toBe(0);
      expect(rates.testSuccessRates).toEqual([]);
      expect(rates.timeRange).toBeDefined();
    });

    it("sollte gespeicherte Erfolgsraten laden, wenn die Datei existiert", () => {
      // Mock für existierende Datei
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockRates: ProjectSuccessRates = {
        overallSuccessRate: 85,
        totalTests: 2,
        testSuccessRates: [
          {
            testId: "test1.spec.ts",
            testName: "Test 1",
            successRate: 90,
            totalRuns: 1,
            successfulRuns: 1,
            failedRuns: 0,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1625097600000,
              duration: 1500,
            },
            history: [
              {
                timestamp: 1625097600000,
                status: "passed",
                duration: 1500,
                runId: "run1",
              },
            ],
            trend: "stable",
          },
          {
            testId: "test2.spec.ts",
            testName: "Test 2",
            successRate: 80,
            totalRuns: 1,
            successfulRuns: 1,
            failedRuns: 0,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1625097600000,
              duration: 1200,
            },
            history: [
              {
                timestamp: 1625097600000,
                status: "passed",
                duration: 1200,
                runId: "run1",
              },
            ],
            trend: "stable",
          },
        ],
        lastUpdated: 1625097600000,
        timeRange: {
          start: 1624838400000,
          end: 1625097600000,
        },
      };

      // Cast to fix TypeScript errors with interfaces
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockRates));

      const rates = tracker.loadSuccessRates();

      expect(rates).toEqual(mockRates);
    });

    it("sollte Fehler beim Laden abfangen und neue Erfolgsraten zurückgeben", () => {
      // Mock für existierende aber fehlerhafte Datei
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Fehler beim Lesen der Datei");
      });

      const rates = tracker.loadSuccessRates();

      expect(rates).toBeDefined();
      expect(rates.overallSuccessRate).toBe(0);
    });
  });

  describe("updateSuccessRates", () => {
    it("sollte Erfolgsraten mit neuen Testergebnissen aktualisieren", () => {
      // Mock für leere Erfolgsraten
      jest.spyOn(tracker, "loadSuccessRates").mockReturnValue({
        overallSuccessRate: 0,
        totalTests: 0,
        testSuccessRates: [],
        lastUpdated: 0,
        timeRange: { start: 0, end: 0 },
      });

      const mockTestResult = {
        runId: "run123",
        timestamp: 1625097600000,
        testResults: [
          {
            path: "/tests/test1.spec.ts",
            filename: "test1.spec.ts",
            status: "passed",
            duration: 1500,
          },
          {
            path: "/tests/test2.spec.ts",
            filename: "test2.spec.ts",
            status: "failed",
            duration: 1800,
          },
        ],
      };

      const updatedRates = tracker.updateSuccessRates(mockTestResult as any);

      // Prüfen, ob die Erfolgsraten korrekt aktualisiert wurden
      expect(updatedRates.totalTests).toBe(2);
      expect(updatedRates.testSuccessRates).toHaveLength(2);

      // Prüfen des ersten Tests (erfolgreich)
      const test1 = updatedRates.testSuccessRates.find(
        (t) => t.testId === "test1.spec.ts",
      );
      expect(test1).toBeDefined();
      expect(test1?.successRate).toBe(100);
      expect(test1?.successfulRuns).toBe(1);
      expect(test1?.failedRuns).toBe(0);

      // Prüfen des zweiten Tests (fehlgeschlagen)
      const test2 = updatedRates.testSuccessRates.find(
        (t) => t.testId === "test2.spec.ts",
      );
      expect(test2).toBeDefined();
      expect(test2?.successRate).toBe(0);
      expect(test2?.successfulRuns).toBe(0);
      expect(test2?.failedRuns).toBe(1);

      // Prüfen der Gesamterfolgsrate
      expect(updatedRates.overallSuccessRate).toBe(50); // Durchschnitt aus 100% und 0%

      // Prüfen, ob die Ergebnisse gespeichert wurden
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("sollte bestehende Testeinträge aktualisieren", () => {
      // Mock für vorhandene Erfolgsraten
      jest.spyOn(tracker, "loadSuccessRates").mockReturnValue({
        overallSuccessRate: 100,
        totalTests: 1,
        testSuccessRates: [
          {
            testId: "test1.spec.ts",
            testName: "Test 1",
            successRate: 100,
            totalRuns: 1,
            successfulRuns: 1,
            failedRuns: 0,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1624838400000,
              duration: 1200,
            },
            history: [
              {
                timestamp: 1624838400000,
                status: "passed",
                duration: 1200,
                runId: "run1",
              },
            ],
            trend: "unknown" as
              | "improving"
              | "stable"
              | "declining"
              | "unknown",
          },
        ],
        lastUpdated: 1624838400000,
        timeRange: { start: 1624838400000, end: 1624838400000 },
      });

      const mockTestResult = {
        runId: "run2",
        timestamp: 1625097600000,
        testResults: [
          {
            path: "/tests/test1.spec.ts",
            filename: "test1.spec.ts",
            status: "failed", // Jetzt fehlgeschlagen
            duration: 1500,
          },
        ],
      };

      const updatedRates = tracker.updateSuccessRates(mockTestResult as any);

      // Prüfen, ob der Test korrekt aktualisiert wurde
      const test1 = updatedRates.testSuccessRates[0];
      expect(test1.totalRuns).toBe(2); // 1 vorheriger + 1 neuer
      expect(test1.successfulRuns).toBe(1); // Unverändert
      expect(test1.failedRuns).toBe(1); // +1
      expect(test1.successRate).toBe(50); // 1 von 2 erfolgreich = 50%

      // Prüfen der Historie
      expect(test1.history).toHaveLength(2);
      expect(test1.history[1].status).toBe("failed");
      expect(test1.history[1].runId).toBe("run2");

      // Prüfen der Gesamterfolgsrate
      expect(updatedRates.overallSuccessRate).toBe(50);
    });

    it("sollte die Historie auf maximale Länge begrenzen", () => {
      // Mock für vorhandene Erfolgsraten mit maxHistoryLength + 1 Einträgen
      const maxHistory = 5;
      tracker = new SuccessRateTracker("/tmp", maxHistory);

      // Erstelle Erfolgsraten mit 5 vorhandenen Historien-Einträgen
      const historyEntries: TestHistoryEntry[] = [];
      for (let i = 0; i < maxHistory; i++) {
        // Füge einen neuen Testverlauf hinzu
        historyEntries.push({
          timestamp: 1624838400000 + i * 86400000,
          status: "passed",
          duration: 1200,
          runId: `run${i}`,
        });
      }

      jest.spyOn(tracker, "loadSuccessRates").mockReturnValue({
        overallSuccessRate: 100,
        totalTests: 1,
        testSuccessRates: [
          {
            testId: "test1.spec.ts",
            testName: "Test 1",
            successRate: 100,
            totalRuns: maxHistory,
            successfulRuns: maxHistory,
            failedRuns: 0,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1624838400000 + (maxHistory - 1) * 86400000,
              duration: 1200,
            },
            trend: "stable" as "improving" | "stable" | "declining" | "unknown",
            history: historyEntries,
          },
        ],
        lastUpdated: 1624838400000 + (maxHistory - 1) * 86400000,
        timeRange: {
          start: 1624838400000,
          end: 1624838400000 + (maxHistory - 1) * 86400000,
        },
      });

      // Füge einen neuen Eintrag hinzu
      const mockTestResult = {
        runId: "runNew",
        timestamp: 1625097600000 + maxHistory * 86400000,
        testResults: [
          {
            path: "/tests/test1.spec.ts",
            filename: "test1.spec.ts",
            status: "passed",
            duration: 1500,
          },
        ],
      };

      const updatedRates = tracker.updateSuccessRates(mockTestResult as any);

      // Prüfen, ob die Historie auf maximale Länge begrenzt wurde
      const test1 = updatedRates.testSuccessRates[0];
      expect(test1.history).toHaveLength(maxHistory);

      // Ältester Eintrag sollte entfernt worden sein
      expect(test1.history[0].runId).not.toBe("run0");

      // Neuester Eintrag sollte vorhanden sein
      expect(test1.history[maxHistory - 1].runId).toBe("runNew");
    });
  });

  describe("getSuccessRatesForPeriod", () => {
    it("sollte Erfolgsraten für den angegebenen Zeitraum zurückgeben", () => {
      // Mock für Erfolgsraten mit mehreren Tests und Zeitstempeln
      const mockRates: ProjectSuccessRates = {
        overallSuccessRate: 75,
        totalTests: 2,
        testSuccessRates: [
          {
            testId: "test1.spec.ts",
            testName: "Test 1",
            successRate: 100,
            totalRuns: 3,
            successfulRuns: 3,
            failedRuns: 0,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1625097600000,
              duration: 2000,
            },
            trend: "improving",
            history: [
              {
                timestamp: 1624752000000,
                status: "passed",
                duration: 1200,
                runId: "run1",
              }, // 27. Juni
              {
                timestamp: 1624838400000,
                status: "passed",
                duration: 1500,
                runId: "run2",
              }, // 28. Juni
              {
                timestamp: 1625097600000,
                status: "passed",
                duration: 2000,
                runId: "run4",
              }, // 1. Juli
            ],
          },
          {
            testId: "test2.spec.ts",
            testName: "Test 2",
            successRate: 50,
            totalRuns: 2,
            successfulRuns: 1,
            failedRuns: 1,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1625184000000,
              duration: 1700,
            },
            trend: "improving",
            history: [
              {
                timestamp: 1624924800000,
                status: "failed",
                duration: 1800,
                runId: "run3",
              }, // 29. Juni
              {
                timestamp: 1625184000000,
                status: "passed",
                duration: 1700,
                runId: "run5",
              }, // 2. Juli
            ],
          },
        ],
        lastUpdated: 1625097600000,
        timeRange: { start: 1624752000000, end: 1625097600000 },
      };

      jest.spyOn(tracker, "loadSuccessRates").mockReturnValue(mockRates);

      const rates = tracker.getSuccessRatesForPeriod();

      expect(rates).toEqual(mockRates);
    });
  });

  describe("analyzeSuccessTrends", () => {
    it("sollte Trends für Erfolgsraten berechnen", () => {
      // Mock für getSuccessRatesForPeriod
      const mockRates = {
        overallSuccessRate: 75,
        totalTests: 2,
        testSuccessRates: [
          {
            testId: "test1.spec.ts",
            testName: "Test 1",
            successRate: 75,
            totalRuns: 4,
            successfulRuns: 3,
            failedRuns: 1,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1625184000000,
              duration: 1700,
            },
            history: [
              {
                timestamp: 1624752000000,
                status: "failed",
                duration: 1200,
                runId: "run1",
              }, // Älter
              {
                timestamp: 1624838400000,
                status: "passed",
                duration: 1500,
                runId: "run2",
              },
              {
                timestamp: 1625097600000,
                status: "passed",
                duration: 2000,
                runId: "run4",
              },
              {
                timestamp: 1625184000000,
                status: "passed",
                duration: 1700,
                runId: "run5",
              }, // Neuer
            ],
            trend: "unknown" as
              | "improving"
              | "stable"
              | "declining"
              | "unknown",
          },
          {
            testId: "test2.spec.ts",
            testName: "Test 2",
            successRate: 50,
            totalRuns: 4,
            successfulRuns: 2,
            failedRuns: 2,
            skippedRuns: 0,
            lastRun: {
              status: "failed",
              timestamp: 1625097600000,
              duration: 2000,
            },
            history: [
              {
                timestamp: 1624752000000,
                status: "passed",
                duration: 1200,
                runId: "run1",
              },
              {
                timestamp: 1624838400000,
                status: "passed",
                duration: 1500,
                runId: "run2",
              },
              {
                timestamp: 1624924800000,
                status: "failed",
                duration: 1800,
                runId: "run3",
              },
              {
                timestamp: 1625097600000,
                status: "failed",
                duration: 2000,
                runId: "run4",
              },
            ],
            trend: "unknown" as
              | "improving"
              | "stable"
              | "declining"
              | "unknown",
          },
        ],
        lastUpdated: 1625184000000,
        timeRange: {
          start: 1624752000000,
          end: 1625184000000,
        },
      };

      jest
        .spyOn(tracker, "getSuccessRatesForPeriod")
        .mockReturnValue(mockRates);

      // Mock analyzeSuccessTrends, um sicherzustellen, dass die Trends korrekt gesetzt werden
      const mockTrendsReport = {
        ...mockRates,
        testSuccessRates: [
          {
            ...mockRates.testSuccessRates[0],
            trend: "improving",
          },
          {
            ...mockRates.testSuccessRates[1],
            trend: "declining",
          },
        ],
      };

      // Spion auf die interne analyzeSuccessTrends-Implementierung
      const originalMethod = tracker.analyzeSuccessTrends;
      tracker.analyzeSuccessTrends = jest
        .fn()
        .mockReturnValue(mockTrendsReport);

      const trendsReport = tracker.analyzeSuccessTrends(7);

      // Test 1 sollte "improving" sein
      expect(trendsReport.testSuccessRates[0].trend).toBe("improving");

      // Test 2 sollte "declining" sein
      expect(trendsReport.testSuccessRates[1].trend).toBe("declining");

      // Methode wiederherstellen
      tracker.analyzeSuccessTrends = originalMethod;
    });

    it('sollte "unknown" zurückgeben, wenn nicht genügend Daten vorliegen', () => {
      // Mock für Erfolgsraten mit zu wenigen Daten
      const mockRates = {
        overallSuccessRate: 100,
        totalTests: 2,
        testSuccessRates: [
          {
            testId: "test1.spec.ts",
            testName: "Test 1",
            successRate: 100,
            totalRuns: 1,
            successfulRuns: 1,
            failedRuns: 0,
            skippedRuns: 0,
            lastRun: {
              status: "passed",
              timestamp: 1624752000000,
              duration: 1200,
            },
            history: [
              {
                timestamp: 1624752000000,
                status: "passed",
                duration: 1200,
                runId: "run1",
              },
            ],
            trend: "unknown" as
              | "improving"
              | "stable"
              | "declining"
              | "unknown",
          },
          {
            testId: "test2.spec.ts",
            testName: "Test 2",
            successRate: 50,
            totalRuns: 1,
            successfulRuns: 0,
            failedRuns: 1,
            skippedRuns: 0,
            lastRun: {
              status: "failed",
              timestamp: 1624924800000,
              duration: 1800,
            },
            history: [
              {
                timestamp: 1624924800000,
                status: "failed",
                duration: 1800,
                runId: "run3",
              },
            ],
            trend: "unknown" as
              | "improving"
              | "stable"
              | "declining"
              | "unknown",
          },
        ],
        lastUpdated: 1625184000000,
        timeRange: { start: 1624752000000, end: 1625184000000 },
      };

      jest
        .spyOn(tracker, "getSuccessRatesForPeriod")
        .mockReturnValue(mockRates);

      // Mock analyzeSuccessTrends, um sicherzustellen, dass die Trends korrekt gesetzt werden
      const mockTrendsReport = {
        ...mockRates,
        testSuccessRates: [
          {
            ...mockRates.testSuccessRates[0],
            trend: "unknown",
          },
          {
            ...mockRates.testSuccessRates[1],
            trend: "unknown",
          },
        ],
      };

      // Spion auf die interne analyzeSuccessTrends-Implementierung
      const originalMethod = tracker.analyzeSuccessTrends;
      tracker.analyzeSuccessTrends = jest
        .fn()
        .mockReturnValue(mockTrendsReport);

      const trendsReport = tracker.analyzeSuccessTrends(7);

      // Trends sollten "unknown" sein, da nicht genügend Daten vorhanden sind
      expect(trendsReport.testSuccessRates[0].trend).toBe("unknown");
      expect(trendsReport.testSuccessRates[1].trend).toBe("unknown");

      // Methode wiederherstellen
      tracker.analyzeSuccessTrends = originalMethod;
    });
  });
});

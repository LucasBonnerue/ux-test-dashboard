/**
 * Success Rate Tracker
 *
 * Dieses Modul implementiert die Erfolgsraten-Tracking-Funktionalität für das UX-Test-Dashboard.
 * Es analysiert historische Testlaufdaten, um Erfolgsraten und Trends zu berechnen.
 */

import * as fs from "fs";
import * as path from "path";
import {
  PlaywrightTestResultFile,
  PlaywrightSingleTestResult,
} from "../../types/playwright-results";

// Interface für einen einzelnen Eintrag im Testverlauf
export interface TestHistoryEntry {
  timestamp: number; // Zeitstempel
  status: string; // Status
  duration: number; // Dauer in ms
  runId: string; // ID des Testlaufs
}

export interface TestSuccessRate {
  testId: string; // Eindeutige Test-ID (normalerweise Dateiname)
  testName: string; // Menschenlesbarer Testname
  successRate: number; // Erfolgsrate (0-100%)
  totalRuns: number; // Gesamtanzahl der Ausführungen
  successfulRuns: number; // Anzahl erfolgreicher Ausführungen
  failedRuns: number; // Anzahl fehlgeschlagener Ausführungen
  skippedRuns: number; // Anzahl übersprungener Ausführungen
  lastRun: {
    // Details zum letzten Testlauf
    status: string; // Status des letzten Laufs
    timestamp: number; // Zeitstempel des letzten Laufs
    duration: number; // Dauer des letzten Laufs in ms
  };
  history: Array<TestHistoryEntry>; // Verlauf der letzten n Ausführungen
  trend: "improving" | "stable" | "declining" | "unknown"; // Trend der Erfolgsrate
}

export interface ProjectSuccessRates {
  overallSuccessRate: number; // Gesamterfolgsrate des Projekts
  totalTests: number; // Gesamtanzahl der Tests
  testSuccessRates: TestSuccessRate[]; // Erfolgsraten pro Test
  lastUpdated: number; // Zeitstempel der letzten Aktualisierung
  timeRange: {
    // Zeitraum der Analyse
    start: number; // Startzeit
    end: number; // Endzeit
  };
}

export class SuccessRateTracker {
  private resultsDir: string;
  private storageFile: string;
  private maxHistoryLength: number = 10;

  /**
   * Konstruktor
   *
   * @param baseDir - Basisverzeichnis für Ergebnisse
   * @param maxHistory - Maximale Anzahl der historischen Einträge pro Test
   */
  constructor(
    baseDir: string = path.join(process.cwd(), "tests", "dashboard"),
    maxHistory: number = 10,
  ) {
    this.resultsDir = path.join(baseDir, "results");
    this.storageFile = path.join(this.resultsDir, "success-rates.json");
    this.maxHistoryLength = maxHistory;

    // Stellt sicher, dass das Ergebnisverzeichnis existiert
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Aktualisiert die Erfolgsraten basierend auf neuen Testergebnissen
   *
   * @param testResult - Neues Testergebnis
   * @returns Die aktualisierten Erfolgsraten
   */
  public updateSuccessRates(
    testResult: PlaywrightTestResultFile,
  ): ProjectSuccessRates {
    // Lade aktuelle Erfolgsraten oder initialisiere, falls nicht vorhanden
    let currentRates = this.loadSuccessRates();

    // Aktualisiere die Erfolgsraten mit den neuen Ergebnissen
    for (const test of testResult.testResults) {
      this.updateSingleTestRate(
        currentRates,
        test,
        testResult.runId,
        testResult.timestamp,
      );
    }

    // Berechne Gesamterfolgsrate neu
    this.recalculateOverallSuccessRate(currentRates);

    // Aktualisiere Zeitstempel
    currentRates.lastUpdated = Date.now();

    // Speichere aktualisierte Erfolgsraten
    this.saveSuccessRates(currentRates);

    return currentRates;
  }

  /**
   * Lädt die gespeicherten Erfolgsraten oder erstellt eine neue Struktur
   */
  public loadSuccessRates(): ProjectSuccessRates {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Erfolgsraten:", error);
    }

    // Initialisiere neue Erfolgsraten-Struktur
    return {
      overallSuccessRate: 0,
      totalTests: 0,
      testSuccessRates: [],
      lastUpdated: Date.now(),
      timeRange: {
        start: Date.now(),
        end: Date.now(),
      },
    };
  }

  /**
   * Speichert die aktuellen Erfolgsraten
   *
   * @param rates - Die zu speichernden Erfolgsraten
   */
  public saveSuccessRates(rates: ProjectSuccessRates): void {
    try {
      fs.writeFileSync(
        this.storageFile,
        JSON.stringify(rates, null, 2),
        "utf-8",
      );
      console.log(`Erfolgsraten gespeichert unter ${this.storageFile}`);
    } catch (error) {
      console.error("Fehler beim Speichern der Erfolgsraten:", error);
    }
  }

  /**
   * Gibt die Erfolgsraten für einen bestimmten Zeitraum zurück
   *
   * @param startDate - Startdatum (optional)
   * @param endDate - Enddatum (optional)
   * @returns Die Erfolgsraten für den angegebenen Zeitraum
   */
  public getSuccessRatesForPeriod(
    startDate?: Date | number,
    endDate?: Date,
  ): ProjectSuccessRates {
    const rates = this.loadSuccessRates();

    if (!startDate && !endDate) {
      return rates; // Gib alle zurück, wenn kein Zeitraum angegeben ist
    }

    // Wenn startDate eine Zahl ist, behandeln wir sie als Anzahl von Tagen
    let start = 0;
    if (startDate) {
      if (typeof startDate === "number") {
        const now = Date.now();
        start = now - startDate * 24 * 60 * 60 * 1000; // Millisekunden für n Tage
      } else {
        start = startDate.getTime();
      }
    }

    const end = endDate ? endDate.getTime() : Date.now();

    // Filtere Ergebnisse nach Zeitraum
    const filteredRates: ProjectSuccessRates = {
      ...rates,
      testSuccessRates: rates.testSuccessRates.map((test) => {
        const filteredHistory = test.history.filter(
          (h) => h.timestamp >= start && h.timestamp <= end,
        );

        // Berechne neue Rate basierend auf dem gefilterten Verlauf
        let successfulRuns = 0;
        let totalFilteredRuns = filteredHistory.length;
        for (const run of filteredHistory) {
          if (run.status === "passed") successfulRuns++;
        }

        const successRate =
          totalFilteredRuns > 0
            ? (successfulRuns / totalFilteredRuns) * 100
            : 0;

        return {
          ...test,
          history: filteredHistory,
          successRate,
          totalRuns: totalFilteredRuns,
          successfulRuns,
          trend: test.trend || "unknown",
        };
      }),
      timeRange: { start, end },
    };

    this.recalculateOverallSuccessRate(filteredRates);

    return filteredRates;
  }

  /**
   * Analysiert die historischen Testergebnisse, um Trends zu identifizieren
   *
   * @param days - Anzahl der Tage für die Analyse
   * @returns Erfolgsraten mit Trend-Informationen
   */
  public analyzeSuccessTrends(days: number = 7): ProjectSuccessRates {
    const rates = this.loadSuccessRates();
    const now = Date.now();
    const pastTime = now - days * 24 * 60 * 60 * 1000; // Millisekunden für n Tage

    // Analysiere den Trend für jeden Test
    for (const test of rates.testSuccessRates) {
      // Teile die Historie in zwei Hälften: ältere und neuere
      const recentHistory = test.history
        .filter((h) => h.timestamp >= pastTime)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (recentHistory.length < 2) {
        test.trend = "unknown"; // Zu wenige Daten für eine Trend-Analyse
        continue;
      }

      const midpoint = Math.floor(recentHistory.length / 2);
      const olderRuns = recentHistory.slice(0, midpoint);
      const newerRuns = recentHistory.slice(midpoint);

      // Berechne Erfolgsraten für die beiden Hälften
      const olderSuccessRate = this.calculateSuccessRateFromHistory(olderRuns);
      const newerSuccessRate = this.calculateSuccessRateFromHistory(newerRuns);

      // Bestimme den Trend basierend auf der Änderung
      const difference = newerSuccessRate - olderSuccessRate;

      if (Math.abs(difference) < 5) {
        test.trend = "stable";
      } else if (difference >= 5) {
        test.trend = "improving";
      } else {
        test.trend = "declining";
      }
    }

    return rates;
  }

  /**
   * Aktualisiert die Erfolgsrate für einen einzelnen Test
   */
  private updateSingleTestRate(
    rates: ProjectSuccessRates,
    test: PlaywrightSingleTestResult,
    runId: string,
    timestamp: number,
  ): void {
    const testId = test.path.split("/").pop() || test.filename;
    const existingTest = rates.testSuccessRates.find(
      (t) => t.testId === testId,
    );

    if (existingTest) {
      // Aktualisiere bestehenden Test
      existingTest.totalRuns++;

      if (test.status === "passed") existingTest.successfulRuns++;
      else if (test.status === "skipped") existingTest.skippedRuns++;
      else existingTest.failedRuns++;

      // Aktualisiere Erfolgsrate
      existingTest.successRate =
        (existingTest.successfulRuns / existingTest.totalRuns) * 100;

      // Aktualisiere letzte Ausführung
      existingTest.lastRun = {
        status: test.status,
        timestamp: timestamp,
        duration: test.duration,
      };

      // Füge neuen Eintrag zum Verlauf hinzu
      existingTest.history.push({
        timestamp: timestamp,
        status: test.status,
        duration: test.duration,
        runId: runId,
      });

      // Begrenze die Historie auf maximale Länge
      if (existingTest.history.length > this.maxHistoryLength) {
        existingTest.history = existingTest.history.slice(
          -this.maxHistoryLength,
        );
      }
    } else {
      // Erstelle neuen Test-Eintrag
      const newTest: TestSuccessRate = {
        testId: testId,
        testName: test.filename,
        successRate: test.status === "passed" ? 100 : 0,
        totalRuns: 1,
        successfulRuns: test.status === "passed" ? 1 : 0,
        failedRuns:
          test.status === "failed" || test.status === "timed-out" ? 1 : 0,
        skippedRuns: test.status === "skipped" ? 1 : 0,
        lastRun: {
          status: test.status,
          timestamp: timestamp,
          duration: test.duration,
        },
        history: [
          {
            timestamp: timestamp,
            status: test.status,
            duration: test.duration,
            runId: runId,
          },
        ],
        trend: "unknown",
      };

      rates.testSuccessRates.push(newTest);
      rates.totalTests = rates.testSuccessRates.length;
    }
  }

  /**
   * Berechnet die Gesamterfolgsrate neu
   */
  private recalculateOverallSuccessRate(rates: ProjectSuccessRates): void {
    if (rates.testSuccessRates.length === 0) {
      rates.overallSuccessRate = 0;
      return;
    }

    let totalSuccessRate = 0;
    for (const test of rates.testSuccessRates) {
      totalSuccessRate += test.successRate;
    }

    rates.overallSuccessRate = totalSuccessRate / rates.testSuccessRates.length;
  }

  /**
   * Berechnet die Erfolgsrate aus einem Verlauf
   */
  private calculateSuccessRateFromHistory(
    history: Array<{ status: string }>,
  ): number {
    if (history.length === 0) return 0;

    const successfulRuns = history.filter((h) => h.status === "passed").length;
    return (successfulRuns / history.length) * 100;
  }
}

// Default-Export für Kompatibilität mit bestehenden Importen
export default SuccessRateTracker;

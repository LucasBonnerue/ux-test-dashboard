/**
 * Flakiness Analyzer
 *
 * Dieses Modul implementiert die Funktionalität zur Erkennung und Bewertung von instabilen Tests (Flakiness).
 * Es analysiert Testlaufmuster, um instabile Tests zu identifizieren und entsprechend zu bewerten.
 */

import * as fs from "fs";
import * as path from "path";
import {
  PlaywrightTestResultFile,
  PlaywrightSingleTestResult,
} from "../../types/playwright-results";
import SuccessRateTracker, {
  ProjectSuccessRates,
  TestHistoryEntry,
} from "./success-rate-tracker";

export interface FlakinessMeasure {
  testId: string; // Eindeutige Test-ID
  testName: string; // Menschenlesbarer Testname
  flakinessScore: number; // Flakiness-Score (0-100, höher = instabiler)
  confidence: number; // Konfidenz der Bewertung (0-100%)
  lastChanged: number; // Zeitpunkt der letzten Statusänderung
  statusChanges: number; // Anzahl der Statusänderungen
  runCount: number; // Gesamtanzahl der Ausführungen
  alternatingPattern: boolean; // Zeigt alternierenden Erfolg/Fehlschlagmuster
  timeoutPattern: boolean; // Zeigt zeitüberschreitungsbasierte Instabilität
  durationVariance: number; // Varianz der Laufzeit (%)
  detectedPatterns: string[]; // Erkannte Instabilitätsmuster
  recommendations: string[]; // Empfehlungen zur Behebung
}

export interface ProjectFlakinessReport {
  overallFlakinessScore: number; // Gesamter Flakiness-Score für das Projekt
  totalTestsAnalyzed: number; // Anzahl der analysierten Tests
  flakyTestsCount: number; // Anzahl der instabilen Tests
  flakinessThreshold: number; // Schwellenwert für die Einstufung als instabil
  flakinessMeasures: FlakinessMeasure[]; // Einzelne Test-Flakiness-Messungen
  lastUpdated: number; // Zeitpunkt der letzten Aktualisierung
  timePeriod: {
    // Analysezeitraum
    start: number;
    end: number;
  };
}

export class FlakinessAnalyzer {
  private resultsDir: string;
  private storageFile: string;
  private flakinessThreshold: number;
  private minRunsForAnalysis: number;
  private successRateTracker: SuccessRateTracker;

  /**
   * Konstruktor
   *
   * @param baseDir - Basisverzeichnis für Ergebnisse
   * @param threshold - Schwellenwert für die Flakiness-Einstufung (0-100)
   * @param minRuns - Mindestanzahl der Ausführungen für eine Analyse
   */
  constructor(
    baseDir: string = path.join(process.cwd(), "tests", "dashboard"),
    threshold: number = 30,
    minRuns: number = 3,
  ) {
    this.resultsDir = path.join(baseDir, "results");
    this.storageFile = path.join(this.resultsDir, "flakiness-report.json");
    this.flakinessThreshold = threshold;
    this.minRunsForAnalysis = minRuns;
    this.successRateTracker = new SuccessRateTracker(baseDir);

    // Stelle sicher, dass das Ergebnisverzeichnis existiert
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Führt eine vollständige Flakiness-Analyse durch
   *
   * @param days - Anzahl der Tage für die Analyse rückwirkend
   * @returns Der Flakiness-Bericht
   */
  public analyzeFlakiness(days: number = 14): ProjectFlakinessReport {
    // Verwende den Erfolgsraten-Tracker, um Testdaten zu laden
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const successRates = this.successRateTracker.getSuccessRatesForPeriod(
      startDate,
      endDate,
    );
    const report = this.initializeReport(
      successRates.timeRange.start,
      successRates.timeRange.end,
    );

    for (const test of successRates.testSuccessRates) {
      // Ignoriere Tests mit zu wenigen Ausführungen für eine zuverlässige Analyse
      if (test.totalRuns < this.minRunsForAnalysis) continue;

      const measure = this.calculateFlakiness(test);
      if (measure) {
        report.flakinessMeasures.push(measure);

        // Zähle instabile Tests
        if (measure.flakinessScore >= this.flakinessThreshold) {
          report.flakyTestsCount++;
        }
      }
    }

    // Aktualisiere Zähler und berechne Gesamtflakiness
    report.totalTestsAnalyzed = report.flakinessMeasures.length;
    report.overallFlakinessScore = this.calculateOverallFlakiness(report);
    report.lastUpdated = Date.now();

    this.saveReport(report);

    return report;
  }

  /**
   * Lädt den gespeicherten Flakiness-Bericht
   */
  public loadReport(): ProjectFlakinessReport {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden des Flakiness-Berichts:", error);
    }

    // Initialisiere neuen Bericht, wenn keiner geladen werden kann
    return this.initializeReport(
      Date.now() - 14 * 24 * 60 * 60 * 1000,
      Date.now(),
    );
  }

  /**
   * Speichert den aktuellen Flakiness-Bericht
   */
  public saveReport(report: ProjectFlakinessReport): void {
    try {
      fs.writeFileSync(
        this.storageFile,
        JSON.stringify(report, null, 2),
        "utf-8",
      );
      console.log(`Flakiness-Bericht gespeichert unter ${this.storageFile}`);
    } catch (error) {
      console.error("Fehler beim Speichern des Flakiness-Berichts:", error);
    }
  }

  /**
   * Analysiert ein neues Testergebnis und aktualisiert den Flakiness-Bericht
   */
  public updateWithNewTestResult(
    result: PlaywrightTestResultFile,
  ): ProjectFlakinessReport {
    // Zuerst den Erfolgsraten-Tracker aktualisieren
    this.successRateTracker.updateSuccessRates(result);

    // Dann Flakiness neu analysieren
    return this.analyzeFlakiness();
  }

  /**
   * Gibt die instabilsten Tests zurück, sortiert nach Flakiness-Score
   */
  public getMostFlakyTests(limit: number = 10): FlakinessMeasure[] {
    const report = this.loadReport();
    return report.flakinessMeasures
      .sort((a, b) => b.flakinessScore - a.flakinessScore)
      .slice(0, limit);
  }

  /**
   * Initialisiert einen neuen Flakiness-Bericht
   */
  private initializeReport(
    startTime: number,
    endTime: number,
  ): ProjectFlakinessReport {
    return {
      overallFlakinessScore: 0,
      totalTestsAnalyzed: 0,
      flakyTestsCount: 0,
      flakinessThreshold: this.flakinessThreshold,
      flakinessMeasures: [],
      lastUpdated: Date.now(),
      timePeriod: {
        start: startTime,
        end: endTime,
      },
    };
  }

  /**
   * Berechnet den Flakiness-Score für einen einzelnen Test
   */
  private calculateFlakiness(testRate: any): FlakinessMeasure | null {
    // Extrahiere die benötigten Daten aus dem Erfolgsraten-Objekt
    const history = testRate.history;
    if (!history || history.length < this.minRunsForAnalysis) return null;

    const testId = testRate.testId;
    const testName = testRate.testName;
    const runCount = history.length;

    // Zähle Statusänderungen
    let statusChanges = 0;
    let timeouts = 0;
    let durations: number[] = [];

    for (let i = 1; i < history.length; i++) {
      const prevStatus = history[i - 1].status;
      const currStatus = history[i].status;

      if (prevStatus !== currStatus) {
        statusChanges++;
      }

      if (currStatus === "timed-out") {
        timeouts++;
      }

      durations.push(history[i].duration);
    }

    // Berechne Laufzeitvarianz
    const avgDuration =
      durations.reduce((sum, val) => sum + val, 0) / durations.length;
    const durationVariance =
      avgDuration > 0
        ? (Math.sqrt(
            durations.reduce(
              (sum, val) => sum + Math.pow(val - avgDuration, 2),
              0,
            ) / durations.length,
          ) /
            avgDuration) *
          100
        : 0;

    // Erkenne Muster
    const alternatingPattern = this.detectAlternatingPattern(
      history.map((h: TestHistoryEntry) => h.status),
    );
    const timeoutPattern = timeouts > 0;
    const detectedPatterns = [];

    if (alternatingPattern)
      detectedPatterns.push("Alternierendes Erfolg/Fehlschlag-Muster");
    if (timeoutPattern) detectedPatterns.push("Zeitüberschreitungs-Muster");
    if (durationVariance > 50) detectedPatterns.push("Hohe Laufzeitvarianz");

    // Berechne Flakiness-Score
    // Gewichtete Summe aus verschiedenen Faktoren
    const statusChangeFactor = Math.min(
      100,
      (statusChanges / (runCount - 1)) * 100,
    );
    const timeoutFactor = Math.min(100, (timeouts / runCount) * 100);
    const durationFactor = Math.min(100, durationVariance / 2);
    const alternatingFactor = alternatingPattern ? 100 : 0;

    // Gewichtete Berechnung des Flakiness-Scores
    const flakinessScore = Math.min(
      100,
      statusChangeFactor * 0.4 +
        timeoutFactor * 0.2 +
        durationFactor * 0.2 +
        alternatingFactor * 0.2,
    );

    // Berechne Konfidenz basierend auf der Anzahl der Testläufe
    // Je mehr Läufe, desto höher die Konfidenz
    const confidence = Math.min(100, (runCount / 10) * 100);

    // Generiere Empfehlungen
    const recommendations = this.generateRecommendations(
      alternatingPattern,
      timeoutPattern,
      durationVariance,
      statusChangeFactor,
    );

    return {
      testId,
      testName,
      flakinessScore,
      confidence,
      lastChanged: history[history.length - 1].timestamp,
      statusChanges,
      runCount,
      alternatingPattern,
      timeoutPattern,
      durationVariance,
      detectedPatterns,
      recommendations,
    };
  }

  /**
   * Erkennt ein alternierendes Muster (pass/fail/pass/fail)
   */
  private detectAlternatingPattern(statusHistory: string[]): boolean {
    if (statusHistory.length < 4) return false;

    let alternatingCount = 0;
    for (let i = 1; i < statusHistory.length; i++) {
      if (statusHistory[i] !== statusHistory[i - 1]) {
        alternatingCount++;
      }
    }

    // Wenn mehr als 60% der aufeinanderfolgenden Statuswerte unterschiedlich sind,
    // handelt es sich um ein alternierendes Muster
    return alternatingCount / (statusHistory.length - 1) > 0.6;
  }

  /**
   * Generiert Empfehlungen zur Behebung von Flakiness
   */
  private generateRecommendations(
    alternatingPattern: boolean,
    timeoutPattern: boolean,
    durationVariance: number,
    statusChangeRate: number,
  ): string[] {
    const recommendations = [];

    if (alternatingPattern) {
      recommendations.push(
        "Überprüfen Sie Abhängigkeiten zu anderen Tests oder externen Zuständen.",
      );
      recommendations.push("Testen Sie den Test isoliert vom Testpaket.");
    }

    if (timeoutPattern) {
      recommendations.push(
        "Erhöhen Sie das Timeout-Limit oder optimieren Sie die Testausführung.",
      );
      recommendations.push(
        "Überprüfen Sie auf langsame Netzwerkanfragen oder UI-Rendering.",
      );
    }

    if (durationVariance > 50) {
      recommendations.push(
        "Untersuchen Sie variable Leistungsaspekte wie Netzwerklatenz oder CPU-Last.",
      );
      recommendations.push(
        "Fügen Sie explizite Wartezeiten anstelle von impliziten Timeouts hinzu.",
      );
    }

    if (statusChangeRate > 70) {
      recommendations.push(
        "Überprüfen Sie auf Race-Conditions oder asynchrone Probleme.",
      );
      recommendations.push(
        "Implementieren Sie einen Wiederholungsmechanismus für Aktionen, die fehlschlagen können.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Führen Sie eine manuelle Überprüfung durch, um die Ursache der Instabilität zu ermitteln.",
      );
    }

    return recommendations;
  }

  /**
   * Berechnet den Gesamt-Flakiness-Score für das Projekt
   */
  private calculateOverallFlakiness(report: ProjectFlakinessReport): number {
    if (report.flakinessMeasures.length === 0) return 0;

    // Gewichteter Durchschnitt basierend auf der Konfidenz
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const measure of report.flakinessMeasures) {
      const weight = measure.confidence / 100;
      totalWeightedScore += measure.flakinessScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }
}

// Export der Klasse für die Verwendung in anderen Modulen
export default FlakinessAnalyzer;

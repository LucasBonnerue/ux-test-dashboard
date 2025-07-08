/**
 * Playwright-Testergebnisse Frontend-Integration
 *
 * Dieses Modul bietet TypeScript-Funktionen zur Kommunikation mit den
 * API-Endpunkten für die Verwaltung von Playwright-Testergebnissen.
 */

import {
  PlaywrightTestResultFile,
  PlaywrightSingleTestResult,
  PlaywrightTestRunConfig,
  PlaywrightTestMetrics,
} from "../types/playwright-results";

/**
 * Schnittstelle für API-Antworten
 */
interface ApiResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Einfache Zusammenfassung eines Testergebnisses zur Anzeige in Listen
 */
export interface TestResultSummary {
  runId: string;
  timestamp: number;
  runName: string;
  success: boolean;
  testCount: number;
  metrics: PlaywrightTestMetrics;
  filename: string;
}

/**
 * Schnittstelle für Vergleichsergebnisse
 */
export interface TestResultComparison {
  baseline: {
    runId: string;
    timestamp: number;
    runName: string;
    metrics: PlaywrightTestMetrics;
  };
  current: {
    runId: string;
    timestamp: number;
    runName: string;
    metrics: PlaywrightTestMetrics;
  };
  changes: {
    passed: number;
    failed: number;
    skipped: number;
    totalDuration: number;
    averageDuration: number;
  };
  testChanges: Array<{
    filename: string;
    previousStatus: string;
    currentStatus: string;
    statusChanged: boolean;
    durationChange: number;
  }>;
}

// Statusnachrichten und Fehlerobjekt für UI-Aktualisierungen
let statusMessage = "";
let lastError: Error | null = null;

/**
 * Speichert ein Playwright-Testergebnis
 *
 * @param output - Die Konsolenausgabe des Testlaufs
 * @param config - Die Konfiguration des Testlaufs
 * @param runName - Optionaler Name für den Testlauf
 * @returns Promise mit der ID des gespeicherten Testlaufs
 */
export async function saveTestResults(
  output: string,
  config: PlaywrightTestRunConfig,
  runName?: string,
): Promise<string> {
  try {
    statusMessage = "Speichere Testergebnis...";

    const response = await fetch("/api/playwright-results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ output, config, runName }),
    });

    const data = (await response.json()) as ApiResponse<{ runId: string }>;

    if (!data.success) {
      throw new Error(
        data.error || "Unbekannter Fehler beim Speichern des Testergebnisses",
      );
    }

    statusMessage = "Testergebnis erfolgreich gespeichert";
    return data.runId;
  } catch (error) {
    statusMessage = `Fehler beim Speichern des Testergebnisses: ${error instanceof Error ? error.message : String(error)}`;
    lastError = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
}

/**
 * Lädt alle gespeicherten Testergebnisse
 *
 * @returns Promise mit einer Liste von Testergebnissen
 */
export async function loadTestResults(): Promise<TestResultSummary[]> {
  try {
    statusMessage = "Lade gespeicherte Testergebnisse...";

    const response = await fetch("/api/playwright-results");
    const data = (await response.json()) as ApiResponse<{
      results: TestResultSummary[];
    }>;

    if (!data.success) {
      throw new Error(
        data.error || "Unbekannter Fehler beim Laden der Testergebnisse",
      );
    }

    statusMessage = `${data.results.length} Testergebnisse geladen`;
    return data.results;
  } catch (error) {
    statusMessage = `Fehler beim Laden der Testergebnisse: ${error instanceof Error ? error.message : String(error)}`;
    lastError = error instanceof Error ? error : new Error(String(error));
    return [];
  }
}

/**
 * Lädt ein bestimmtes Testergebnis
 *
 * @param runId - ID des Testlaufs
 * @returns Promise mit dem Testergebnis
 */
export async function loadTestResult(
  runId: string,
): Promise<PlaywrightTestResultFile | null> {
  try {
    statusMessage = `Lade Testergebnis ${runId}...`;

    const response = await fetch(`/api/playwright-results/${runId}`);
    const data = (await response.json()) as ApiResponse<{
      result: PlaywrightTestResultFile;
    }>;

    if (!data.success) {
      throw new Error(
        data.error || "Unbekannter Fehler beim Laden des Testergebnisses",
      );
    }

    statusMessage = "Testergebnis erfolgreich geladen";
    return data.result;
  } catch (error) {
    statusMessage = `Fehler beim Laden des Testergebnisses: ${error instanceof Error ? error.message : String(error)}`;
    lastError = error instanceof Error ? error : new Error(String(error));
    return null;
  }
}

/**
 * Löscht ein Testergebnis
 *
 * @param runId - ID des Testlaufs
 * @returns Promise mit dem Erfolg/Misserfolg
 */
export async function deleteTestResult(runId: string): Promise<boolean> {
  try {
    statusMessage = `Lösche Testergebnis ${runId}...`;

    const response = await fetch(`/api/playwright-results/${runId}`, {
      method: "DELETE",
    });

    const data = (await response.json()) as ApiResponse<{ message: string }>;

    if (!data.success) {
      throw new Error(
        data.error || "Unbekannter Fehler beim Löschen des Testergebnisses",
      );
    }

    statusMessage = "Testergebnis erfolgreich gelöscht";
    return true;
  } catch (error) {
    statusMessage = `Fehler beim Löschen des Testergebnisses: ${error instanceof Error ? error.message : String(error)}`;
    lastError = error instanceof Error ? error : new Error(String(error));
    return false;
  }
}

/**
 * Vergleicht zwei Testergebnisse
 *
 * @param runId1 - ID des ersten Testlaufs
 * @param runId2 - ID des zweiten Testlaufs
 * @returns Promise mit dem Vergleichsergebnis
 */
export async function compareTestResults(
  runId1: string,
  runId2: string,
): Promise<TestResultComparison | null> {
  try {
    statusMessage = `Vergleiche Testergebnisse ${runId1} und ${runId2}...`;

    const response = await fetch(
      `/api/playwright-results/compare/${runId1}/${runId2}`,
    );
    const data = (await response.json()) as ApiResponse<{
      comparison: TestResultComparison;
    }>;

    if (!data.success) {
      throw new Error(
        data.error || "Unbekannter Fehler beim Vergleichen der Testergebnisse",
      );
    }

    statusMessage = "Testergebnisse erfolgreich verglichen";
    return data.comparison;
  } catch (error) {
    statusMessage = `Fehler beim Vergleichen der Testergebnisse: ${error instanceof Error ? error.message : String(error)}`;
    lastError = error instanceof Error ? error : new Error(String(error));
    return null;
  }
}

/**
 * Konvertiert einen Zeitstempel in einen lesbaren String
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("de-DE");
}

/**
 * Gibt die aktuelle Statusmeldung zurück
 */
export function getStatusMessage(): string {
  return statusMessage;
}

/**
 * Gibt den letzten Fehler zurück
 */
export function getLastError(): Error | null {
  return lastError;
}

/**
 * Setzt die Statusmeldung
 */
export function setStatusMessage(message: string): void {
  statusMessage = message;
}

/**
 * Formatiert die Dauer in Millisekunden als lesbaren String
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  } else {
    return `${(ms / 1000).toFixed(2)} s`;
  }
}

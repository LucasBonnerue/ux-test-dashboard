/**
 * Typdefinitionen für Testvergleiche und -änderungen
 *
 * Diese Typen definieren die Struktur für den Vergleich zwischen verschiedenen Testläufen
 */

/**
 * Status eines Tests
 */
export type TestStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "timed-out"
  | "interrupted"
  | "removed"
  | "new";

/**
 * Repräsentiert die Änderungen eines einzelnen Tests zwischen zwei Läufen
 */
export interface TestChange {
  /**
   * Dateiname des Tests
   */
  filename: string;

  /**
   * Status im vorherigen Testlauf
   */
  previousStatus: TestStatus;

  /**
   * Status im aktuellen Testlauf
   */
  currentStatus: TestStatus;

  /**
   * Flag ob sich der Status geändert hat
   */
  statusChanged: boolean;

  /**
   * Änderung der Laufzeit (positiv = langsamer, negativ = schneller)
   */
  durationChange: number;
}

/**
 * Repräsentiert den vollständigen Vergleich zweier Testläufe
 */
export interface TestComparison {
  baseline: {
    runId: string;
    timestamp: number;
    runName?: string;
    metrics: any; // Kann später präziser definiert werden
  };
  current: {
    runId: string;
    timestamp: number;
    runName?: string;
    metrics: any; // Kann später präziser definiert werden
  };
  testChanges: TestChange[];
  metricsComparison: {
    durationChange: number;
    passRateChange: number;
    failRateChange: number;
    skipRateChange: number;
  };
}

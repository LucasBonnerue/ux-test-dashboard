/**
 * Typdefinitionen für Playwright-Testergebnisse
 *
 * Diese Typen definieren die Struktur der Playwright-Testergebnisse
 * für persistente Speicherung und Vergleich
 */

export interface PlaywrightTestResultFile {
  /**
   * Eindeutige ID für diesen Testlauf
   */
  runId: string;

  /**
   * Zeitstempel des Testlaufs
   */
  timestamp: number;

  /**
   * Name oder Beschreibung des Testlaufs
   */
  runName?: string;

  /**
   * Gesamtergebnis des Testlaufs
   */
  success: boolean;

  /**
   * Ergebnisse für jeden einzelnen Test
   */
  testResults: PlaywrightSingleTestResult[];

  /**
   * Konfiguration des Testlaufs
   */
  config: PlaywrightTestRunConfig;

  /**
   * Standardisierte Metriken für Vergleichszwecke
   */
  metrics: PlaywrightTestMetrics;
}

export interface PlaywrightSingleTestResult {
  /**
   * Dateiname des Tests
   */
  filename: string;

  /**
   * Voller Pfad zur Testdatei
   */
  path: string;

  /**
   * Status des Tests (passed, failed, skipped, etc.)
   */
  status: "passed" | "failed" | "skipped" | "timed-out" | "interrupted";

  /**
   * Dauer des Tests in Millisekunden
   */
  duration: number;

  /**
   * Fehlerdetails, falls vorhanden
   */
  error?: {
    message: string;
    stack?: string;
  };

  /**
   * Screenshots, falls vorhanden (Base64-kodierte Bilder)
   */
  screenshots?: string[];

  /**
   * Konsolenausgabe des Tests
   */
  output?: string;
}

export interface PlaywrightTestRunConfig {
  /**
   * Headless-Modus
   */
  headless: boolean;

  /**
   * Verwendeter Reporter
   */
  reporter: string;

  /**
   * Anzahl der Worker
   */
  workers: number;

  /**
   * Weitere Konfigurationsoptionen
   */
  [key: string]: any;
}

export interface PlaywrightTestMetrics {
  /**
   * Anzahl der bestandenen Tests
   */
  passed: number;

  /**
   * Anzahl der fehlgeschlagenen Tests
   */
  failed: number;

  /**
   * Anzahl der übersprungenen Tests
   */
  skipped: number;

  /**
   * Erfolgsrate in Prozent
   */
  passRate: number;

  /**
   * Fehlerrate in Prozent
   */
  failRate: number;

  /**
   * Übersprungenrate in Prozent
   */
  skipRate: number;

  /**
   * Gesamtdauer in Millisekunden
   */
  totalDuration: number;

  /**
   * Gesamtzahl der Tests
   */
  totalTests: number;

  /**
   * Durchschnittliche Dauer pro Test in Millisekunden
   */
  averageDuration: number;
}

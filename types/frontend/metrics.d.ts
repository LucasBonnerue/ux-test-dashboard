/**
 * TypeScript-Deklarationen für Metrik-Daten im Frontend
 * Enthält Typdefinitionen für Erfolgsraten, Flakiness und verwandte Datenstrukturen
 */

// Erfolgsraten-Typen
interface SuccessRate {
  testName: string;
  successRate: number;  // Prozentsatz (0-100)
  trend: 'up' | 'down' | 'stable';
  lastRun?: {
    timestamp: string;
    success: boolean;
    duration?: number;
  };
}

interface SuccessRateResponse {
  success: boolean;
  testSuccessRates: SuccessRate[];
  message?: string;
  error?: string;
}

interface SuccessTrend {
  date: string;
  rate: number;
  testCount: number;
}

interface SuccessTrendResponse {
  success: boolean;
  trends: SuccessTrend[];
  message?: string;
  error?: string;
}

// Flakiness-Typen
interface FlakinessMeasure {
  testName: string;
  flakinessScore: number;  // Prozentsatz (0-100)
  statusChanges: number;
  runCount: number;
  durationVariance?: number;
  detectedPatterns: string[];
  recommendations: string[];
}

interface TestRun {
  timestamp: string;
  success: boolean;
  duration: number;
  errorMessage?: string;
  runId: string;
}

interface FlakinessReport {
  success: boolean;
  overallFlakinessScore: number;
  flakyTestsCount: number;
  totalTestsAnalyzed: number;
  flakinessThreshold: number;
  timePeriod: {
    start: string;
    end: string;
  };
  flakinessMeasures: FlakinessMeasure[];
  message?: string;
  error?: string;
}

interface FlakyTestsResponse {
  success: boolean;
  flakyTests: FlakinessMeasure[];
  message?: string;
  error?: string;
}

// Chart-Konfiguration
interface ChartColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  light: string;
  dark: string;
}

// Gemeinsame UI-Elemente
interface UIElements {
  container: HTMLElement | null;
  loadingIndicator: HTMLElement | null;
  errorMessage: HTMLElement | null;
  chart?: HTMLCanvasElement | null;
}

// API-Funktionen
interface APIFunctions {
  loadSuccessRates: () => Promise<void>;
  loadSuccessTrends: () => Promise<void>;
  loadFlakinessReport: () => Promise<void>;
  loadFlakyTests: () => Promise<void>;
}

/**
 * Mock-Daten für Flakiness-Metriken
 * Verwendet in der TypeScript-Migration des UX-Test-Dashboards
 */

// Interfaces für Flakiness-Metriken
export interface FlakinessMeasure {
  testId: string;
  testName: string;
  flakinessScore: number;
  confidence: number;
  lastChanged: number;
  statusChanges: number;
  runCount: number;
  alternatingPattern: boolean;
  timeoutPattern: boolean;
  durationVariance: number;
  detectedPatterns: string[];
  recommendations: string[];
}

export interface TimePeriod {
  start: number;
  end: number;
}

export interface FlakinessReport {
  overallFlakinessScore: number;
  totalTestsAnalyzed: number;
  flakyTestsCount: number;
  flakinessThreshold: number;
  flakinessMeasures: FlakinessMeasure[];
  lastUpdated: number;
  timePeriod: TimePeriod;
}

// Mock-Daten für Flakiness-Bericht
export const mockFlakinessReport: FlakinessReport = {
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

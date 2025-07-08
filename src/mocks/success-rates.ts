/**
 * Mock-Daten für Erfolgsraten von Testläufen
 * Verwendet in der TypeScript-Migration des UX-Test-Dashboards
 */

// Interfaces für Test-Erfolgsraten
export interface TestRun {
  timestamp: number;
  status: "passed" | "failed" | "skipped" | "timed-out";
  duration: number;
  runId: string;
}

export interface TestSuccessRate {
  testId: string;
  testName: string;
  successRate: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  skippedRuns: number;
  lastRun: {
    status: TestRun["status"];
    timestamp: number;
    duration: number;
  };
  history: TestRun[];
  trend: "stable" | "improving" | "declining";
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface SuccessRatesReport {
  overallSuccessRate: number;
  totalTests: number;
  testSuccessRates: TestSuccessRate[];
  lastUpdated: number;
  timeRange: TimeRange;
}

// Mock-Daten für Erfolgsraten
export const mockSuccessRates: SuccessRatesReport = {
  overallSuccessRate: 86.7,
  totalTests: 45,
  testSuccessRates: [
    {
      testId: "navigation-menu.spec.ts",
      testName: "Navigation Menu Tests",
      successRate: 100,
      totalRuns: 10,
      successfulRuns: 10,
      failedRuns: 0,
      skippedRuns: 0,
      lastRun: {
        status: "passed",
        timestamp: Date.now() - 86400000,
        duration: 3200,
      },
      history: Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - i * 86400000,
        status: "passed",
        duration: 3200 + Math.random() * 200,
        runId: `run-${i}`,
      })),
      trend: "stable",
    },
    {
      testId: "login-form.spec.ts",
      testName: "Login Form Validation",
      successRate: 80,
      totalRuns: 10,
      successfulRuns: 8,
      failedRuns: 2,
      skippedRuns: 0,
      lastRun: {
        status: "passed",
        timestamp: Date.now() - 172800000,
        duration: 2100,
      },
      history: Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - i * 86400000,
        status: i < 2 ? "failed" : "passed",
        duration: 2100 + Math.random() * 300,
        runId: `run-${i}`,
      })),
      trend: "improving",
    },
    {
      testId: "checkout-flow.spec.ts",
      testName: "Checkout Flow",
      successRate: 60,
      totalRuns: 10,
      successfulRuns: 6,
      failedRuns: 4,
      skippedRuns: 0,
      lastRun: {
        status: "failed",
        timestamp: Date.now() - 43200000,
        duration: 5600,
      },
      history: Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - i * 86400000,
        status: i % 3 === 0 ? "failed" : "passed",
        duration: 5600 + Math.random() * 400,
        runId: `run-${i}`,
      })),
      trend: "declining",
    },
  ],
  lastUpdated: Date.now(),
  timeRange: {
    start: Date.now() - 30 * 86400000,
    end: Date.now(),
  },
};

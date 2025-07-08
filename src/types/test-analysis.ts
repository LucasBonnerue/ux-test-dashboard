/**
 * Typdefinitionen für Test-Analyse-Funktionalität
 * Verwendet in der TypeScript-Migration des UX-Test-Dashboards
 */

// Test-Metadaten und Analyse
export interface TestSelector {
  type: "testId" | "text" | "role" | "label" | "placeholder" | "xpath";
  value: string;
  usage: string;
  line: number;
}

export interface TestAssertion {
  type: string;
  condition: string;
  line: number;
}

export interface TestCoverage {
  area: string[];
  type: string[];
}

export interface TestMetadata {
  file: string;
  path: string;
  name: string;
  title: string;
  description: string;
  testType: string;
  selectors: TestSelector[];
  assertions: TestAssertion[];
  dependencies: string[];
  timeouts: number[];
  screenshots: boolean;
  complexity: number;
  lineCount: number;
  updatedAt: string;
  functionalAreas: string[];
  coverage: TestCoverage;
  error?: string;
}

// Coverage-Matrix für Test-Funktionalitäten
export interface CoverageMatrixEntry {
  area: string;
  coverage: {
    [testType: string]: number;
  };
  total: number;
}

export interface CoverageMatrix {
  areas: CoverageMatrixEntry[];
  types: {
    [testType: string]: number;
  };
  timestamp: string;
}

// API-Antwort für Test-Analyse
export interface TestAnalysisResponse {
  success: boolean;
  testsAnalyzed: number;
  testMetadata: TestMetadata[];
  results: TestMetadata[];
  coverageMatrix: CoverageMatrix;
}

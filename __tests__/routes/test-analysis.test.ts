// Mocks vor dem Import erstellen
jest.mock("../../src/services/test-analyzer", () => {
  // Mock-Metadaten für einen Test
  const mockTestMetadata = {
    file: "example.spec.ts",
    path: "tests/example.spec.ts",
    name: "example",
    title: "Example Test Suite",
    description: "This is an example test suite",
    testType: "e2e",
    selectors: [
      { type: "testId", value: "submit-button", usage: "getByTestId('submit-button')", line: 25 },
      { type: "text", value: "Submit", usage: "getByText('Submit')", line: 30 },
    ],
    assertions: [
      { type: "toBe", condition: "expect(result).toBe(true)", line: 35 },
      { type: "toHaveLength", condition: "expect(items).toHaveLength(3)", line: 40 },
    ],
    dependencies: ["@testing-library/react", "playwright"],
    timeouts: [5000, 10000],
    screenshots: true,
    complexity: 12,
    lineCount: 150,
    updatedAt: "2025-07-07T12:00:00.000Z",
    functionalAreas: ["authentication", "forms"],
    coverage: {
      area: ["authentication", "forms"],
      type: ["e2e"]
    }
  };

  // Mock-Coverage-Matrix
  const mockCoverageMatrix = {
    areas: [
      {
        area: "authentication",
        coverage: { e2e: 5, component: 3, unit: 10 },
        total: 18
      },
      {
        area: "forms",
        coverage: { e2e: 8, component: 12, unit: 6 },
        total: 26
      }
    ],
    types: { e2e: 13, component: 15, unit: 16 },
    timestamp: "2025-07-07T12:00:00.000Z"
  };

  // Mock für TestAnalyzer-Methoden
  const analyzeTest = jest.fn().mockResolvedValue(mockTestMetadata);
  const analyzeAllTests = jest.fn().mockResolvedValue([mockTestMetadata, mockTestMetadata]);
  const generateCoverageMatrix = jest.fn().mockReturnValue(mockCoverageMatrix);
  const analyzeTestSuite = jest.fn().mockResolvedValue({
    testsAnalyzed: 2,
    testMetadata: [mockTestMetadata, mockTestMetadata],
    coverageMatrix: mockCoverageMatrix
  });

  // Mock-Factory-Funktion
  return {
    createTestAnalyzer: jest.fn().mockImplementation(() => {
      return {
        analyzeTest,
        analyzeAllTests,
        generateCoverageMatrix,
        analyzeTestSuite,
        options: {
          testDir: "__tests__",
          resultsDir: "test-results"
        }
      };
    })
  };
});

// Logger-Mock
jest.mock("../../src/utils/logger", () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      return {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      };
    }),
    createLogger: jest.fn().mockImplementation(() => {
      return {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      };
    })
  };
});

// Erst nach den Mocks importieren
import request from "supertest";
import express from "express";
import * as http from "http";
import createTestAnalysisRouter from "../../src/routes/test-analysis";
import { createTestAnalyzer } from "../../src/services/test-analyzer";

// Gemeinsame Mock-Daten für Tests
const mockTestMetadata = {
  file: "example.spec.ts",
  path: "tests/example.spec.ts",
  name: "example",
  title: "Example Test Suite",
  testType: "e2e",
  selectors: [
    { type: "testId", value: "submit-button", usage: "getByTestId('submit-button')", line: 25 },
    { type: "text", value: "Submit", usage: "getByText('Submit')", line: 30 },
  ],
  assertions: [
    { type: "toBe", condition: "expect(result).toBe(true)", line: 35 },
    { type: "toHaveLength", condition: "expect(items).toHaveLength(3)", line: 40 },
  ]
};

const mockCoverageMatrix = {
  timestamp: "2025-07-07T12:00:00.000Z",
  areas: [
    {
      area: "authentication",
      coverage: { unit: 10, component: 3, e2e: 5 },
      total: 18
    },
    {
      area: "forms",
      coverage: { unit: 6, component: 12, e2e: 8 },
      total: 26
    }
  ],
  types: { unit: 16, component: 15, e2e: 13 }
};

describe("Test Analysis Routes", () => {
  let app: express.Application;
  let server: http.Server;
  let mockAnalyzeTest: jest.Mock;
  let mockAnalyzeAllTests: jest.Mock;
  let mockGenerateCoverageMatrix: jest.Mock;
  let mockAnalyzeTestSuite: jest.Mock;

  // Globaler Timeout für alle Tests in dieser Datei
  jest.setTimeout(30000);
  
  beforeEach(async () => {
    // Mocks zurücksetzen
    jest.clearAllMocks();

    // Zugriff auf die Mock-Instanz und Funktionen bekommen
    const testAnalyzer = createTestAnalyzer({
      testDir: "__tests__",
      resultsDir: "test-results",
      logger: { info: jest.fn() } as any
    });
    
    mockAnalyzeTest = testAnalyzer.analyzeTest as jest.Mock;
    mockAnalyzeAllTests = testAnalyzer.analyzeAllTests as jest.Mock;
    mockGenerateCoverageMatrix = testAnalyzer.generateCoverageMatrix as jest.Mock;
    mockAnalyzeTestSuite = testAnalyzer.analyzeTestSuite as jest.Mock;

    // Logger-Mock für den Router
    const loggerMock = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };

    // Express-App für Tests erstellen
    app = express();
    app.use(express.json());
    
    // Test-Analysis-Router erstellen mit Mocks
    const testAnalysisRouter = createTestAnalysisRouter(loggerMock, {
      testDir: "__tests__",
      resultsDir: "test-results"
    });
    
    app.use("/api/test-analysis", testAnalysisRouter);
    
    // HTTP-Server erstellen und starten
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        resolve();
      });
    });
  });
  
  afterEach(async () => {
    // Server nach jedem Test schließen
    if (server?.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe("GET /api/test-analysis/test/:testId", () => {
    // Erhöhe den Timeout für diesen Test
    // Global timeout ist bereits gesetzt
    
    it("sollte Metadaten für einen einzelnen Test zurückgeben", async () => {
      // Test-Parameter
      const testPath = "tests/example.spec.ts";
      
      // Mock mit den richtigen Rückgabewerten konfigurieren
      mockAnalyzeTest.mockResolvedValue(mockTestMetadata);

      // Route testen
      const testId = encodeURIComponent(testPath);
      const response = await request(server)
        .get(`/api/test-analysis/test/${testId}`);
      
      // Der tatsächlich verwendete Pfad im TestAnalyzer
      const expectedPath = "__tests__/tests/example.spec.ts";

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("testMetadata");
      expect(response.body.testMetadata).toEqual(mockTestMetadata);
      expect(mockAnalyzeTest).toHaveBeenCalledWith(expectedPath);
    });

    it("sollte einen Fehler zurückgeben, wenn kein testPath angegeben ist", async () => {
      // Höherer Timeout für diesen Test
      // Global timeout ist bereits gesetzt
      // Route testen mit ungültigem testId
      const response = await request(server)
        .get("/api/test-analysis/test/");

      // Assertions
      expect(response.status).toBe(404);
      expect(mockAnalyzeTest).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/test-analysis/analyze", () => {
    // Erhöhe den Timeout für diese Testgruppe
    // Global timeout ist bereits gesetzt
    
    it("sollte Metadaten für alle Tests zurückgeben", async () => {
      // Mock mit den richtigen Rückgabewerten konfigurieren
      mockAnalyzeAllTests.mockResolvedValue([mockTestMetadata, mockTestMetadata]);

      // Route testen
      const response = await request(server)
        .get("/api/test-analysis/analyze");

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("testMetadata");
      expect(response.body.testMetadata).toBeInstanceOf(Array);
      expect(response.body.testMetadata.length).toBe(2);
      expect(response.body).toHaveProperty("coverageMatrix");
      expect(response.body).toHaveProperty("testsAnalyzed", 2);
      expect(mockAnalyzeTestSuite).toHaveBeenCalled();
    });

    it("sollte das searchPattern-Query-Parameter verarbeiten", async () => {
      // Höherer Timeout für diesen Test
      // Global timeout ist bereits gesetzt
      // Test-Parameter
      const searchPattern = "auth";
      
      // Mock mit den richtigen Rückgabewerten konfigurieren
      mockAnalyzeAllTests.mockResolvedValue([mockTestMetadata]);

      // Route testen
      const response = await request(server)
        .get("/api/test-analysis/analyze")
        .query({ pattern: searchPattern });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(mockAnalyzeTestSuite).toHaveBeenCalledWith(searchPattern);
    });
  });

  describe("GET /api/test-analysis/coverage", () => {
    // Erhöhe den Timeout für diese Testgruppe
    // Global timeout ist bereits gesetzt
    
    it("sollte die Coverage-Matrix zurückgeben", async () => {
      // Mock mit den richtigen Rückgabewerten konfigurieren
      mockAnalyzeTestSuite.mockResolvedValue({
        testsAnalyzed: 2,
        testMetadata: [mockTestMetadata, mockTestMetadata],
        coverageMatrix: mockCoverageMatrix
      });

      // Route testen
      const response = await request(server)
        .get("/api/test-analysis/coverage");

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("coverageMatrix");
      expect(response.body.coverageMatrix).toEqual(mockCoverageMatrix);
      expect(mockAnalyzeAllTests).toHaveBeenCalled();
      expect(mockGenerateCoverageMatrix).toHaveBeenCalled();
    });
  });

  describe("POST /api/test-analysis/metadata", () => {
    // Erhöhe den Timeout für diese Testgruppe
    // Global timeout ist bereits gesetzt
    
    it("sollte Test-Metadaten speichern können", async () => {
      // Mock-Testdaten für den POST-Request
      const testMetadata = {
        file: "new-test.spec.ts",
        path: "tests/new-test.spec.ts",
        name: "new-test",
        testType: "component",
        functionalAreas: ["ui", "forms"]
      };

      // Route testen
      const response = await request(server)
        .post("/api/test-analysis/metadata")
        .send({ metadata: [testMetadata] });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Test-Metadaten erfolgreich");
    });

    it("sollte einen Fehler zurückgeben, wenn keine Metadaten gesendet werden", async () => {
      // Höherer Timeout für diesen Test
      // Global timeout ist bereits gesetzt
      
      // Route testen ohne korrekten Body
      const response = await request(server)
        .post("/api/test-analysis/metadata")
        .send({});

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Ungültiges Format");
    });
  });
});

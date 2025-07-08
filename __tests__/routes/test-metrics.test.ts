// Mocks vor dem Import erstellen
jest.mock("../../utils/metrics/flakiness-analyzer", () => {
  // Mocks direkt hier innerhalb der Funktion erstellen
  const mockFlakinessReport = {
    overallFlakinessScore: 42,
    totalTestsAnalyzed: 10,
    flakyTestsCount: 3,
    flakinessThreshold: 30,
    flakinessMeasures: [
      { testId: "test1", flakinessScore: 60, testName: "Test 1" },
      { testId: "test2", flakinessScore: 20, testName: "Test 2" },
    ],
    lastUpdated: Date.now(),
    timePeriod: { start: 1625097600000, end: 1625270400000 },
  };

  const mockFlakyTests = [
    { testId: "test1", flakinessScore: 80, testName: "Test 1" },
    { testId: "test2", flakinessScore: 60, testName: "Test 2" },
  ];

  const analyzeFlakiness = jest.fn().mockReturnValue(mockFlakinessReport);
  const getMostFlakyTests = jest.fn().mockReturnValue(mockFlakyTests);
  const updateWithNewTestResult = jest
    .fn()
    .mockReturnValue(mockFlakinessReport);

  return jest.fn().mockImplementation(() => {
    return {
      analyzeFlakiness,
      getMostFlakyTests,
      updateWithNewTestResult,
      loadReport: jest.fn(),
      saveReport: jest.fn(),
    };
  });
});

jest.mock("../../utils/metrics/success-rate-tracker", () => {
  return jest.fn().mockImplementation(() => {
    return {
      updateSuccessRates: jest.fn(),
      getSuccessRates: jest.fn().mockReturnValue({}),
    };
  });
});

// Erst nach den Mocks importieren
import request from "supertest";
import express from "express";
import testMetricsRouter from "../../routes/test-metrics";

// Gemeinsame Mock-Daten für Tests definieren
const mockFlakinessReport = {
  overallFlakinessScore: 42,
  totalTestsAnalyzed: 10,
  flakyTestsCount: 3,
  flakinessThreshold: 30,
  flakinessMeasures: [
    { testId: "test1", flakinessScore: 60, testName: "Test 1" },
    { testId: "test2", flakinessScore: 20, testName: "Test 2" },
  ],
  lastUpdated: Date.now(),
  timePeriod: { start: 1625097600000, end: 1625270400000 },
};

const mockFlakyTests = [
  { testId: "test1", flakinessScore: 80, testName: "Test 1" },
  { testId: "test2", flakinessScore: 60, testName: "Test 2" },
];

describe("Test Metrics Routes", () => {
  let app: express.Application;

  let mockAnalyzeFlakiness: jest.Mock;
  let mockGetMostFlakyTests: jest.Mock;
  let mockUpdateWithNewTestResult: jest.Mock;

  beforeEach(() => {
    // Mock für FlakinessAnalyzer zurücksetzen
    jest.clearAllMocks();

    // Zugriff auf die Mock-Instanz und Funktionen bekommen
    const FlakinessAnalyzer = require("../../utils/metrics/flakiness-analyzer");
    const mockInstance = new FlakinessAnalyzer();
    mockAnalyzeFlakiness = mockInstance.analyzeFlakiness;
    mockGetMostFlakyTests = mockInstance.getMostFlakyTests;
    mockUpdateWithNewTestResult = mockInstance.updateWithNewTestResult;

    // Die Mock-Funktionen mit den richtigen Rückgabewerten konfigurieren
    mockAnalyzeFlakiness.mockReturnValue(mockFlakinessReport);
    mockGetMostFlakyTests.mockReturnValue(mockFlakyTests);
    mockUpdateWithNewTestResult.mockReturnValue(mockFlakinessReport);

    // Express-App für Tests erstellen
    app = express();
    app.use(express.json());
    // Router-Definition mit dem richtigen API-Pfad verwenden
    app.use("/api/test-metrics", testMetricsRouter);
  });

  describe("GET /api/test-metrics/flakiness", () => {
    it("sollte einen Flakiness-Bericht zurückgeben", async () => {
      // Wir nutzen direkt die global definierten Mocks

      // Route testen
      const response = await request(app)
        .get("/api/test-metrics/flakiness")
        .query({ days: "30" });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body.flakinessReport).toEqual(mockFlakinessReport);
      expect(mockAnalyzeFlakiness).toHaveBeenCalledWith(30);
    });

    it("sollte den Default-Wert für days verwenden, wenn nicht angegeben", async () => {
      // Wir nutzen direkt die global definierten Mocks

      // Route testen
      await request(app).get("/api/test-metrics/flakiness");

      // Prüfen ob analyzeFlakiness mit Default-Wert (14) aufgerufen wurde
      // Anmerkung: Der Default-Wert in der Implementierung ist 14, nicht 30
      expect(mockAnalyzeFlakiness).toHaveBeenCalledWith(14);
    });
  });

  describe("GET /api/test-metrics/flaky-tests", () => {
    it("sollte die instabilsten Tests zurückgeben", async () => {
      // Wir nutzen direkt die global definierten Mocks

      // Route testen
      const response = await request(app)
        .get("/api/test-metrics/flaky-tests")
        .query({ limit: "5" });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body.flakyTests).toEqual(mockFlakyTests);
      expect(mockGetMostFlakyTests).toHaveBeenCalledWith(5);
    });

    it("sollte den Default-Wert für limit verwenden, wenn nicht angegeben", async () => {
      // Wir nutzen direkt die global definierten Mocks

      // Route testen
      await request(app).get("/api/test-metrics/flaky-tests");

      // Prüfen ob getMostFlakyTests mit Default-Wert (10) aufgerufen wurde
      expect(mockGetMostFlakyTests).toHaveBeenCalledWith(10);
    });
  });

  describe("POST /api/test-metrics/update", () => {
    it("sollte den Flakiness-Bericht mit neuen Testresultaten aktualisieren", async () => {
      // Mock-Testdaten - Format, das dem tatsächlichen API-Request entspricht
      const mockTestResult = {
        runId: "12345",
        runName: "Test Run 123",
        timestamp: Date.now(),
        success: true,
        testResults: [
          { path: "test1.spec.ts", status: "passed", duration: 1500 },
          { path: "test2.spec.ts", status: "failed", duration: 2000 },
        ],
        config: {
          browser: "chromium",
          headless: true,
        },
        metrics: {
          totalTests: 2,
          passed: 1,
          failed: 1,
          skipped: 0,
          passRate: 50,
          failRate: 50,
          skipRate: 0,
          totalDuration: 3500,
          averageDuration: 1750,
        },
      };

      // Wir nutzen direkt die global definierten Mocks
      mockUpdateWithNewTestResult.mockClear();
      mockUpdateWithNewTestResult.mockReturnValue(mockFlakinessReport);

      // Route testen
      const response = await request(app)
        .post("/api/test-metrics/update")
        .send(mockTestResult);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("timestamp");

      // Der Router gibt keinen Flakiness-Report zurück, sondern nur Bestätigungsflags
      expect(response.body).toHaveProperty("flakinessUpdated", true);
      expect(response.body).toHaveProperty("successRatesUpdated", true);

      // Überprüfen, ob die Mock-Funktion mit den richtigen Daten aufgerufen wurde
      expect(mockUpdateWithNewTestResult).toHaveBeenCalledWith(mockTestResult);
    });

    it("sollte einen 400-Fehler zurückgeben, wenn keine Testresultate im Body sind", async () => {
      // Route mit leerem Body testen
      const response = await request(app)
        .post("/api/test-metrics/update")
        .send({});

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});

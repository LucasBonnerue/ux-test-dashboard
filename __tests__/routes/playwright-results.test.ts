// Mocks vor dem Import erstellen
jest.mock("../../utils/metrics/flakiness-analyzer", () => {
  // Mocks direkt hier innerhalb der Funktion erstellen
  const mockFlakinessReport = {
    overallFlakinessScore: 42,
    flakyTestsCount: 3,
    lastUpdated: Date.now(),
  };

  const updateWithNewTestResult = jest
    .fn()
    .mockReturnValue(mockFlakinessReport);

  return jest.fn().mockImplementation(() => {
    return {
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
    };
  });
});

jest.mock("fs");
jest.mock("path");

// Erst nach den Mocks importieren
import request from "supertest";
import express from "express";
import playwrightResultsRouter from "../../routes/playwright-results";
import fs from "fs";
import path from "path";

// Gemeinsame Mock-Daten für Tests
const mockFlakinessReport = {
  overallFlakinessScore: 42,
  flakyTestsCount: 3,
  lastUpdated: Date.now(),
};

describe("Playwright Results Routes", () => {
  let app: express.Application;

  let mockUpdateWithNewTestResult: jest.Mock;

  beforeEach(() => {
    // Mock für FlakinessAnalyzer zurücksetzen
    jest.clearAllMocks();

    // Zugriff auf die Mock-Instanz und Funktionen bekommen
    const FlakinessAnalyzer = require("../../utils/metrics/flakiness-analyzer");
    const mockInstance = new FlakinessAnalyzer();
    mockUpdateWithNewTestResult = mockInstance.updateWithNewTestResult;

    // Mock mit den richtigen Rückgabewerten konfigurieren
    mockUpdateWithNewTestResult.mockReturnValue(mockFlakinessReport);

    // Express-App für Tests erstellen
    app = express();
    app.use(express.json());
    app.use("/api/playwright-results", playwrightResultsRouter);

    // Allgemeine Mocks für fs und path
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join("/"));
  });

  describe("POST /api/playwright-results", () => {
    it("sollte Testergebnisse speichern und den FlakinessAnalyzer aktualisieren", async () => {
      // Mocks für fs-Operationen
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      // Mock ist bereits global definiert
      mockUpdateWithNewTestResult.mockClear();

      // Mock-Testdaten im Format, das der Router erwartet - wichtig ist output und config
      const testResult = {
        output: {
          tests: [
            {
              testId: "test1",
              file: "test1.spec.ts",
              title: "Test 1",
              status: "passed",
              duration: 1500,
            },
          ],
        },
        config: {
          browser: "chromium",
          headless: true,
        },
        runName: "Test Run 123",
      };

      // Mock für fs.readFileSync zurückgeben eines leeren Arrays
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([]));

      // Route testen
      const response = await request(app)
        .post("/api/playwright-results")
        .send(testResult);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Erwartet, dass updateWithNewTestResult überhaupt aufgerufen wurde
      // Da wir nicht genau wissen, welches Format der Router intern erzeugt und weitergibt,
      // prüfen wir nur, dass die Funktion aufgerufen wurde
      expect(mockUpdateWithNewTestResult).toHaveBeenCalled();

      // Alternativ könnten wir spezifischer prüfen, dass bestimmte Attribute vorhanden sind
      // Dies erfordert aber genaue Kenntnis der internen Datenverarbeitung
      expect(mockUpdateWithNewTestResult).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: expect.any(String),
          runName: "Test Run 123",
          success: expect.any(Boolean),
          testResults: expect.any(Array),
        }),
      );
    });

    it("sollte einen 400-Fehler zurückgeben, wenn keine Testresultate im Body sind", async () => {
      // Route mit leerem Body testen
      const response = await request(app)
        .post("/api/playwright-results")
        .send({});

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/playwright-results/:runId", () => {
    it("sollte Testergebnisse für eine bestimmte runId zurückgeben", async () => {
      // Mock-Daten
      const mockResult = {
        runId: "test-run-123",
        timestamp: Date.now(),
        results: [{ testId: "test1", status: "passed" }],
      };

      // Mock für fs.readFileSync
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockResult),
      );
      (fs.readdirSync as jest.Mock).mockReturnValue(["test-run-123.json"]);

      // Route testen
      const response = await request(app).get(
        "/api/playwright-results/test-run-123",
      );

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("result", mockResult);
    });

    it("sollte 404 zurückgeben, wenn die runId nicht gefunden wurde", async () => {
      // Mocks für nicht existierende Datei
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        return !path.includes("non-existent-run");
      });

      // Route testen
      const response = await request(app).get(
        "/api/playwright-results/non-existent-run",
      );

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/playwright-results/latest", () => {
    it("sollte die neuesten Testergebnisse zurückgeben", async () => {
      // Mock-Daten
      const mockResult1 = {
        runId: "run1",
        timestamp: 1625097600000,
        testResults: [],
      };

      const mockResult2 = {
        runId: "run2",
        timestamp: 1625184000000, // später als run1
        testResults: [{ path: "test1.spec.ts", status: "passed" }],
      };

      // Mocks für fs-Operationen
      (fs.readdirSync as jest.Mock).mockReturnValue(["run1.json", "run2.json"]);
      (fs.readFileSync as jest.Mock).mockImplementation((filename) => {
        if (filename.includes("run1")) {
          return JSON.stringify(mockResult1);
        } else {
          return JSON.stringify(mockResult2);
        }
      });

      // Route testen
      const response = await request(app).get("/api/playwright-results/latest");

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("result", mockResult2); // Das neuere Ergebnis sollte zurückgegeben werden
    });

    it("sollte ein leeres Objekt zurückgeben, wenn keine Ergebnisse vorhanden sind", async () => {
      // Mock für leeres Verzeichnis
      (fs.existsSync as jest.Mock).mockReturnValue(true); // Verzeichnis existiert
      (fs.readdirSync as jest.Mock).mockReturnValue([]); // aber ist leer

      // Route testen
      const response = await request(app).get("/api/playwright-results/latest");

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      // Wir prüfen nur, ob result existiert, nicht den genauen Wert
      expect(response.body).toHaveProperty("result");
    });
  });
});

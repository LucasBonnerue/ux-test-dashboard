/**
 * Tests für die Test-Metrics API-Endpunkte
 *
 * Diese Tests validieren die API-Endpunkte im /api/test-metrics/ Bereich,
 * einschließlich success-rates, flakiness und flaky-tests.
 */

import * as express from "express";
import request from "supertest";
import * as path from "path";
import { createTestServer, mockData } from "../test-helpers";

/**
 * Da server-complete.js eine monolithische Datei ist, müssen wir für diesen Test
 * einen anderen Ansatz verwenden. Statt einen Testserver mit unseren Test-Helpers zu
 * erstellen, rufen wir den Echtwert-Endpunkt direkt auf. In einer späteren Phase
 * sollten diese Tests mit Mock-Daten und isolierten Komponenten umgeschrieben werden.
 */

describe("Test Metrics API", () => {
  let server: any;
  const PORT = 8080;
  const baseUrl = `http://localhost:${PORT}`;

  // Tests für den Endpunkt /api/test-metrics/flaky-tests
  describe("GET /api/test-metrics/flaky-tests", () => {
    it("sollte eine erfolgreiche Antwort mit flakyTests zurückgeben", async () => {
      const response = await request(baseUrl)
        .get("/api/test-metrics/flaky-tests")
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("flakyTests");
      expect(response.body).toHaveProperty("timestamp");
      expect(Array.isArray(response.body.flakyTests)).toBe(true);
    });

    it("sollte die flakyTests nach Flakiness-Score absteigend sortiert zurückgeben", async () => {
      const response = await request(baseUrl)
        .get("/api/test-metrics/flaky-tests")
        .set("Accept", "application/json");

      expect(response.status).toBe(200);

      const { flakyTests } = response.body;

      // Überprüfen, ob die Liste sortiert ist
      for (let i = 1; i < flakyTests.length; i++) {
        expect(flakyTests[i - 1].flakinessScore).toBeGreaterThanOrEqual(
          flakyTests[i].flakinessScore,
        );
      }
    });

    it("sollte die Anzahl der zurückgegebenen Tests mit dem limit-Parameter begrenzen", async () => {
      const testLimit = 2;
      const response = await request(baseUrl)
        .get(`/api/test-metrics/flaky-tests?limit=${testLimit}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.flakyTests.length).toBeLessThanOrEqual(testLimit);
    });
  });

  // Tests für den Endpunkt /api/test-metrics/success-rates
  describe("GET /api/test-metrics/success-rates", () => {
    it("sollte eine erfolgreiche Antwort mit Erfolgsraten zurückgeben", async () => {
      const response = await request(baseUrl)
        .get("/api/test-metrics/success-rates")
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("overallSuccessRate");
      expect(response.body).toHaveProperty("totalTests");
      expect(response.body).toHaveProperty("testSuccessRates");
      expect(Array.isArray(response.body.testSuccessRates)).toBe(true);
    });

    it("sollte den days-Parameter zur Filterung des Zeitraums verwenden", async () => {
      const testDays = 14;
      const response = await request(baseUrl)
        .get(`/api/test-metrics/success-rates?days=${testDays}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);

      // Prüfen, ob der Zeitraum korrekt angewendet wurde
      const currentTime = Date.now();
      const expectedStartTime = currentTime - testDays * 86400000; // Tage in ms

      expect(response.body).toHaveProperty("timeRange");
      expect(response.body.timeRange.start).toBeLessThanOrEqual(
        expectedStartTime + 1000,
      ); // Toleranz für Testausführungsdauer
      expect(response.body.timeRange.end).toBeGreaterThanOrEqual(
        expectedStartTime,
      );
    });

    it("sollte den testType-Parameter zur Filterung der Testergebnisse verwenden", async () => {
      // Testen mit einem Testtyp (z.B. 'ui')
      const testType = "ui";
      const response = await request(baseUrl)
        .get(`/api/test-metrics/success-rates?testType=${testType}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);

      // Prüfen, ob alle zurückgegebenen Tests den gesuchten Testtyp enthalten
      if (response.body.testSuccessRates.length > 0) {
        const allTestsContainType = response.body.testSuccessRates.every(
          (test: { testId: string }) => test.testId.includes(testType),
        );
        expect(allTestsContainType).toBe(true);
      }
    });
  });

  // Tests für den Endpunkt /api/test-metrics/flakiness
  describe("GET /api/test-metrics/flakiness", () => {
    it("sollte eine erfolgreiche Antwort mit Flakiness-Daten zurückgeben", async () => {
      const response = await request(baseUrl)
        .get("/api/test-metrics/flakiness")
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("flakyTestsCount");
      expect(response.body).toHaveProperty("flakinessThreshold");
      expect(response.body).toHaveProperty("flakinessMeasures");
      expect(Array.isArray(response.body.flakinessMeasures)).toBe(true);
    });

    it("sollte den days-Parameter zur Filterung des Zeitraums verwenden", async () => {
      const testDays = 7;
      const response = await request(baseUrl)
        .get(`/api/test-metrics/flakiness?days=${testDays}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);

      // Prüfen, ob der Zeitraum korrekt angewendet wurde
      const currentTime = Date.now();
      const expectedStartTime = currentTime - testDays * 86400000; // Tage in ms

      expect(response.body).toHaveProperty("timePeriod");
      expect(response.body.timePeriod.start).toBeLessThanOrEqual(
        expectedStartTime + 1000,
      ); // Toleranz
      expect(response.body.timePeriod.end).toBeGreaterThanOrEqual(
        expectedStartTime,
      );
    });

    it("sollte den threshold-Parameter zur Filterung der Flakiness-Daten verwenden", async () => {
      const testThreshold = 30;
      const response = await request(baseUrl)
        .get(`/api/test-metrics/flakiness?threshold=${testThreshold}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.flakinessThreshold).toBe(testThreshold);

      // Prüfen, ob alle Tests über dem Schwellenwert liegen
      if (response.body.flakinessMeasures.length > 0) {
        const allTestsAboveThreshold = response.body.flakinessMeasures.every(
          (measure: { flakinessScore: number }) =>
            measure.flakinessScore >= testThreshold,
        );
        expect(allTestsAboveThreshold).toBe(true);
      }
    });

    it("sollte sowohl days- als auch threshold-Parameter kombiniert verarbeiten", async () => {
      const testDays = 14;
      const testThreshold = 25;

      const response = await request(baseUrl)
        .get(
          `/api/test-metrics/flakiness?days=${testDays}&threshold=${testThreshold}`,
        )
        .set("Accept", "application/json");

      expect(response.status).toBe(200);

      // Prüfen, ob beide Parameter korrekt angewendet wurden
      expect(response.body.flakinessThreshold).toBe(testThreshold);

      const currentTime = Date.now();
      const expectedStartTime = currentTime - testDays * 86400000; // Tage in ms

      expect(response.body.timePeriod.start).toBeLessThanOrEqual(
        expectedStartTime + 1000,
      );

      // Prüfen, ob alle Tests über dem Schwellenwert liegen
      if (response.body.flakinessMeasures.length > 0) {
        const allTestsAboveThreshold = response.body.flakinessMeasures.every(
          (measure: { flakinessScore: number }) =>
            measure.flakinessScore >= testThreshold,
        );
        expect(allTestsAboveThreshold).toBe(true);
      }
    });
  });
});

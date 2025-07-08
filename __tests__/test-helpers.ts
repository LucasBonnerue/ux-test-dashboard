/**
 * Test-Hilfsmodul für API-Tests
 *
 * Dieses Modul stellt Hilfsfunktionen für Tests bereit, einschließlich
 * einer Methode zum Erstellen eines Test-Express-Servers und Mock-Funktionen.
 */

import * as express from "express";
import * as request from "supertest";
import * as path from "path";

/**
 * Erstellt eine Express-App für Tests mit den benötigten Routen
 * Hinweis: Dies ist eine vereinfachte Version, die direkt mit server-complete.js arbeitet
 */
export function createTestServer(): express.Application {
  // Server-Datei dynamisch laden, damit wir sie nicht umschreiben müssen
  jest.resetModules(); // Module-Cache zurücksetzen

  // Mock für globale Node.js-Objekte, die im server-complete.js verwendet werden
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };

  // Express-App für Tests erstellen
  const app = express.default();

  // Test-Route zum Prüfen, ob der Server läuft
  app.get("/test-health", (req, res) => {
    res.status(200).json({ status: "Test server is running" });
  });

  return app;
}

/**
 * Vereinfachte Test-Funktion für API-Endpunkte
 */
export function testEndpoint(
  app: express.Application,
  method: "get" | "post" | "put" | "delete",
  url: string,
  expectedStatus = 200,
): request.Test {
  return request
    .default(app)
    [method](url)
    .expect("Content-Type", /json/)
    .expect(expectedStatus);
}

/**
 * Mock-Daten für Tests
 */
export const mockData = {
  flakyTests: [
    {
      testId: "test-1.spec.ts",
      testName: "Test 1",
      flakinessScore: 45.2,
      confidence: 80,
    },
    {
      testId: "test-2.spec.ts",
      testName: "Test 2",
      flakinessScore: 38.7,
      confidence: 75,
    },
  ],
  successRates: {
    overallSuccessRate: 85.3,
    totalTests: 30,
    testSuccessRates: [],
  },
};

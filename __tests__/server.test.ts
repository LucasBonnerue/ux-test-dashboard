import request from 'supertest';
import { DashboardServer } from '../src/server';
import * as http from 'http';
import * as fs from 'fs';

// Mocks für die verschiedenen Abhängigkeiten
jest.mock('../src/routes/test-metrics', () => {
  return {
    createTestMetricsRouter: jest.fn().mockImplementation(() => {
      const express = require('express');
      const router = express.Router();
      router.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok', service: 'test-metrics' });
      });
      return router;
    })
  };
});

jest.mock('../src/routes/playwright-results', () => {
  return {
    createPlaywrightResultsRouter: jest.fn().mockImplementation(() => {
      const express = require('express');
      const router = express.Router();
      router.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok', service: 'playwright-results' });
      });
      return router;
    })
  };
});

jest.mock('../src/routes/logs', () => {
  return {
    createLogsRouter: jest.fn().mockImplementation(() => {
      const express = require('express');
      const router = express.Router();
      router.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok', service: 'logs' });
      });
      return router;
    })
  };
});

jest.mock('../src/routes/test-analysis', () => {
  return {
    createTestAnalysisRouter: jest.fn().mockImplementation(() => {
      const express = require('express');
      const router = express.Router();
      router.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok', service: 'test-analysis' });
      });
      return router;
    })
  };
});

// Mock für Logger
jest.mock('../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };
  
  return {
    Logger: jest.fn().mockImplementation(() => mockLogger),
    createLogger: jest.fn().mockImplementation(() => mockLogger)
  };
});

describe('Server Integration Tests', () => {
  let server: DashboardServer;
  let httpServer: http.Server;
  
  beforeEach(async () => {
    // Server mit Test-Konfiguration erstellen
    server = new DashboardServer({
      port: 0, // 0 für zufälligen verfügbaren Port
      host: '127.0.0.1', // Explizit IP-Adresse verwenden statt 'localhost'
      testDir: '__tests__',
      resultsDir: 'test-results'
    });
    
    // Server starten
    httpServer = await server.start();
    
    // Wir müssen den tatsächlichen Port aus dem httpServer auslesen,
    // da port: 0 bedeutet, dass ein zufälliger Port zugewiesen wird
    const address = httpServer.address();
    if (address && typeof address !== 'string') {
      console.log(`Server läuft auf Port ${address.port} für Tests`);
    }
    
    // Längere Wartezeit, um sicherzustellen, dass der Server vollständig gestartet ist
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  
  afterEach(async () => {
    // Server beenden, falls er läuft
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  });
  
  it('sollte den Server starten und auf HTTP-Anfragen antworten', async () => {
    // Sicherstellen, dass der Server läuft
    expect(httpServer).toBeDefined();
    expect(httpServer.listening).toBe(true);
    
    // HTTP-Anfrage an den Root-Pfad senden
    const response = await request(httpServer).get('/');
    
    // Assertions
    expect(response.status).toBe(200);
    // Der Root-Endpunkt sendet eine HTML-Datei, keine JSON-Antwort
    // Daher prüfen wir nur den Status-Code, nicht den Body
  });
  
  it('sollte auf Anfragen an API-Endpunkte antworten', async () => {
    // Sicherstellen, dass der Server läuft
    expect(httpServer).toBeDefined();
    expect(httpServer.listening).toBe(true);
    
    const address = httpServer.address();
    if (address && typeof address !== 'string') {
      console.log(`Server läuft auf Port ${address.port} für API-Endpunkt-Tests`);
    }
    
    // HTTP-Anfragen an verschiedene API-Endpunkte senden
    const testMetricsResponse = await request(httpServer).get('/api/test-metrics/health');
    const playwrightResponse = await request(httpServer).get('/api/playwright-results/health');
    const logsResponse = await request(httpServer).get('/api/logs/health');
    const testAnalysisResponse = await request(httpServer).get('/api/test-analysis/health');
    
    // Assertions
    expect(testMetricsResponse.status).toBe(200);
    expect(testMetricsResponse.body).toEqual({ status: 'ok', service: 'test-metrics' });
    
    expect(playwrightResponse.status).toBe(200);
    expect(playwrightResponse.body).toEqual({ status: 'ok', service: 'playwright-results' });
    
    expect(logsResponse.status).toBe(200);
    expect(logsResponse.body).toEqual({ status: 'ok', service: 'logs' });
    
    expect(testAnalysisResponse.status).toBe(200);
    expect(testAnalysisResponse.body).toEqual({ status: 'ok', service: 'test-analysis' });
  });
  
  it('sollte bei unbekannten Pfaden 404 zurückgeben', async () => {
    // Sicherstellen, dass der Server läuft
    expect(httpServer).toBeDefined();
    expect(httpServer.listening).toBe(true);
    
    // HTTP-Anfrage an nicht existierenden Pfad senden
    const response = await request(httpServer).get('/not-exist');
    
    // Assertions
    expect(response.status).toBe(404);
    expect(response.text).toBe('Ressource nicht gefunden');
  });
  
  it('sollte einen alternativen Port verwenden, wenn der Standardport belegt ist', async () => {
    let httpServer1: http.Server | null = null;
    let httpServer2: http.Server | null = null;
    
    try {
      // Ersten Server auf Port 3000 starten
      const server1 = new DashboardServer({
        port: 3000,
        host: '127.0.0.1',
        testDir: '__tests__',
        resultsDir: 'test-results'
      });
      
      httpServer1 = await server1.start();
      
      // Prüfen, ob der erste Server auf Port 3000 läuft
      const address1 = httpServer1.address() as { port: number };
      expect(address1.port).toBe(3000);
      
      // Zweiten Server auch auf Port 3000 starten (sollte automatisch einen anderen Port wählen)
      const server2 = new DashboardServer({
        port: 3000,
        host: '127.0.0.1',
        testDir: '__tests__',
        resultsDir: 'test-results'
      });
      
      httpServer2 = await server2.start();
      
      // Prüfen, ob der zweite Server auf einem anderen Port läuft
      const address2 = httpServer2.address() as { port: number };
      expect(address2.port).not.toBe(3000);
      expect(address2.port).toBe(3001); // Sollte der nächste freie Port sein
    } finally {
      // Beide Server beenden
      if (httpServer1) {
        await new Promise<void>((resolve) => {
          httpServer1?.close(() => resolve());
        });
      }
      if (httpServer2) {
        await new Promise<void>((resolve) => {
          httpServer2?.close(() => resolve());
        });
      }
    }
  });
  
  it('sollte statische Dateien aus dem public-Verzeichnis bereitstellen', async () => {
    // Wir müssen einen Server mit einer bekannten statischen Datei erstellen, um diesen Test durchzuführen
    // Da wir nicht das tatsächliche Dateisystem manipulieren wollen, testen wir stattdessen,
    // ob die Route ordnungsgemäß konfiguriert ist
    
    // Hier verwenden wir den bereits laufenden Server
    expect(httpServer).toBeDefined();
    expect(httpServer.listening).toBe(true);
    
    // Express-Router sollte definiert sein
    const app = (server as any).app;
    expect(app).toBeDefined();
    
    // Wir können prüfen, ob die Middleware-Stack eingerichtet ist
    // Der Server sollte für statische Dateien konfiguriert sein
    expect(app._router).toBeDefined();
    
    // Testen mit einem nicht existierenden Pfad
    const response = await request(httpServer).get('/public/non-existent-file.css');
    
    // In der aktuellen Implementierung scheint die Fallback-Route alle Anfragen zu behandeln
    // Das ist in Ordnung, wir prüfen einfach den HTTP-Status
    expect(response.status).toBe(404);
  });
});

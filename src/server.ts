/**
 * Evolution Hub UX-Test-Dashboard - TypeScript-Serverimplementierung
 *
 * Server-Implementation mit modularer Struktur und TypeScript-Typsicherheit
 * Teil der inkrementellen Migration von JS zu TS
 */

import express from "express";
import * as path from "path";
import { createServer } from "http";
import { Logger, createLogger } from "./utils/logger";
import { createTestMetricsRouter } from "./routes/test-metrics";
import { createPlaywrightResultsRouter } from "./routes/playwright-results";
import { createLogsRouter } from "./routes/logs";
import { createTestAnalysisRouter } from "./routes/test-analysis";

// Server-Konfiguration
interface ServerConfig {
  port: number;
  host: string;
  testDir?: string;
  resultsDir?: string;
}

// Server-Klasse
export class DashboardServer {
  private app: express.Application;
  private config: ServerConfig;
  private logger: Logger;
  private logFile: string;

  constructor(config: ServerConfig) {
    this.config = config;
    this.app = express();

    // Logger initialisieren
    this.logger = createLogger(__dirname);
    this.logFile = path.join(
      __dirname,
      "logs",
      `dashboard-${new Date().toISOString().split("T")[0]}.log`,
    );

    // Server konfigurieren
    this.configureServer();
  }

  private configureServer(): void {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, "../public")));

    // API-Routen
    this.app.use("/api/test-metrics", createTestMetricsRouter(this.logger));
    this.app.use(
      "/api/playwright-results",
      createPlaywrightResultsRouter(this.logger),
    );
    this.app.use("/api/logs", createLogsRouter(this.logger, this.logFile));

    // Test-Analyse-Route
    const testDir = this.config.testDir || path.join(__dirname, "../__tests__");
    const resultsDir =
      this.config.resultsDir || path.join(__dirname, "../test-results");
    this.app.use(
      "/api/test-analysis",
      createTestAnalysisRouter(this.logger, {
        testDir,
        resultsDir,
      }),
    );

    // HTML-Seite bereitstellen
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../index.html"));
    });

    // Fallback-Route für nicht gefundene Ressourcen
    this.app.use((req, res) => {
      res.status(404).send("Ressource nicht gefunden");
    });

    // Fehlerbehandlung
    this.app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        this.logger.error("Server", `Unbehandelter Fehler: ${err.message}`);
        res.status(500).send("Interner Serverfehler");
      },
    );
  }

  /**
   * Startet den Server und gibt den HTTP-Server-Handle zurück
   * @returns HTTP-Server-Instanz
   */
  public start(): Promise<http.Server> {
    const { port, host } = this.config;
    return this.startServer(port);
  }

  /**
   * Startet den Server auf dem angegebenen Port
   * @param port Port, auf dem der Server gestartet werden soll
   * @returns Promise mit dem HTTP-Server
   */
  private startServer(port: number): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      const server = createServer(this.app);
      const { host } = this.config;

      server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          this.logger.warn(
            "Server",
            `Port ${port} bereits in Verwendung, versuche Port ${port + 1}`,
          );
          this.startServer(port + 1).then(resolve).catch(reject);
        } else {
          this.logger.error(
            "Server",
            `Fehler beim Starten des Servers: ${error.message}`,
          );
          reject(error);
        }
      });

      server.listen(port, host, () => {
        this.logger.info("Server", `Server läuft auf http://${host}:${port}`);
        this.logger.info(
          "Server",
          `Dashboard verfügbar unter http://${host}:${port}`,
        );
        resolve(server);
      });  
    });
  }
}

// Server-Instanz erstellen und starten
if (require.main === module) {
  const PORT = parseInt(process.env.PORT || "8080");
  const HOST = "127.0.0.1";
  const TEST_DIR = process.env.TEST_DIR || path.join(__dirname, "../__tests__");
  const RESULTS_DIR =
    process.env.RESULTS_DIR || path.join(__dirname, "../test-results");

  const server = new DashboardServer({
    port: PORT,
    host: HOST,
    testDir: TEST_DIR,
    resultsDir: RESULTS_DIR,
  });

  // Server asynchron starten
  server.start()
    .then(() => {
      // Server wurde erfolgreich gestartet
    })
    .catch(err => {
      console.error("Fehler beim Starten des Servers:", err);
      process.exit(1);
    });
}

export default DashboardServer;

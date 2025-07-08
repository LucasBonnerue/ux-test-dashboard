/**
 * API-Routen für Log-Verwaltung
 * TypeScript-Migration des UX-Test-Dashboards
 */

import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { Logger, LogEntry } from "../utils/logger";

// Router erstellen
export function createLogsRouter(logger: Logger, logFilePath: string): Router {
  const router = Router();

  // GET-Route für Log-Abruf
  router.get("/", (req: Request, res: Response) => {
    logger.info("API", "GET /api/logs aufgerufen");

    try {
      const search = (req.query.search as string) || "";
      const component = req.query.component as string;

      // Logs aus Datei lesen
      const logs: LogEntry[] = [];
      const components = new Set<string>();

      if (fs.existsSync(logFilePath)) {
        const content = fs.readFileSync(logFilePath, "utf-8");
        const lines = content.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          // Vereinfachtes Log-Parsing
          const match = line.match(/\[(.+?)\]\s*\[(.+?)\]\s*\[(.+?)\]\s*(.+)/);

          if (match) {
            const [, timestamp, level, comp, message] = match;

            const logEntry: LogEntry = {
              timestamp,
              level: level as LogEntry["level"],
              component: comp,
              message,
              raw: line,
            };

            // Komponenten für Filter sammeln
            components.add(comp);
            logs.push(logEntry);
          } else {
            // Für nicht parsbare Zeilen
            logs.push({
              timestamp: new Date().toISOString(),
              level: "INFO",
              component: "Unknown",
              message: line.trim(),
              raw: line,
            });
          }
        }

        // Filtern nach Suchbegriff
        let filteredLogs = [...logs];

        if (search) {
          filteredLogs = filteredLogs.filter(
            (log) =>
              log.message.toLowerCase().includes(search.toLowerCase()) ||
              log.component.toLowerCase().includes(search.toLowerCase()),
          );
        }

        // Filtern nach Komponente
        if (component && component !== "all") {
          filteredLogs = filteredLogs.filter(
            (log) => log.component === component,
          );
        }

        res.json({
          logs: filteredLogs.reverse(), // Neueste zuerst
          count: filteredLogs.length,
          components: Array.from(components),
        });
      } else {
        res.json({
          logs: [],
          count: 0,
          components: [],
        });
      }
    } catch (error) {
      logger.error(
        "API",
        `Fehler beim Abrufen der Logs: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({
        error: `Fehler beim Abrufen der Logs: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  // DELETE-Route für Log-Löschen
  router.delete("/", (req: Request, res: Response) => {
    logger.info("API", "DELETE /api/logs aufgerufen");

    try {
      // Backup erstellen
      const logDir = path.dirname(logFilePath);
      const backupFile = path.join(logDir, `backup-${Date.now()}.log`);

      if (fs.existsSync(logFilePath)) {
        fs.copyFileSync(logFilePath, backupFile);
        fs.writeFileSync(logFilePath, ""); // Leeren der Log-Datei

        logger.info("API", `Log-Datei geleert, Backup erstellt: ${backupFile}`);

        res.json({
          success: true,
          message: "Logs erfolgreich gelöscht",
          backupFile,
        });
      } else {
        res.json({
          success: false,
          message: "Keine Log-Datei zum Löschen gefunden",
        });
      }
    } catch (error) {
      logger.error(
        "API",
        `Fehler beim Löschen der Logs: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({
        error: `Fehler beim Löschen der Logs: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  return router;
}

export default createLogsRouter;

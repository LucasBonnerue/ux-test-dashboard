/**
 * API-Routen für Logger-Zugriff
 *
 * Diese Routen ermöglichen den Zugriff auf die Logs des Systems,
 * einschließlich Filterung, Paginierung und Komponenten-basierte Filterung.
 */

import express, { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import {
  LogLevel,
  configureLogger,
  createComponentLogger,
} from "../utils/logger";

const router: Router = express.Router();
const logger = createComponentLogger("LogsAPI");

/**
 * Typdefinitionen für Request-Parameter
 */
interface LogQueryParams {
  level?: string;
  component?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface LogEntry {
  timestamp: string;
  level: string;
  component?: string;
  message: string;
  raw: string;
}

// Standard-Logdatei-Pfad
const defaultLogDir = path.join(__dirname, "..", "logs");

/**
 * GET /api/logs
 * Logs abrufen mit optionaler Filterung und Paginierung
 */
router.get("/", function getLogs(req: Request, res: Response) {
  const query = req.query as unknown as LogQueryParams;

  logger.info("Logs abgerufen", { query });

  try {
    // Heutiges Datum für die Logdatei ermitteln
    const today = new Date().toISOString().split("T")[0];
    const logFilePath = path.join(defaultLogDir, `log_${today}.log`);

    if (!fs.existsSync(logFilePath)) {
      return res.json({
        logs: [],
        count: 0,
        components: [],
        message: "Keine Logs für heute gefunden",
      });
    }

    // Log-Datei einlesen
    const logContent = fs.readFileSync(logFilePath, "utf-8");
    const logLines = logContent
      .split("\n")
      .filter((line) => line.trim() !== "");

    // Logs parsen
    const logs: LogEntry[] = [];
    const componentsSet = new Set<string>();

    logLines.forEach((line) => {
      try {
        // Log-Format: [TIME] [LEVEL] [Optional: [Component]] Message
        const timestampMatch = line.match(/\[(.*?)\]/);
        if (!timestampMatch) return;

        const timestamp = timestampMatch[1];
        const restOfLine = line.substring(timestampMatch[0].length).trim();

        const levelMatch = restOfLine.match(
          /\[(DEBUG|INFO|WARN|WARNING|ERROR)\]/i,
        );
        if (!levelMatch) return;

        const level = levelMatch[1].toUpperCase();
        const afterLevel = restOfLine.substring(levelMatch[0].length).trim();

        // Prüfen, ob eine Komponente vorhanden ist
        let component = "";
        let message = afterLevel;

        const componentMatch = afterLevel.match(/\[(.*?)\]/);
        if (componentMatch) {
          component = componentMatch[1];
          // Überprüfen, ob es sich um eine Komponente handelt (component:XYZ Format)
          if (component.startsWith("component:")) {
            component = component.substring(10); // Länge von "component:"
            message = afterLevel.substring(componentMatch[0].length).trim();
            componentsSet.add(component);
          }
        }

        // Log-Eintrag erstellen
        const logEntry: LogEntry = {
          timestamp,
          level,
          message,
          raw: line,
        };

        if (component) {
          logEntry.component = component;
        }

        // Auf Level-Filter prüfen
        if (query.level && level.toLowerCase() !== query.level.toLowerCase()) {
          return;
        }

        // Auf Komponenten-Filter prüfen
        if (query.component && query.component !== "all") {
          if (!component || component !== query.component) {
            return;
          }
        }

        // Auf Suchbegriff prüfen
        if (
          query.search &&
          !line.toLowerCase().includes(query.search.toLowerCase())
        ) {
          return;
        }

        logs.push(logEntry);
      } catch (e) {
        // Fehlerhafte Log-Zeilen überspringen
        console.error("Fehler beim Parsen der Log-Zeile:", e);
      }
    });

    // Umgekehrte Reihenfolge: neueste zuerst
    logs.reverse();

    // Paginierung anwenden
    const limit = query.limit || logs.length;
    const offset = query.offset || 0;
    const paginatedLogs = logs.slice(offset, offset + limit);

    // Alle gefundenen Komponenten
    const components = Array.from(componentsSet).sort();

    return res.json({
      logs: paginatedLogs,
      count: logs.length,
      components,
      message: "Logs erfolgreich geladen",
    });
  } catch (error: any) {
    logger.error("Fehler beim Abrufen der Logs", error);
    return res.status(500).json({
      error: "Fehler beim Abrufen der Logs",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/logs
 * Leert die aktuelle Logdatei (nur für Testzwecke)
 */
router.delete("/", function clearLogs(req: Request, res: Response) {
  logger.warn("Log-Löschung angefordert");

  try {
    // Heutiges Datum für die Logdatei ermitteln
    const today = new Date().toISOString().split("T")[0];
    const logFilePath = path.join(defaultLogDir, `log_${today}.log`);

    if (!fs.existsSync(logFilePath)) {
      return res.status(404).json({
        message: "Keine Logs für heute gefunden",
      });
    }

    // Backup der Logs erstellen
    const backupPath = path.join(
      defaultLogDir,
      `log_${today}_${Date.now()}.backup`,
    );
    fs.copyFileSync(logFilePath, backupPath);

    // Log-Datei leeren
    fs.writeFileSync(logFilePath, "", "utf-8");

    logger.info("Logs wurden geleert, Backup erstellt unter", backupPath);
    return res.json({
      message: "Logs erfolgreich geleert",
      backupPath,
    });
  } catch (error: any) {
    logger.error("Fehler beim Leeren der Logs", error);
    return res.status(500).json({
      error: "Fehler beim Leeren der Logs",
      message: error.message,
    });
  }
});

export default router;

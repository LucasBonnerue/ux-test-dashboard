/**
 * Logger-Funktionalität für das UX-Test-Dashboard
 * Unterstützt verschiedene Log-Level und Komponenten
 */

import * as fs from "fs";
import * as path from "path";

// Log-Level Typen
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

// Log-Eintrag Interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  raw?: string;
}

// Logger-Konfiguration
export interface LoggerConfig {
  logDir: string;
  logFile: string;
  logToConsole?: boolean;
}

// Logger-Klasse
export class Logger {
  private logDir: string;
  private logFile: string;
  private logToConsole: boolean;

  constructor(config: LoggerConfig) {
    this.logDir = config.logDir;
    this.logFile = config.logFile;
    this.logToConsole =
      config.logToConsole !== undefined ? config.logToConsole : true;

    // Stelle sicher, dass das Log-Verzeichnis existiert
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Schreibt eine Nachricht in die Log-Datei
   * @param level Log-Level (DEBUG, INFO, WARN, ERROR)
   * @param component Komponentenname (z.B. "API", "Server", etc.)
   * @param message Die zu protokollierende Nachricht
   */
  logMessage(level: LogLevel, component: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] [${component}] ${message}`;

    if (this.logToConsole) {
      console.log(logLine);
    }

    try {
      fs.appendFileSync(this.logFile, logLine + "\n");
    } catch (error) {
      console.error(
        `Fehler beim Schreiben des Logs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Convenience-Methoden für verschiedene Log-Level
  debug(component: string, message: string): void {
    this.logMessage("DEBUG", component, message);
  }

  info(component: string, message: string): void {
    this.logMessage("INFO", component, message);
  }

  warn(component: string, message: string): void {
    this.logMessage("WARN", component, message);
  }

  error(component: string, message: string): void {
    this.logMessage("ERROR", component, message);
  }

  /**
   * Erstellt einen Standard-Logger mit Datum im Dateinamen
   * @param baseDir Basis-Verzeichnis für Log-Dateien
   * @returns Eine neue Logger-Instanz
   */
  static createDefaultLogger(baseDir: string): Logger {
    const logDir = path.join(baseDir, "logs");
    const logFile = path.join(
      logDir,
      `dashboard-${new Date().toISOString().split("T")[0]}.log`,
    );

    return new Logger({
      logDir,
      logFile,
      logToConsole: true,
    });
  }
}

// Exportiere eine Singleton-Instanz für einfache Verwendung
export const createLogger = (baseDir: string): Logger => {
  return Logger.createDefaultLogger(baseDir);
};

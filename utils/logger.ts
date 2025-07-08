/**
 * Logger-Utility für das UX-Test-Dashboard
 *
 * Bietet konsistentes Logging mit verschiedenen Log-Levels,
 * Formatierungsoptionen und Ausgabemöglichkeiten.
 */

// Log Level Definitionen
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  NONE = 100, // Deaktiviert alle Logs
}

// Konfigurationsoptionen für den Logger
export interface LoggerConfig {
  level: LogLevel;
  includeTimestamp: boolean;
  useColors: boolean;
  outputToFile: boolean;
  logFilePath?: string;
  component?: string;
}

// Standard-Konfiguration
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  includeTimestamp: true,
  useColors: true,
  outputToFile: false,
};

// Globale Logger-Konfiguration
let globalConfig: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Setzt die globale Logger-Konfiguration
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Formatiert eine Log-Nachricht entsprechend der Konfiguration
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  component?: string,
): string {
  const timestamp = globalConfig.includeTimestamp
    ? `[${new Date().toISOString()}] `
    : "";
  const componentStr =
    component || globalConfig.component
      ? `[${component || globalConfig.component}] `
      : "";

  let prefix = "";

  if (globalConfig.useColors) {
    // ANSI-Farbcodes für Terminal-Ausgabe
    switch (level) {
      case LogLevel.DEBUG:
        prefix = "\x1b[36m[DEBUG]\x1b[0m "; // Cyan
        break;
      case LogLevel.INFO:
        prefix = "\x1b[32m[INFO]\x1b[0m "; // Grün
        break;
      case LogLevel.WARNING:
        prefix = "\x1b[33m[WARN]\x1b[0m "; // Gelb
        break;
      case LogLevel.ERROR:
        prefix = "\x1b[31m[ERROR]\x1b[0m "; // Rot
        break;
    }
  } else {
    switch (level) {
      case LogLevel.DEBUG:
        prefix = "[DEBUG] ";
        break;
      case LogLevel.INFO:
        prefix = "[INFO] ";
        break;
      case LogLevel.WARNING:
        prefix = "[WARN] ";
        break;
      case LogLevel.ERROR:
        prefix = "[ERROR] ";
        break;
    }
  }

  return `${timestamp}${prefix}${componentStr}${message}`;
}

/**
 * Basislog-Funktion
 */
function log(level: LogLevel, message: string, ...args: any[]): void {
  if (level < globalConfig.level) return;

  let component: string | undefined;

  // Optionaler Komponentenname als erstes Argument
  if (
    args.length > 0 &&
    typeof args[0] === "string" &&
    args[0].startsWith("component:")
  ) {
    component = args[0].substring(10);
    args = args.slice(1);
  }

  // Nachricht formatieren
  let formattedMessage = message;

  // Argumente in die Nachricht einfügen (wie console.log)
  if (args.length > 0) {
    args.forEach((arg) => {
      if (typeof arg === "object") {
        try {
          const stringifiedArg = JSON.stringify(arg);
          formattedMessage += ` ${stringifiedArg}`;
        } catch (error) {
          formattedMessage += " [Nicht serialisierbares Objekt]";
        }
      } else {
        formattedMessage += ` ${arg}`;
      }
    });
  }

  const finalMessage = formatLogMessage(level, formattedMessage, component);

  // Log ausgeben
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(finalMessage);
      break;
    case LogLevel.INFO:
      console.info(finalMessage);
      break;
    case LogLevel.WARNING:
      console.warn(finalMessage);
      break;
    case LogLevel.ERROR:
      console.error(finalMessage);
      break;
  }

  // Optional in Datei loggen
  if (globalConfig.outputToFile && globalConfig.logFilePath) {
    try {
      const fs = require("fs");
      fs.appendFileSync(globalConfig.logFilePath, `${finalMessage}\n`, {
        encoding: "utf8",
      });
    } catch (error) {
      console.error(`Fehler beim Loggen in Datei: ${error}`);
    }
  }
}

/**
 * Loggt eine Debug-Nachricht
 */
export function logDebug(message: string, ...args: any[]): void {
  log(LogLevel.DEBUG, message, ...args);
}

/**
 * Loggt eine Info-Nachricht
 */
export function logInfo(message: string, ...args: any[]): void {
  log(LogLevel.INFO, message, ...args);
}

/**
 * Loggt eine Warnmeldung
 */
export function logWarning(message: string, ...args: any[]): void {
  log(LogLevel.WARNING, message, ...args);
}

/**
 * Loggt eine Fehlermeldung
 */
export function logError(message: string, ...args: any[]): void {
  log(LogLevel.ERROR, message, ...args);
}

/**
 * Erstellt einen Logger für eine spezifische Komponente
 */
export function createComponentLogger(componentName: string) {
  return {
    debug: (message: string, ...args: any[]) =>
      logDebug(message, `component:${componentName}`, ...args),
    info: (message: string, ...args: any[]) =>
      logInfo(message, `component:${componentName}`, ...args),
    warn: (message: string, ...args: any[]) =>
      logWarning(message, `component:${componentName}`, ...args),
    error: (message: string, ...args: any[]) =>
      logError(message, `component:${componentName}`, ...args),
  };
}

// Standard-Export-Funktionen
export default {
  configure: configureLogger,
  debug: logDebug,
  info: logInfo,
  warn: logWarning,
  error: logError,
  createComponentLogger,
};

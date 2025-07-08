/**
 * Evolution Hub UX-Test-Dashboard - Server TypeScript Wrapper
 *
 * Dies ist ein TypeScript-Wrapper für die server-complete.js Implementierung
 * als erster Schritt der inkrementellen Migration zu TypeScript.
 */

import { createServer, IncomingMessage, ServerResponse } from "http";

// Importieren des bestehenden JavaScript-Servers
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serverComplete = require("./server-complete.js");

// Typ-Definitionen für den Server
interface ServerApp {
  // Express-App erweitert einen Request-Handler
  (req: IncomingMessage, res: ServerResponse): void;
  listen: (port: number, hostname: string, callback?: () => void) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  use: (middleware: any) => void;
  get: (path: string, handler: (req: any, res: any) => void) => void;
  post: (path: string, handler: (req: any, res: any) => void) => void;
  put: (path: string, handler: (req: any, res: any) => void) => void;
  delete: (path: string, handler: (req: any, res: any) => void) => void;
}

// Server-Instanz und Konfiguration extrahieren
const app: ServerApp = serverComplete.app;
const HOST = "127.0.0.1";
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

/**
 * Startet den Server mit automatischer Portsuche
 * @param port - Der zu verwendende Port
 */
function startServer(port: number): void {
  // Expliziter TypeScript-Cast, da wir wissen, dass die Express-App ein valider RequestListener ist
  const server = createServer(app);

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.warn(
        `Port ${port} bereits in Verwendung, versuche Port ${port + 1}`,
      );
      startServer(port + 1);
    } else {
      console.error(`Fehler beim Starten des Servers: ${error.message}`);
    }
  });

  server.listen(port, HOST, () => {
    console.log(`Server läuft auf http://${HOST}:${port}`);
    console.log(`Dashboard verfügbar unter http://${HOST}:${port}`);
  });
}

// Server starten
console.info("Evolution Hub UX-Test-Dashboard Server wird gestartet...");
startServer(PORT);

// Für Tests exportieren
export { app };

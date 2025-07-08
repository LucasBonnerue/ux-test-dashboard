import fs from "fs";
import path from "path";
import { glob } from "glob";
import { exec, spawn } from "child_process";
import logger, { createComponentLogger } from "./logger";

// Komponenten-spezifischer Logger
const log = createComponentLogger("TestRunner");

/**
 * TestRunner-Klasse zur Ausführung von Playwright-Tests
 */
export class TestRunner {
  private activeProcess: any = null;

  /**
   * Listet alle verfügbaren Playwright-Tests auf
   * @returns Liste der verfügbaren Tests
   */
  public async listAvailableTests(): Promise<
    Array<{ file: string; path: string; description: string }>
  > {
    try {
      const testsDir = path.join(__dirname, "../../");

      // Alle .spec.ts Dateien mit Promise-basierter API finden
      const files = await glob("**/*.spec.ts", { cwd: testsDir });

      log.info(`${files.length} Testdateien gefunden`);

      // Test-Metadaten sammeln
      const tests = files.map((file: string) => {
        const filePath = path.join(testsDir, file);
        let description = "";

        // Versuche, Beschreibung aus der Datei zu extrahieren
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const testMatch = content.match(/test\(['"](.+?)['"]/);
          if (testMatch && testMatch[1]) {
            description = testMatch[1];
          }
        } catch (error) {
          log.warn(`Fehler beim Lesen der Testdatei ${file}:`, error);
        }

        return {
          path: filePath,
          file,
          description,
        };
      });

      log.debug("Tests mit Metadaten aufbereitet:", tests.length);
      return tests;
    } catch (error) {
      log.error("Fehler beim Auflisten der Tests:", error);
      throw error;
    }
  }

  /**
   * Führt einen einzelnen Test aus
   * @param testFile Pfad zur Testdatei
   * @param options Konfigurationsoptionen
   * @param logCallback Callback-Funktion für Log-Einträge
   * @returns Promise mit dem Testergebnis
   */
  public async runTest(
    testFile: string,
    options: any,
    logCallback: (log: string) => void,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const browser = options.browser || "chromium";
      const headless = options.headless !== false;

      log.info(`Starte Test: ${path.basename(testFile)}`, {
        browser,
        headless,
        options,
      });

      const args = [
        "test",
        testFile,
        "--browser",
        browser,
        headless ? "--headless" : "--headed",
        "--reporter",
        "json",
      ];

      if (options.timeout) {
        args.push("--timeout", options.timeout.toString());
      }

      const resultDir = path.join(
        __dirname,
        "../results",
        options.runId || Date.now().toString(),
      );
      fs.mkdirSync(resultDir, { recursive: true });

      const resultFile = path.join(
        resultDir,
        `${path.basename(testFile)}.json`,
      );
      args.push("--reporter-output", resultFile);

      logCallback(
        `Starte Test: ${path.basename(testFile)} mit Browser ${browser} (${headless ? "headless" : "headed"})`,
      );

      const npxPath = process.platform === "win32" ? "npx.cmd" : "npx";
      this.activeProcess = spawn(npxPath, ["playwright", ...args], {
        cwd: path.join(__dirname, "../../"),
      });

      let output = "";
      let errorOutput = "";

      this.activeProcess.stdout.on("data", (data: Buffer) => {
        const dataStr = data.toString();
        output += dataStr;
        logCallback(dataStr);
      });

      this.activeProcess.stderr.on("data", (data: Buffer) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        logCallback(`ERROR: ${dataStr}`);
        log.warn("Stderr vom Test-Prozess:", dataStr);
      });

      this.activeProcess.on("close", (code: number) => {
        const duration = Date.now() - startTime;
        logCallback(
          `Test abgeschlossen mit Code: ${code}, Dauer: ${duration}ms`,
        );

        if (code !== 0) {
          log.error(`Test fehlgeschlagen mit Code ${code}`, {
            testFile: path.basename(testFile),
            duration,
          });

          // Ergebnis speichern
          try {
            const errorResult = {
              testFile: path.basename(testFile),
              browser,
              duration,
              success: false,
              errorMessage: errorOutput || `Process exited with code ${code}`,
            };

            fs.writeFileSync(resultFile, JSON.stringify(errorResult, null, 2));
          } catch (writeErr) {
            log.error("Fehler beim Speichern des Testergebnisses:", writeErr);
          }

          resolve({
            success: false,
            errorMessage: errorOutput || `Process exited with code ${code}`,
          });
        } else {
          log.info(`Test erfolgreich mit Dauer ${duration}ms`, {
            testFile: path.basename(testFile),
          });

          // Versuchen, die Ergebnisdatei zu lesen
          try {
            if (fs.existsSync(resultFile)) {
              const resultContent = fs.readFileSync(resultFile, "utf-8");
              const result = JSON.parse(resultContent);

              // Füge zusätzliche Informationen hinzu
              result.testFile = path.basename(testFile);
              result.browser = browser;
              result.duration = duration;
              result.success = true;

              fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
              resolve({ success: true, ...result });
            } else {
              const successResult = {
                testFile: path.basename(testFile),
                browser,
                duration,
                success: true,
              };

              fs.writeFileSync(
                resultFile,
                JSON.stringify(successResult, null, 2),
              );
              resolve({ success: true });
            }
          } catch (readErr) {
            log.error("Fehler beim Lesen des Testergebnisses:", readErr);
            resolve({
              success: true,
              testFile: path.basename(testFile),
              browser,
              duration,
            });
          }
        }

        this.activeProcess = null;
      });

      this.activeProcess.on("error", (err: Error) => {
        log.error("Fehler beim Ausführen des Tests:", err);
        reject(err);
        this.activeProcess = null;
      });
    });
  }

  /**
   * Führt mehrere Tests aus
   * @param testFiles Liste der Testdateien
   * @param options Konfigurationsoptionen
   * @param logCallback Callback-Funktion für Log-Einträge
   * @param progressCallback Callback-Funktion für Fortschrittsinformationen
   * @returns Promise mit den Testergebnissen
   */
  public async runTests(
    testFiles: string[],
    options: any,
    logCallback: (log: string) => void,
    progressCallback: (progress: any) => void,
  ): Promise<any> {
    log.info(
      `Starte Ausführung von ${testFiles.length} Tests mit Konfiguration:`,
      options,
    );

    const results = {
      total: testFiles.length,
      completed: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    // Fortschritt initial melden
    progressCallback({ ...results });

    for (const testFile of testFiles) {
      try {
        logCallback(`Test starten: ${path.basename(testFile)}`);

        // Wähle einen Browser aus der Liste
        const browsers = options.browsers || ["chromium"];

        for (const browser of browsers) {
          const testOptions = {
            ...options,
            browser,
            runId: options.runId,
          };

          const result = await this.runTest(testFile, testOptions, logCallback);

          results.completed++;

          if (result.success) {
            results.passed++;
            log.debug(
              `Test bestanden: ${path.basename(testFile)} (Browser: ${browser})`,
            );
          } else {
            results.failed++;
            log.warn(
              `Test fehlgeschlagen: ${path.basename(testFile)} (Browser: ${browser})`,
              {
                errorMessage: result.errorMessage,
              },
            );
          }

          // Fortschritt melden
          progressCallback({ ...results });
        }
      } catch (error: any) {
        log.error(`Fehler beim Ausführen von ${testFile}:`, error);
        results.completed++;
        results.failed++;

        // Fortschritt melden
        progressCallback({ ...results });
      }
    }

    log.info("Testausführung abgeschlossen", results);
    return results;
  }

  /**
   * Stoppt alle laufenden Tests
   */
  public async stopTests(): Promise<void> {
    if (this.activeProcess) {
      log.info("Stoppe aktive Testausführung");

      // Unter Windows
      if (process.platform === "win32") {
        return new Promise<void>((resolve) => {
          exec(`taskkill /pid ${this.activeProcess.pid} /T /F`, (error) => {
            if (error) {
              log.error("Fehler beim Stoppen des Prozesses:", error);
            }
            this.activeProcess = null;
            resolve();
          });
        });
      }
      // Unter Unix (Linux, macOS)
      else {
        return new Promise<void>((resolve) => {
          this.activeProcess.kill("SIGTERM");
          setTimeout(() => {
            if (this.activeProcess) {
              log.warn("SIGTERM ignoriert, sende SIGKILL an Prozess");
              this.activeProcess.kill("SIGKILL");
            }
            this.activeProcess = null;
            resolve();
          }, 500);
        });
      }
    }

    log.debug("Keine aktive Testausführung zum Stoppen gefunden");
    return Promise.resolve();
  }
}

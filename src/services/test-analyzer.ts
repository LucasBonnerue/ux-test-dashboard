/**
 * Test-Analyse-Service
 * Extrahiert und analysiert Test-Metadaten und -Coverage
 */

import * as fs from "fs";
import * as path from "path";
import {
  TestMetadata,
  TestSelector,
  TestAssertion,
  CoverageMatrix,
} from "../types/test-analysis";
import { Logger } from "../utils/logger";

export interface TestAnalyzerOptions {
  testDir: string;
  resultsDir: string;
  logger: Logger;
}

export class TestAnalyzer {
  private options: TestAnalyzerOptions;
  private logger: Logger;

  constructor(options: TestAnalyzerOptions) {
    this.options = options;
    this.logger = options.logger;
  }

  /**
   * Analysiert einen einzelnen Test und extrahiert Metadaten
   * @param testFilePath Pfad zur Testdatei
   */
  public async analyzeTest(testFilePath: string): Promise<TestMetadata> {
    try {
      this.logger.debug("TestAnalyzer", `Analysiere Test: ${testFilePath}`);

      // Datei einlesen
      const content = await fs.promises.readFile(testFilePath, "utf-8");
      const lines = content.split("\n");

      // Basisdaten
      const fileName = path.basename(testFilePath);
      const relativePath = path.relative(this.options.testDir, testFilePath);

      // Extrahiere Titel aus describe-Block
      const titleMatch = content.match(/describe\(['"](.+?)['"]/);
      const title = titleMatch ? titleMatch[1] : fileName;

      // Testtyp bestimmen
      const testType = this.determineTestType(content);

      // Selektoren extrahieren
      const selectors = this.extractSelectors(content);

      // Assertions extrahieren
      const assertions = this.extractAssertions(content);

      // Funktionale Bereiche (aus Kommentaren oder Dateistruktur)
      const functionalAreas = this.extractFunctionalAreas(
        content,
        relativePath,
      );

      // Coverage-Informationen berechnen
      const coverage = {
        area: functionalAreas,
        type: [testType],
      };

      // Abhängigkeiten finden
      const dependencies = this.extractDependencies(content);

      // Timeouts extrahieren
      const timeouts = this.extractTimeouts(content);

      // Screenshots-Verwendung überprüfen
      const hasScreenshots =
        content.includes("screenshot") || content.includes("takeScreenshot");

      // Komplexität abschätzen (vereinfacht)
      const complexity = this.estimateComplexity(content);

      return {
        file: fileName,
        path: relativePath,
        name: fileName.replace(/\.(spec|test)\.(js|ts)$/, ""),
        title,
        description: this.extractDescription(content),
        testType,
        selectors,
        assertions,
        dependencies,
        timeouts,
        screenshots: hasScreenshots,
        complexity,
        lineCount: lines.length,
        updatedAt: new Date().toISOString(),
        functionalAreas,
        coverage,
      };
    } catch (error) {
      this.logger.error(
        "TestAnalyzer",
        `Fehler bei der Analyse von ${testFilePath}: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Leere Metadaten mit Fehler zurückgeben
      return {
        file: path.basename(testFilePath),
        path: path.relative(this.options.testDir, testFilePath),
        name: path
          .basename(testFilePath)
          .replace(/\.(spec|test)\.(js|ts)$/, ""),
        title: "Fehler bei der Analyse",
        description: "",
        testType: "unknown",
        selectors: [],
        assertions: [],
        dependencies: [],
        timeouts: [],
        screenshots: false,
        complexity: 0,
        lineCount: 0,
        updatedAt: new Date().toISOString(),
        functionalAreas: [],
        coverage: { area: [], type: [] },
        error: `Analysefehler: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Analysiert alle Tests im angegebenen Verzeichnis
   * @param searchPattern Optionales Suchmuster für Testdateien
   */
  public async analyzeAllTests(
    searchPattern?: string,
  ): Promise<TestMetadata[]> {
    try {
      this.logger.info("TestAnalyzer", "Starte Analyse aller Tests");

      // Testdateien finden
      const testFiles = await this.findTestFiles(searchPattern);
      this.logger.debug(
        "TestAnalyzer",
        `${testFiles.length} Testdateien gefunden`,
      );

      // Alle Tests analysieren
      const results: TestMetadata[] = [];

      for (const file of testFiles) {
        try {
          const metadata = await this.analyzeTest(file);
          results.push(metadata);
        } catch (error) {
          this.logger.error(
            "TestAnalyzer",
            `Fehler bei der Analyse von ${file}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      return results;
    } catch (error) {
      this.logger.error(
        "TestAnalyzer",
        `Allgemeiner Fehler bei der Testanalyse: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Generiert eine Coverage-Matrix aus Test-Metadaten
   * @param testMetadata Array von Test-Metadaten
   */
  public generateCoverageMatrix(testMetadata: TestMetadata[]): CoverageMatrix {
    // Alle Funktionsbereiche sammeln
    const areas = new Set<string>();
    const types = new Map<string, number>();

    // Zählen der Tests pro Bereich und Typ
    testMetadata.forEach((test) => {
      // Bereiche
      test.functionalAreas.forEach((area) => areas.add(area));

      // Typen zählen
      if (test.testType) {
        const count = types.get(test.testType) || 0;
        types.set(test.testType, count + 1);
      }
    });

    // Matrix erstellen
    const matrix: CoverageMatrix = {
      areas: [],
      types: Object.fromEntries(types),
      timestamp: new Date().toISOString(),
    };

    // Für jeden Funktionsbereich Coverage berechnen
    areas.forEach((area) => {
      const areaCoverage = {
        area,
        coverage: {} as Record<string, number>,
        total: 0,
      };

      // Für jeden Testtyp in diesem Bereich
      types.forEach((_, type) => {
        const testsForAreaAndType = testMetadata.filter(
          (test) =>
            test.functionalAreas.includes(area) && test.testType === type,
        ).length;

        areaCoverage.coverage[type] = testsForAreaAndType;
        areaCoverage.total += testsForAreaAndType;
      });

      matrix.areas.push(areaCoverage);
    });

    return matrix;
  }

  /**
   * Testsuite-Analyse - gibt umfassende Analyse-Ergebnisse zurück
   * @param searchPattern Optionales Suchmuster
   */
  public async analyzeTestSuite(searchPattern?: string): Promise<{
    testsAnalyzed: number;
    testMetadata: TestMetadata[];
    coverageMatrix: CoverageMatrix;
  }> {
    // Alle Tests analysieren
    const testMetadata = await this.analyzeAllTests(searchPattern);

    // Coverage-Matrix generieren
    const coverageMatrix = this.generateCoverageMatrix(testMetadata);

    return {
      testsAnalyzed: testMetadata.length,
      testMetadata,
      coverageMatrix,
    };
  }

  // Private Hilfsmethoden

  /**
   * Findet alle Testdateien im angegebenen Verzeichnis
   * @param searchPattern Optionales Suchmuster
   */
  private async findTestFiles(searchPattern?: string): Promise<string[]> {
    const testDir = this.options.testDir;

    // Rekursives Dateifinden
    const findFiles = async (dir: string): Promise<string[]> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      const files = await Promise.all(
        entries.map(async (entry) => {
          const res = path.resolve(dir, entry.name);

          if (entry.isDirectory()) {
            return findFiles(res);
          }

          // Testdateien identifizieren
          if (res.match(/\.(spec|test)\.(js|ts)$/)) {
            if (!searchPattern || res.includes(searchPattern)) {
              return [res];
            }
          }

          return [];
        }),
      );

      return files.flat();
    };

    return findFiles(testDir);
  }

  /**
   * Bestimmt den Testtyp anhand des Dateiinhalts
   */
  private determineTestType(content: string): string {
    if (
      content.includes("page.goto") ||
      content.includes("browser.") ||
      content.includes("playwright")
    ) {
      return "e2e";
    } else if (
      content.includes("mount") ||
      content.includes("render") ||
      content.includes("screen.")
    ) {
      return "component";
    } else if (
      content.includes("supertest") ||
      content.includes("request(") ||
      content.includes("api")
    ) {
      return "api";
    } else if (
      content.includes("Math.") ||
      content.includes("calculate") ||
      content.includes("compute")
    ) {
      return "unit";
    } else {
      return "unknown";
    }
  }

  /**
   * Extrahiert UI-Selektoren aus dem Testcode
   */
  private extractSelectors(content: string): TestSelector[] {
    const selectors: TestSelector[] = [];
    const lines = content.split("\n");

    // Verschiedene Selektortypen suchen
    const regexPatterns = [
      { type: "testId", regex: /getByTestId\(['"](.+?)['"]\)/g },
      { type: "text", regex: /getByText\(['"](.+?)['"]\)/g },
      { type: "role", regex: /getByRole\(['"](.+?)['"]/g },
      { type: "label", regex: /getByLabelText\(['"](.+?)['"]\)/g },
      { type: "placeholder", regex: /getByPlaceholderText\(['"](.+?)['"]\)/g },
      { type: "xpath", regex: /xpath=(['"])(.+?)\1/g },
    ];

    // Durch jede Zeile iterieren
    lines.forEach((line, lineNum) => {
      regexPatterns.forEach((pattern) => {
        // Alternative Implementierung ohne matchAll für bessere Kompatibilität
        let match;
        // Reset regex lastIndex
        pattern.regex.lastIndex = 0;

        while ((match = pattern.regex.exec(line)) !== null) {
          selectors.push({
            type: pattern.type as
              | "testId"
              | "text"
              | "role"
              | "label"
              | "placeholder"
              | "xpath",
            value: match[1],
            usage: line.trim(),
            line: lineNum + 1,
          });
        }
      });
    });

    return selectors;
  }

  /**
   * Extrahiert Assertions aus dem Testcode
   */
  private extractAssertions(content: string): TestAssertion[] {
    const assertions: TestAssertion[] = [];
    const lines = content.split("\n");

    // Verschiedene Assertions-Muster suchen
    lines.forEach((line, lineNum) => {
      // Jest Assertions
      if (line.includes("expect(")) {
        const match = line.match(/expect\((.+?)\)\.(\w+)\(?(.+?)?\)?/);

        if (match) {
          assertions.push({
            type: match[2], // toBe, toEqual, etc.
            condition: line.trim(),
            line: lineNum + 1,
          });
        }
      }

      // Chai Assertions
      if (line.includes(".should") || line.includes("assert.")) {
        assertions.push({
          type: "chai",
          condition: line.trim(),
          line: lineNum + 1,
        });
      }
    });

    return assertions;
  }

  /**
   * Extrahiert funktionale Bereiche aus dem Testcode oder Dateipfad
   */
  private extractFunctionalAreas(content: string, filePath: string): string[] {
    const areas: Set<string> = new Set();

    // Aus Dateistruktur (z.B. "components/navigation/test.spec.js" -> "navigation")
    const pathParts = filePath.split("/");
    if (pathParts.length > 1) {
      areas.add(pathParts[0]); // Hauptordner

      if (pathParts.length > 2) {
        areas.add(pathParts[1]); // Unterordner
      }
    }

    // Aus Kommentaren (z.B. "// Area: Authentication")
    const areaCommentMatch = content.match(/\/\/\s*Area:\s*(.+?)$/m);
    if (areaCommentMatch) {
      areas.add(areaCommentMatch[1].trim());
    }

    // Aus JSDoc (z.B. "@area Authentication")
    const jsDocMatch = content.match(/@area\s+(.+?)(?:\s|$)/);
    if (jsDocMatch) {
      areas.add(jsDocMatch[1].trim());
    }

    return Array.from(areas);
  }

  /**
   * Extrahiert Abhängigkeiten aus dem Testcode
   */
  private extractDependencies(content: string): string[] {
    const dependencies: Set<string> = new Set();
    const lines = content.split("\n");

    // Import-Statements durchsuchen
    lines.forEach((line) => {
      const importMatch = line.match(/import.+from\s+['"](.+?)['"]/);
      if (importMatch) {
        // Externe Abhängigkeiten (keine relativen Pfade)
        if (!importMatch[1].startsWith(".")) {
          dependencies.add(importMatch[1]);
        }
      }

      const requireMatch = line.match(/require\(['"](.+?)['"]\)/);
      if (requireMatch) {
        // Externe Abhängigkeiten (keine relativen Pfade)
        if (!requireMatch[1].startsWith(".")) {
          dependencies.add(requireMatch[1]);
        }
      }
    });

    return Array.from(dependencies);
  }

  /**
   * Extrahiert Timeout-Werte aus dem Testcode
   */
  private extractTimeouts(content: string): number[] {
    const timeouts: number[] = [];
    const lines = content.split("\n");

    // Timeout-Werte in ms suchen
    lines.forEach((line) => {
      const timeoutPatterns = [
        /timeout\((\d+)\)/g,
        /setTimeout\(.*?,\s*(\d+)\)/g,
        /waitFor.*?\{\s*timeout:\s*(\d+)\s*\}/g,
      ];

      // Für jedes Pattern nach Matches suchen
      timeoutPatterns.forEach((pattern) => {
        let match;
        pattern.lastIndex = 0; // Reset regex lastIndex
        while ((match = pattern.exec(line)) !== null) {
          if (match[1]) {
            timeouts.push(parseInt(match[1], 10));
          }
        }
      });
    });

    return timeouts;
  }

  /**
   * Extrahiert die Beschreibung aus Kommentaren
   */
  private extractDescription(content: string): string {
    // JSDoc-Kommentar suchen
    const jsDocMatch = content.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);

    if (jsDocMatch) {
      // JSDoc-Inhalt bereinigen
      return jsDocMatch[1]
        .replace(/^\s*\*\s*/gm, "") // * am Zeilenanfang entfernen
        .replace(/@\w+.*$/gm, "") // Tags entfernen
        .trim();
    }

    // Einzeilige Kommentare vor describe
    const describeIndex = content.indexOf("describe");
    if (describeIndex > 0) {
      const beforeDescribe = content.substring(0, describeIndex);
      const commentMatch = beforeDescribe.match(/\/\/\s*(.+?)$/m);

      if (commentMatch) {
        return commentMatch[1].trim();
      }
    }

    return "";
  }

  /**
   * Schätzt die Komplexität des Tests anhand verschiedener Faktoren
   */
  private estimateComplexity(content: string): number {
    let complexity = 0;

    // Anzahl der Tests
    const itCount = (content.match(/it\(/g) || []).length;
    complexity += itCount * 2;

    // Verschachtelte Beschreibungen
    const describeCount = (content.match(/describe\(/g) || []).length;
    complexity += describeCount;

    // Hooks
    const hooksCount = (
      content.match(/beforeEach\(|afterEach\(|beforeAll\(|afterAll\(/g) || []
    ).length;
    complexity += hooksCount * 1.5;

    // Kontrollstrukturen
    const controlCount = (
      content.match(/if\s*\(|for\s*\(|while\s*\(|switch\s*\(/g) || []
    ).length;
    complexity += controlCount * 2;

    // Assertions
    const assertCount = (content.match(/expect\(|assert\./g) || []).length;
    complexity += assertCount;

    return Math.round(complexity);
  }
}

// Factory-Funktion für einfache Erstellung
export function createTestAnalyzer(options: TestAnalyzerOptions): TestAnalyzer {
  return new TestAnalyzer(options);
}

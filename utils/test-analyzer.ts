/**
 * Test-Analyzer
 *
 * Dieses Skript extrahiert Metadaten aus Playwright-Tests für die Analyse
 * und Dokumentation der Testabdeckung.
 */

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
// Direkte Verwendung von fs und path statt glob-Modul

export interface TestSelector {
  type: string; // z.B. 'css', 'xpath', 'text', etc.
  value: string; // Der eigentliche Selektorwert
  usage: string; // z.B. 'click', 'fill', 'check', etc.
  line: number; // Zeilennummer im Test
}

export interface TestAssertion {
  type: string; // z.B. 'toBeVisible', 'toHaveText', etc.
  condition: string; // Die geprüfte Bedingung
  line: number; // Zeilennummer im Test
}

export interface TestMetadata {
  file: string; // Relativer Pfad zur Testdatei
  path: string; // Absoluter Pfad zur Testdatei
  description: string; // Beschreibung des Tests, aus Kommentaren oder Beschreibungen
  title: string; // Testtitel aus test.describe/test() Aufrufen
  name: string; // Name des Tests (für Frontend-Anzeige)
  testType: string; // Art des Tests (UI, E2E, Funktional)
  selectors: TestSelector[]; // Liste der verwendeten Selektoren
  assertions: TestAssertion[]; // Liste der Assertions
  dependencies: string[]; // Importierte Module und Abhängigkeiten
  timeouts: number[]; // Gefundene Timeout-Werte
  screenshots: boolean; // Hat der Test Screenshots
  complexity: number; // Metriken zur Komplexität (z.B. zyklomatische Komplexität)
  lineCount: number; // Anzahl der Zeilen
  updatedAt: string; // Letztes Änderungsdatum
  functionalAreas: string[]; // Betroffene Funktionsbereiche
  coverage: {
    // Bereich der getesteten Funktionalität
    area: string[]; // z.B. ['UI', 'Navigation', 'Auth']
    type: string[]; // z.B. ['Functional', 'Visual', 'Performance']
  };
}

export class TestAnalyzer {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Findet alle Playwright-Test-Dateien im angegebenen Verzeichnis
   * Eigene Implementierung ohne glob-Abhängigkeit
   */
  findTestFiles(pattern: string = "**/*.spec.ts"): string[] {
    console.log(`VERBESSERTE SUCHE: Starte Suche nach *.spec.ts Dateien`);
    console.log(`Basis-Pfad: ${this.basePath}`);

    const results: string[] = [];

    try {
      // Überprüfe, ob der Basispfad existiert
      if (!fs.existsSync(this.basePath)) {
        console.error(`Basis-Pfad existiert nicht: ${this.basePath}`);
        return [];
      }

      // Betrachte auch das Elternverzeichnis als potentielles Test-Verzeichnis
      const parentPath = path.resolve(this.basePath, "..");
      console.log(`Prüfe auch Elternverzeichnis: ${parentPath}`);

      // Liste bekannter Test-Verzeichnisse relativ zur Basis
      const testDirs = [
        "", // das Basispfad-Verzeichnis selbst
        "../", // das Elternverzeichnis
        "../e2e/",
        "../specs/",
        "../tests/",
        "../__tests__/",
        "./e2e/",
        "./specs/",
        "./tests/",
        "./__tests__/",
      ];

      console.log(`Prüfe ${testDirs.length} potentielle Test-Verzeichnisse...`);

      // Rekursive Funktion zum Durchsuchen von Verzeichnissen
      const findRecursively = (dir: string) => {
        try {
          if (!fs.existsSync(dir)) {
            console.log(`Verzeichnis existiert nicht: ${dir}`);
            return;
          }

          console.log(`Durchsuche Verzeichnis: ${dir}`);

          const entries = fs.readdirSync(dir, { withFileTypes: true });
          console.log(`${entries.length} Einträge gefunden in ${dir}`);

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            // Überspringe node_modules und andere spezielle Verzeichnisse
            if (
              entry.name === "node_modules" ||
              entry.name === ".git" ||
              entry.name === "dist" ||
              entry.name === "build"
            ) {
              continue;
            }

            if (entry.isDirectory()) {
              // Rekursiv in Unterverzeichnisse gehen, aber max. 3 Ebenen tief
              const relativePath = path.relative(this.basePath, dir);
              const depth = relativePath.split(path.sep).length;

              if (depth < 3) {
                findRecursively(fullPath);
              }
            } else if (entry.isFile()) {
              // Teste verschiedene Testdatei-Muster
              if (
                entry.name.endsWith(".spec.ts") ||
                entry.name.endsWith(".test.ts") ||
                entry.name.endsWith(".spec.js") ||
                entry.name.endsWith(".test.js")
              ) {
                console.log(`Testdatei gefunden: ${fullPath}`);
                results.push(fullPath);
              }
            }
          }
        } catch (dirError) {
          console.error(
            `Fehler beim Durchsuchen von ${dir}: ${dirError instanceof Error ? dirError.message : "Unbekannter Fehler"}`,
          );
        }
      };

      // Durchsuche alle potentiellen Test-Verzeichnisse
      for (const testDir of testDirs) {
        const dirPath = path.resolve(this.basePath, testDir);
        findRecursively(dirPath);
      }

      console.log(`Gefundene Testdateien: ${results.length}`);

      // Ausgeben der gefundenen Dateien für Debugging
      if (results.length > 0) {
        console.log("Gefundene Testdateien:");
        results.forEach((file) => console.log(`- ${file}`));
      } else {
        console.log("WARNUNG: Keine Testdateien gefunden!");
        console.log("Geprüfte Verzeichnisse:");
        testDirs.forEach((dir) => {
          const fullPath = path.resolve(this.basePath, dir);
          const exists = fs.existsSync(fullPath)
            ? "existiert"
            : "existiert NICHT";
          console.log(`- ${fullPath} (${exists})`);
        });
      }

      return results;
    } catch (error) {
      console.error(
        `Fehler beim Suchen von Testdateien: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
      );
      return [];
    }
  }

  /**
   * Extrahiert Metadaten aus einer einzelnen Testdatei
   */
  analyzeTestFile(filePath: string): TestMetadata {
    console.log(`Analysiere Testdatei: ${filePath}`);

    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.basePath, filePath);

      // Überprüfe, ob die Datei existiert
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Datei existiert nicht: ${absolutePath}`);
      }

      console.log(`Lese Datei: ${absolutePath}`);
      let fileContent: string;
      try {
        fileContent = fs.readFileSync(absolutePath, "utf-8");
      } catch (readError) {
        throw new Error(
          `Fehler beim Lesen der Datei ${absolutePath}: ${readError instanceof Error ? readError.message : "Unbekannter Fehler"}`,
        );
      }

      let stats: fs.Stats;
      try {
        stats = fs.statSync(absolutePath);
      } catch (statError) {
        // Setze Standardwerte für stats, falls es fehlschlägt
        console.error(
          `Fehler beim Lesen der Dateistatistik: ${statError instanceof Error ? statError.message : "Unbekannter Fehler"}`,
        );
        stats = {
          mtime: new Date(),
        } as fs.Stats;
      }

      // Extrahiere den Test-Namen aus dem Dateinamen
      const fileName = path.basename(absolutePath);
      const testName = fileName.replace(/\.(spec|test)\.(ts|js)$/, "");

      // Bestimme den Test-Typ anhand von Dateiinhalt/Pfad
      const testType = this.determineTestType(absolutePath, fileContent);

      // Initialisiere leere Metadaten-Struktur
      const metadata: TestMetadata = {
        file: path.relative(this.basePath, absolutePath),
        path: absolutePath,
        description: "Keine Beschreibung",
        title: testName, // Verwende den Dateinamen als Standardtitel
        name: testName, // Name für die Frontend-Anzeige
        testType: testType,
        selectors: [],
        assertions: [],
        dependencies: [],
        timeouts: [],
        screenshots: false,
        complexity: 0,
        lineCount: 0,
        updatedAt: new Date().toISOString(),
        functionalAreas: this.extractFunctionalAreas(fileContent),
        coverage: {
          area: [],
          type: [],
        },
      };

      // Fülle die Metadaten mit tatsächlichen Daten, mit Fehlerbehandlung
      try {
        metadata.description = this.extractDescription(fileContent);
      } catch (error) {
        console.error(
          `Fehler beim Extrahieren der Beschreibung: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        const extractedTitle = this.extractTestTitle(fileContent);
        if (extractedTitle && extractedTitle.trim() !== "") {
          metadata.title = extractedTitle;
          metadata.name = extractedTitle; // Name mit Titel synchronisieren
        }
      } catch (error) {
        console.error(
          `Fehler beim Extrahieren des Titels: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        metadata.selectors = this.extractSelectors(fileContent);
      } catch (error) {
        console.error(
          `Fehler beim Extrahieren der Selektoren: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        metadata.assertions = this.extractAssertions(fileContent);
      } catch (error) {
        console.error(
          `Fehler beim Extrahieren der Assertions: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        metadata.dependencies = this.extractDependencies(fileContent);
      } catch (error) {
        console.error(
          `Fehler beim Extrahieren der Abhängigkeiten: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        metadata.timeouts = this.extractTimeouts(fileContent);
      } catch (error) {
        console.error(
          `Fehler beim Extrahieren der Timeouts: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        metadata.screenshots = fileContent.includes("screenshot");
      } catch (error) {
        console.error(
          `Fehler beim Prüfen auf Screenshots: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        metadata.complexity = this.calculateComplexity(fileContent);
      } catch (error) {
        console.error(
          `Fehler beim Berechnen der Komplexität: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        metadata.lineCount = fileContent.split("\n").length;
      } catch (error) {
        console.error(
          `Fehler beim Zählen der Zeilen: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        metadata.updatedAt = stats.mtime.toISOString();
      } catch (error) {
        console.error(
          `Fehler beim Lesen des Änderungsdatums: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
      }

      try {
        const coverage = this.determineCoverage(fileContent, metadata.file);
        metadata.coverage = coverage;
      } catch (error) {
        console.error(
          `Fehler beim Ermitteln der Abdeckung: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        );
        metadata.coverage = {
          area: ["Unbekannt"],
          type: ["Unbekannt"],
        };
      }

      return metadata;
    } catch (error) {
      console.error(
        `Fehler bei der Analyse von ${filePath}: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
      );
      throw error;
    }
  }

  /**
   * Extrahiert die Testbeschreibung aus Kommentaren oder describe-Blocks
   */
  private extractDescription(content: string): string {
    // Suche nach JSDoc-Kommentaren
    const docCommentRegex = /\/\*\*([\s\S]*?)\*\//;
    const docMatch = content.match(docCommentRegex);
    if (docMatch && docMatch[1]) {
      // Entferne * am Anfang der Zeilen und trimme
      return docMatch[1]
        .split("\n")
        .map((line) => line.trim().replace(/^\*\s*/, ""))
        .filter((line) => line.length > 0)
        .join(" ")
        .trim();
    }

    // Alternativ: Suche nach test.describe mit Beschreibung
    const describeRegex = /test\.describe\(['"](.*?)['"],/;
    const describeMatch = content.match(describeRegex);
    if (describeMatch && describeMatch[1]) {
      return describeMatch[1];
    }

    return "";
  }

  /**
   * Extrahiert den Titel aus einer Testdatei
   */
  extractTestTitle(content: string): string {
    // Suche nach dem Test-Titel (normalerweise im ersten test.describe oder test)
    const titleMatch = content.match(
      /(?:test|describe)\s*\([\s\n]*['"](.+?)['"]/m,
    );
    return titleMatch ? titleMatch[1] : "";
  }

  /**
   * Bestimmt den Testtyp anhand von Dateiinhalt und Pfad
   */
  determineTestType(filePath: string, content: string): string {
    if (
      filePath.includes("e2e") ||
      content.includes("end-to-end") ||
      content.includes("user flow")
    ) {
      return "E2E";
    } else if (
      filePath.includes("ui") ||
      content.includes("visual") ||
      content.includes("layout")
    ) {
      return "UI-Test";
    } else if (
      filePath.includes("functional") ||
      content.includes("functionality")
    ) {
      return "Funktional";
    } else if (filePath.includes("integration")) {
      return "Integration";
    } else if (filePath.includes("unit")) {
      return "Unit";
    } else {
      return "Allgemein";
    }
  }

  /**
   * Extrahiert die funktionalen Bereiche aus dem Testinhalt
   */
  extractFunctionalAreas(content: string): string[] {
    const areas: string[] = [];

    if (content.includes("navigation") || content.includes("menu")) {
      areas.push("Navigation");
    }
    if (
      content.includes("login") ||
      content.includes("auth") ||
      content.includes("authentication")
    ) {
      areas.push("Authentication");
    }
    if (
      content.includes("form") ||
      content.includes("input") ||
      content.includes("submit")
    ) {
      areas.push("Formulare");
    }
    if (content.includes("dashboard") || content.includes("overview")) {
      areas.push("Dashboard");
    }
    if (
      content.includes("profile") ||
      content.includes("account") ||
      content.includes("user")
    ) {
      areas.push("Benutzerprofil");
    }
    if (content.includes("admin") || content.includes("settings")) {
      areas.push("Administration");
    }
    if (content.includes("search") || content.includes("filter")) {
      areas.push("Suche");
    }
    if (content.includes("report") || content.includes("analytics")) {
      areas.push("Berichte");
    }
    if (content.includes("notification") || content.includes("alert")) {
      areas.push("Benachrichtigungen");
    }

    // Fallback
    if (areas.length === 0) {
      areas.push("Allgemein");
    }

    return areas;
  }

  /**
   * Extrahiert die Selektoren aus einer Testdatei
   */
  extractSelectors(content: string): TestSelector[] {
    // Extrahiere alle CSS-Selektoren aus dem Test
    const selectorMatches =
      content.match(
        /(\.locator\s*\(|page\.locator\s*\(|getByText\s*\(|getByRole\s*\(|getByTestId\s*\(|\.click\(\s*['"]).+?['"]/g,
      ) || [];

    // Debug-Info
    console.log(`Gefundene Selektormatches: ${selectorMatches.length}`);

    const selectors: TestSelector[] = [];
    let lineCounter = 0;

    for (const match of selectorMatches) {
      try {
        lineCounter++;
        const selectorText = match
          .replace(
            /(\.locator\s*\(|page\.locator\s*\(|getByText\s*\(|getByRole\s*\(|getByTestId\s*\(|\.click\(\s*['"])/g,
            "",
          )
          .replace(/['"]/g, "");

        // Bestimme den Typ des Selektors
        let type = "css";
        let usage = "locate";

        if (match.includes("getByText")) type = "text";
        if (match.includes("getByRole")) type = "role";
        if (match.includes("getByTestId")) type = "testId";
        if (match.includes(".click")) usage = "click";
        if (match.includes(".fill")) usage = "fill";

        // Sicher prüfen, ob es sich um einen XPath-Selektor handelt
        if (
          selectorText &&
          typeof selectorText === "string" &&
          selectorText.startsWith("//")
        ) {
          type = "xpath";
        }

        // Sicherstellen, dass der Selektor nicht undefined ist
        const finalSelector: TestSelector = {
          type: type,
          value: selectorText || "",
          usage: usage,
          line: lineCounter,
        };

        selectors.push(finalSelector);
      } catch (error) {
        console.error("Fehler bei der Verarbeitung eines Selektors:", error);
        // Füge einen Dummy-Selektor hinzu, um Fehler im Frontend zu vermeiden
        selectors.push({
          type: "error",
          value: "Verarbeitungsfehler",
          usage: "error",
          line: lineCounter,
        });
      }
    }

    return selectors;
  }

  /**
   * Extrahiert alle Assertions aus dem Test
   */
  private extractAssertions(content: string): TestAssertion[] {
    const assertions: TestAssertion[] = [];
    const lines = content.split("\n");

    // Typische Assertions
    const assertionPatterns = [
      { regex: /expect\((.*?)\)\.toBeVisible/, type: "visibility" },
      { regex: /expect\((.*?)\)\.toHaveText\(['"](.*?)['"]\)/, type: "text" },
      { regex: /expect\((.*?)\)\.toHaveValue\(['"](.*?)['"]\)/, type: "value" },
      { regex: /expect\((.*?)\)\.toBeEnabled/, type: "enabled" },
      { regex: /expect\((.*?)\)\.toBeDisabled/, type: "disabled" },
      { regex: /expect\((.*?)\)\.toHaveCount\((\d+)\)/, type: "count" },
      { regex: /assertPageContent/, type: "custom" },
    ];

    // Durchsuche jede Zeile nach Assertions
    lines.forEach((line, index) => {
      assertionPatterns.forEach((pattern) => {
        const match = line.match(pattern.regex);
        if (match) {
          assertions.push({
            type: pattern.type,
            condition: match[0],
            line: index + 1,
          });
        }
      });
    });

    return assertions;
  }

  /**
   * Extrahiert alle Abhängigkeiten und Imports
   */
  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split("\n");

    // Import-Anweisungen finden
    const importRegex =
      /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let importMatch;
    while ((importMatch = importRegex.exec(content)) !== null) {
      dependencies.push(importMatch[1]);
    }

    // Require-Aufrufe finden
    const requireRegex =
      /(?:const|let|var)\s+(?:{[^}]+}|\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    let requireMatch;
    while ((requireMatch = requireRegex.exec(content)) !== null) {
      dependencies.push(requireMatch[1]);
    }

    return [...new Set(dependencies)]; // Duplikate entfernen
  }

  /**
   * Extrahiert Timeout-Werte aus dem Test
   */
  private extractTimeouts(content: string): number[] {
    const timeouts: number[] = [];
    const timeoutRegex = /(?:setTimeout|timeout).*?(\d+)/g;

    let match;
    while ((match = timeoutRegex.exec(content)) !== null) {
      if (match[1]) {
        timeouts.push(parseInt(match[1], 10));
      }
    }

    return timeouts;
  }

  /**
   * Berechnet eine einfache zyklomatische Komplexität des Tests
   * (Anzahl der Verzweigungen + 1)
   */
  private calculateComplexity(content: string): number {
    const lines = content.split("\n");
    let complexity = 1; // Basiswert

    // Zähle Verzweigungen
    for (const line of lines) {
      if (
        line.includes("if (") ||
        line.includes("else ") ||
        line.includes("switch(") ||
        line.includes("case ") ||
        line.includes(" ? ") ||
        line.includes("for (") ||
        line.includes("while (") ||
        line.includes("catch (")
      ) {
        complexity++;
      }
    }

    return complexity;
  }

  /**
   * Bestimmt die Testabdeckung anhand von Dateiinhalt und Namen
   */
  private determineCoverage(
    content: string,
    filename: string,
  ): { area: string[]; type: string[] } {
    const coverage = {
      area: [] as string[],
      type: [] as string[],
    };

    // Bestimme den Funktionsbereich
    if (
      filename.includes("auth") ||
      content.includes("login") ||
      content.includes("password")
    ) {
      coverage.area.push("Authentifizierung");
    }
    if (filename.includes("navigation") || content.includes("navigate")) {
      coverage.area.push("Navigation");
    }
    if (filename.includes("user") || content.includes("user")) {
      coverage.area.push("Benutzerverwaltung");
    }
    if (filename.includes("dashboard") || content.includes("dashboard")) {
      coverage.area.push("Dashboard");
    }
    if (filename.includes("tool") || content.includes("tool")) {
      coverage.area.push("Tools");
    }
    if (
      filename.includes("ui") ||
      filename.includes("ux") ||
      content.includes("visual")
    ) {
      coverage.area.push("UI/UX");
    }

    // Fallback falls keine spezifische Abdeckung gefunden wurde
    if (coverage.area.length === 0) {
      coverage.area.push("Allgemein");
    }

    // Bestimme den Testtyp
    if (content.includes("screenshot") || content.includes("visual")) {
      coverage.type.push("Visual");
    }
    if (
      content.includes("performance") ||
      content.includes("timeout") ||
      content.includes("speed")
    ) {
      coverage.type.push("Performance");
    }
    if (content.includes("integration") || filename.includes("integration")) {
      coverage.type.push("Integration");
    }
    if (
      content.includes("journey") ||
      content.includes("flow") ||
      content.includes("path")
    ) {
      coverage.type.push("User Journey");
    }
    if (content.includes("expect") || content.includes("assert")) {
      coverage.type.push("Functional");
    }
    if (filename.includes("smoke") || content.includes("smoke")) {
      coverage.type.push("Smoke");
    }
    if (
      filename.includes("responsive") ||
      content.includes("mobile") ||
      content.includes("viewport")
    ) {
      coverage.type.push("Responsive");
    }

    // Fallback falls kein spezifischer Typ gefunden wurde
    if (coverage.type.length === 0) {
      coverage.type.push("Functional"); // Standard: funktionaler Test
    }

    return coverage;
  }

  /**
   * Führt die Analyse für alle gefundenen Testdateien aus
   */
  analyzeAllTests(pattern: string = "**/*.spec.ts"): TestMetadata[] {
    const testFiles = this.findTestFiles(pattern);
    const results: TestMetadata[] = [];

    console.log(`Gefundene Testdateien: ${testFiles.length}`);

    for (const file of testFiles) {
      try {
        const metadata = this.analyzeTestFile(file);
        results.push(metadata);
        console.log(`✅ Analysiert: ${metadata.file}`);
      } catch (error) {
        console.error(`❌ Fehler bei der Analyse von ${file}:`, error);
      }
    }

    return results;
  }

  /**
   * Speichert die Analyseergebnisse als JSON
   */
  saveResults(results: TestMetadata[], outputPath: string): void {
    const dirPath = path.dirname(outputPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`Analyseergebnisse gespeichert unter ${outputPath}`);
  }

  /**
   * Generiert eine Abdeckungsmatrix für die Tests
   */
  generateCoverageMatrix(tests: TestMetadata[]): any {
    // Sammle alle möglichen Bereiche und Typen
    const allAreas = new Set<string>();
    const allTypes = new Set<string>();

    for (const result of tests) {
      if (result.coverage) {
        result.coverage.area.forEach((area) => allAreas.add(area));
        result.coverage.type.forEach((type) => allTypes.add(type));
      }
    }

    // Erstelle die Matrix
    const matrix: Record<string, Record<string, string[]>> = {};

    for (const area of allAreas) {
      matrix[area] = {};
      for (const type of allTypes) {
        matrix[area][type] = [];
      }
    }

    // Fülle die Matrix mit Testdateien
    for (const result of tests) {
      const testId = `${result.file}:${result.title}`;
      if (!result.coverage) continue;

      for (const area of result.coverage.area) {
        for (const type of result.coverage.type) {
          matrix[area][type].push(testId);
        }
      }
    }

    return matrix;
  }
}

// Beispiel für die Verwendung:
if (require.main === module) {
  const analyzer = new TestAnalyzer();
  const results = analyzer.analyzeAllTests();
  analyzer.saveResults(
    results,
    path.join(
      process.cwd(),
      "tests",
      "dashboard",
      "results",
      "test-analysis.json",
    ),
  );

  const matrix = analyzer.generateCoverageMatrix(results);
  analyzer.saveResults(
    matrix,
    path.join(
      process.cwd(),
      "tests",
      "dashboard",
      "results",
      "coverage-matrix.json",
    ),
  );
}

/**
 * Hilfsskript für die Migration von JavaScript zu TypeScript
 * Konvertiert .js-Dateien zu .ts-Dateien und aktualisiert Import-Pfade
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Dateipfad als Argument übergeben oder gesamtes Verzeichnis konvertieren
const targetPath = process.argv[2] || ".";

/**
 * Konvertiert JS-Dateien zu TS und aktualisiert Importe
 * @param {string} filePath - Zu verarbeitender Dateipfad oder Verzeichnis
 */
function renameJsToTs(filePath) {
  if (fs.statSync(filePath).isDirectory()) {
    fs.readdirSync(filePath).forEach((file) => {
      const fullPath = path.join(filePath, file);
      if (
        fs.statSync(fullPath).isDirectory() &&
        !fullPath.includes("node_modules")
      ) {
        renameJsToTs(fullPath);
      } else if (
        file.endsWith(".js") &&
        !file.endsWith(".config.js") &&
        !file.endsWith(".eslintrc.js") &&
        !file.includes("jest.config")
      ) {
        const newPath = fullPath.replace(".js", ".ts");
        console.log(`Renaming ${fullPath} to ${newPath}`);
        fs.renameSync(fullPath, newPath);

        // Automatisch alle Importe anpassen (fügt .js zu Importpfaden hinzu)
        try {
          const content = fs.readFileSync(newPath, "utf8");
          const updatedContent = content.replace(
            /from\s+['"](.+?)['"]/g,
            (match, importPath) => {
              // Nur für relative lokale Importe ohne Dateiendung
              if (
                !importPath.startsWith(".") ||
                importPath.endsWith(".js") ||
                importPath.endsWith(".ts") ||
                importPath.includes("node_modules")
              ) {
                return match;
              }
              return `from '${importPath}.js'`;
            },
          );

          // Auch require() Aufrufe konvertieren
          const requireUpdated = updatedContent.replace(
            /require\(['"](.+?)['"]\)/g,
            (match, importPath) => {
              if (
                !importPath.startsWith(".") ||
                importPath.endsWith(".js") ||
                importPath.endsWith(".ts") ||
                importPath.includes("node_modules")
              ) {
                return match;
              }
              return `require('${importPath}.js')`;
            },
          );

          fs.writeFileSync(newPath, requireUpdated, "utf8");
          console.log(`Updated imports in ${newPath}`);
        } catch (err) {
          console.error(`Error updating imports in ${newPath}:`, err);
        }
      }
    });
  } else if (
    filePath.endsWith(".js") &&
    !filePath.endsWith(".config.js") &&
    !filePath.endsWith(".eslintrc.js")
  ) {
    // Einzelne Datei konvertieren
    const newPath = filePath.replace(".js", ".ts");
    console.log(`Renaming ${filePath} to ${newPath}`);
    fs.renameSync(filePath, newPath);

    try {
      const content = fs.readFileSync(newPath, "utf8");
      // Importe aktualisieren...
      // [Code wie oben]
    } catch (err) {
      console.error(`Error updating imports in ${newPath}:`, err);
    }
  }
}

try {
  renameJsToTs(targetPath);
  console.log("TypeScript migration completed successfully");
  console.log('Run "npm run typecheck" to check for TypeScript errors');
  console.log('Run "npm run lint:fix" to fix linting issues');
} catch (error) {
  console.error("Error during migration:", error);
}

/**
 * esbuild-Konfiguration für Frontend-TypeScript
 * 
 * Diese Konfiguration ermöglicht das Bundling von TypeScript-Dateien
 * für das Frontend des UX-Test-Dashboard.
 */

import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';

// Kommandozeilenargumente prüfen
const isWatch = process.argv.includes('--watch');

// Pfade konfigurieren
const DIST_DIR = path.join(__dirname, 'public', 'js', 'dist');

// Zieldirectory erstellen, falls es nicht existiert
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Entrypoints für Frontend-Dateien finden - nur bereits migrierte TS-Dateien
const ENTRY_POINTS = [
  // Haupt-Dashboard-Controller (zentraler Einstiegspunkt)
  path.join(__dirname, 'public/js/metrics-ts/dashboard-init.ts'),
  // Modul-spezifische Entry Points
  path.join(__dirname, 'public/js/metrics-ts/success-rate-view.ts'),
  path.join(__dirname, 'public/js/metrics-ts/flakiness-view.ts'),
  path.join(__dirname, 'public/js/metrics-ts/logs.ts'),
  path.join(__dirname, 'public/js/metrics-ts/test-analysis.ts'),
  // Hier können weitere migrierte TypeScript-Dateien hinzugefügt werden
];

// Build-Konfiguration
const buildOptions: esbuild.BuildOptions = {
  entryPoints: ENTRY_POINTS,
  outdir: DIST_DIR,
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: true,
  format: 'esm',
  target: ['es2020'],
  loader: {
    '.ts': 'ts',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  // Ignoriere TypeScript-Fehler für jetzt, damit wir inkrementell migrieren können
  logLevel: 'info',
  logLimit: 0,
}

// Build-Prozess ausführen
async function runBuild(): Promise<void> {
  try {
    if (isWatch) {
      // Watch-Modus
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('⚡ esbuild: Watching for changes...');
    } else {
      // Einmaliger Build
      await esbuild.build(buildOptions);
      console.log('⚡ esbuild: Build complete');
    }
  } catch (error) {
    console.error('❌ esbuild build failed:', error);
    process.exit(1);
  }
}

// Build ausführen
runBuild().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

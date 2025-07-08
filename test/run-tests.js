#!/usr/bin/env node

/* eslint-env node, mocha */
/* eslint-disable no-undef */
/**
 * Test-Runner für das UX-Test-Dashboard Projekt
 * Führt Unit-Tests für das Event-basierte Kommunikationssystem aus
 */

const Mocha = require('mocha');
const path = require('path');
const fs = require('fs');

// ts-node für TypeScript-Tests registrieren
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020'
  }
});

// Test-Konfiguration
const mocha = new Mocha({
  ui: 'bdd',
  color: true,
  timeout: 5000
});

// Unit-Tests laden
const testDir = path.join(__dirname, 'unit');
fs.readdirSync(testDir)
  .filter(file => file.endsWith('.test.ts'))
  .forEach(file => {
    mocha.addFile(path.join(testDir, file));
  });

console.log('Running tests for the event-based communication system...');

// Tests ausführen
mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
});

/**
 * Jest-Konfiguration für das UX-Test-Dashboard
 *
 * Diese Konfiguration passt Jest für die Verwendung mit TypeScript an und
 * definiert Strukturen für Tests, die den Projektstandards entsprechen.
 */

import type { Config } from "jest";

const config: Config = {
  // Basisverzeichnis für alle Pfade in der Konfiguration
  rootDir: ".",

  // Testumgebung
  testEnvironment: "node",

  // TypeScript-Integration mit ts-jest
  preset: "ts-jest",

  // Transformationen
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
    "^.+\\.jsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },

  // Modulpfade
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^src/(.*)$": "<rootDir>/src/$1",
  },

  // Testmuster
  testMatch: [
    "**/__tests__/**/*.spec.[jt]s?(x)",
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+spec.[jt]s?(x)",
    "**/?(*.)+test.[jt]s?(x)",
  ],

  // Abdeckungskonfiguration
  collectCoverageFrom: [
    "utils/**/*.ts",
    "routes/**/*.ts",
    "src/**/*.ts",
    "server-complete.js",
    "!**/node_modules/**",
    "!**/dist/**",
  ],

  // Testberichte
  reporters: ["default"],

  // Timeouts
  testTimeout: 10000,

  // Mocking-Einstellungen
  setupFiles: [],

  // Weitere Optionen
  verbose: true,
};

export default config;

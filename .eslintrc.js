/* eslint-env node */
/* global module, process */

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    project: "./tsconfig.json",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  env: {
    node: true,
    es6: true,
    jest: true,
    browser: true,
  },
  globals: {
    process: true,
    __dirname: true,
    require: true,
  },
  rules: {
    // Lockerere Regeln für die Migrationsphase
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/ban-ts-comment": "warn",
    "no-console": "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "warn",
    "prettier/prettier": "warn",
  },
  ignorePatterns: ["node_modules/", "dist/", "coverage/", "public/js/dist/", "!public/js/metrics-ts/"],
  overrides: [
    // JavaScript Dateien
    {
      files: ["*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    // Test runner specific
    {
      files: ["test/run-tests.js"],
      env: {
        node: true,
        mocha: true
      },
      globals: {
        process: true,
        __dirname: true,
        require: true
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "no-undef": "off"
      }
    },
    // TypeScript Dateien
    {
      files: ["*.ts"],
      rules: {
        // Standardmäßig strengere Regeln für neue TypeScript-Dateien
      },
    },
    // Test-Dateien
    {
      files: ["**/__tests__/**/*.{ts,js}", "**/*.{test,spec}.{ts,js}"],
      env: {
        jest: true,
      },
      rules: {
        // Erlaubt mehr Flexibilität in Tests
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/ban-ts-comment": "off",
      },
    },
  ],
};

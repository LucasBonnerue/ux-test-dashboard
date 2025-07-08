/* eslint-env node */
/* global module */

module.exports = {
  root: false, // Use parent config as base
  env: {
    node: true,
    es2020: true,
    mocha: true
  },
  globals: {
    process: true,
    __dirname: true,
    require: true
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    "@typescript-eslint/no-var-requires": "off",
    "no-undef": "off" // Disable undefined variable warnings for Node.js globals
  }
};

/**
 * @type {import('prettier').Config}
 * This configuration requires the `prettier-plugin-import-sort` plugin or similar
 * to enable sorting of import statements according to the defined patterns.
 */
module.exports = {
  // Basic formatting options
  endOfLine: "lf", // Use Unix-style line endings
  semi: true, // End lines with semicolons
  useTabs: false, // Use spaces instead of tabs
  singleQuote: false, // Use double quotes
  tabWidth: 2, // Set indentation to 2 spaces
  printWidth: 200,
  jsxSingleQuote: false,
  bracketSpacing: true,
  arrowParens: "avoid",
  requirePragma: false,
  insertPragma: false,
};

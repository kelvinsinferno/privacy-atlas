import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: [".wxt/**", ".output/**", "data/**"] },
  // Allow _-prefixed params as intentionally unused (stub/interface placeholders).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // sync.mjs and scripts/*.mjs are Node.js CLI scripts — allow Node globals
  {
    files: ["*.mjs", "scripts/*.mjs"],
    languageOptions: { globals: { console: "readonly", process: "readonly", fetch: "readonly", URL: "readonly" } },
  },
);

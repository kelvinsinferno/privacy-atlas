import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference and docs are not project source — skip linting
    "reference/**",
    "docs/**",
    // MCP server is a separate Node project — has its own tsconfig/build
    "mcp-server/**",
    // Extension is a separate wxt project — has its own tsconfig/build
    "extension/**",
    // Claude Code tooling scratch (agent worktrees, etc.) — never project source
    ".claude/**",
  ]),
  // Honor the standard _ prefix convention for intentionally unused args
  // (stub components accept _props: any so TypeScript allows prop-passing at call sites).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;

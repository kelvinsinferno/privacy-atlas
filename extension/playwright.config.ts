import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: { headless: false }, // MV3 extensions require a headed/persistent context
});

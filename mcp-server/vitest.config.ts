import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  plugins: [{
    // Map relative "./x.js" TS-ESM specifiers to their "./x.ts" source during tests.
    name: "resolve-ts-from-js",
    enforce: "pre",
    async resolveId(source, importer) {
      if (importer && source.startsWith(".") && source.endsWith(".js")) {
        const r = await this.resolve(source.slice(0, -3) + ".ts", importer, { skipSelf: true });
        if (r) return r.id;
      }
      return null;
    },
  }],
});

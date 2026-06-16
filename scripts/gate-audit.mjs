import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function run(cmd) { return execSync(cmd, { encoding: "utf8" }); }

// 1) dependency audit — fail on high/critical
try { run("npm audit --audit-level=high"); console.log("✓ npm audit clean (high+)"); }
catch (e) { console.error("✗ npm audit found high/critical:\n" + (e.stdout || e.message)); process.exit(1); }

// 2) secret scan — no keys in tracked files
const tracked = run("git ls-files").split("\n").filter(Boolean)
  .filter((f) => {
    if (f.startsWith("reference/") || f === ".env.example") return false;
    const base = f.split("/").at(-1);
    const isEnvFile = /^\.env/.test(base);          // .env, .env.local, .env.production, …
    const isCodeFile = /\.(ts|tsx|js|mjs|json|env)$/.test(f);
    return isEnvFile || isCodeFile;
  });
const SECRET = /(xai-[A-Za-z0-9]{16,}|sk-[A-Za-z0-9]{16,}|XAI_API_KEY\s*=\s*['"]?[A-Za-z0-9-]{12,})/;
const leaks = tracked.filter((f) => { try { return SECRET.test(readFileSync(f, "utf8")); } catch { return false; } });
if (leaks.length) { console.error("✗ possible secret in: " + leaks.join(", ")); process.exit(1); }
console.log("✓ no secrets in tracked files");

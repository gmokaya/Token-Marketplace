import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../../..");
const markets = [
  ["grain", "artifacts/wrs-marketplace"],
  ["coffee", "artifacts/coffee-marketplace"],
  ["tea", "artifacts/tea-marketplace"],
];

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const failures = [];
for (const [market, relativeDir] of markets) {
  const appDir = path.join(root, relativeDir);
  const appSource = fs.readFileSync(path.join(appDir, "src/App.tsx"), "utf8");
  const helperSource = fs.readFileSync(path.join(appDir, "src/lib/apiUrl.ts"), "utf8");
  const expectedBase = `/api/v1/${market}`;

  if (!appSource.includes(`setBaseUrl("${expectedBase}")`)) {
    failures.push(`${market}: App.tsx does not initialize ${expectedBase}`);
  }
  if (!helperSource.includes(`const API_BASE = "${expectedBase}"`)) {
    failures.push(`${market}: apiUrl helper does not target ${expectedBase}`);
  }

  for (const file of sourceFiles(path.join(appDir, "src"))) {
    const source = fs.readFileSync(file, "utf8");
    const label = path.relative(root, file);
    if (/\/(?:grain|coffee|tea)\/api(?:\/|["'`])/.test(source)) {
      failures.push(`${label}: embeds a SPA base path before /api`);
    }
    if (/\$\{(?:basePath|apiBase)\}\/api/.test(source) || source.includes("VITE_API_URL")) {
      failures.push(`${label}: derives API routing from a UI/origin base`);
    }
    if (/\bfetch\s*\((?!\s*apiUrl\s*\()/s.test(source)) {
      failures.push(`${label}: direct fetch does not use apiUrl`);
    }
    if (/new\s+EventSource\s*\((?!\s*apiUrl\s*\()/s.test(source)) {
      failures.push(`${label}: EventSource does not use apiUrl`);
    }
    if (/\bcustomFetch\s*\(\s*`[^`]*\/api/.test(source)) {
      failures.push(`${label}: customFetch builds /api with a template prefix`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("All marketplace HTTP and SSE transports use their versioned API base.");
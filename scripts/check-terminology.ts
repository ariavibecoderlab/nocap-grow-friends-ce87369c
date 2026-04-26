import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const forbidden = [/Wallet Balance/g, /Wallet balance/g, /wallet balance/g];
const roots = ["src", "supabase", "public", ".lovable", "README.md"];
const ignoredDirs = new Set(["node_modules", ".git", "dist", "build", ".workspace"]);
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".md",
  ".html",
  ".json",
  ".css",
  ".toml",
]);

const isTextFile = (path: string) => [...textExtensions].some((ext) => path.endsWith(ext));

const walk = (path: string): string[] => {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    if (ignoredDirs.has(path.split(/[\\/]/).pop() ?? "")) return [];
    return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
  }
  return isTextFile(path) ? [path] : [];
};

const matches: string[] = [];

for (const root of roots) {
  try {
    for (const file of walk(root)) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        if (forbidden.some((pattern) => pattern.test(line))) {
          matches.push(`${relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`);
        }
        forbidden.forEach((pattern) => { pattern.lastIndex = 0; });
      });
    }
  } catch {
    continue;
  }
}

if (matches.length > 0) {
  console.error("Forbidden terminology found. Use 'VA Balance' instead of 'Wallet Balance':");
  console.error(matches.join("\n"));
  process.exit(1);
}

console.log("Terminology check passed: no Wallet Balance references found.");

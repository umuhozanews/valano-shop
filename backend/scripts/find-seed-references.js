const fs = require("fs");
const path = require("path");

const ROOT_DIRS = [
  "C:/Users/user/Desktop/INZIRA APP/databridge-mobile-apk",
  "C:/Users/user/Desktop/INZIRA APP/inzira-gateway",
];

const SEARCH_TERMS = ["Bralirwa", "GATETET", "Inyange", "Sulfo", "INITIAL_SUPPLIERS", "MOCK", "INITIAL_CUSTOMERS", "demo"];

function searchFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === ".vercel") {
        continue;
      }
      searchFiles(fullPath);
    } else if (entry.isFile()) {
      if (
        fullPath.endsWith(".js") ||
        fullPath.endsWith(".jsx") ||
        fullPath.endsWith(".json") ||
        fullPath.endsWith(".sql") ||
        fullPath.endsWith(".html") ||
        fullPath.endsWith(".ts") ||
        fullPath.endsWith(".tsx")
      ) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          for (const term of SEARCH_TERMS) {
            if (content.toLowerCase().includes(term.toLowerCase())) {
              const lines = content.split("\n");
              lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(term.toLowerCase())) {
                  console.log(`[${term}] ${fullPath}:${idx + 1} -> ${line.trim().slice(0, 120)}`);
                }
              });
            }
          }
        } catch (err) {}
      }
    }
  }
}

console.log("Searching codebases for hardcoded/seed data...");
ROOT_DIRS.forEach(searchFiles);
console.log("Search complete.");

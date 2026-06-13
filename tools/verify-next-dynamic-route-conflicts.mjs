import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const appDir = join(root, "app");
const conflicts = [];

function isDynamicSegment(name) {
  return /^\[[A-Za-z0-9_-]+\]$/.test(name) || /^\[\.\.\.[A-Za-z0-9_-]+\]$/.test(name) || /^\[\[\.\.\.[A-Za-z0-9_-]+\]\]$/.test(name);
}

function dynamicKind(name) {
  if (name.startsWith("[[...")) return "[[...]]";
  if (name.startsWith("[...")) return "[...]";
  return "[]";
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const groups = new Map();

  for (const entry of entries) {
    if (!isDynamicSegment(entry.name)) continue;
    const kind = dynamicKind(entry.name);
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(entry.name);
  }

  for (const [kind, names] of groups.entries()) {
    const unique = [...new Set(names)];
    if (unique.length > 1) {
      conflicts.push({
        parent: relative(root, dir).replace(/\\/g, "/"),
        kind,
        names: unique
      });
    }
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const child = join(dir, entry.name);
    if (statSync(child).isDirectory()) walk(child);
  }
}

walk(appDir);

if (conflicts.length) {
  console.error("Next.js dynamic route parameter conflicts detected:");
  for (const conflict of conflicts) {
    console.error(`- ${conflict.parent}: ${conflict.names.join(", ")}`);
  }
  console.error("Use one dynamic segment name per sibling route level, for example only [platform] or only [provider].");
  process.exit(1);
}

console.log("NANOFIX route parameter conflict check passed.");

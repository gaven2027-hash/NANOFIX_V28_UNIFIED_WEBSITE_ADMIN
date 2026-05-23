import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const legacyDir = path.join(projectRoot, "lib", "legacy");

function read(fileName) {
  return fs.readFileSync(path.join(legacyDir, fileName), "utf8");
}

const lines = [
  "// Auto-generated for V28 merged production package.",
  "// Source files remain in lib/legacy for editing and preview generation.",
  "",
  `export const legacyBodyHtml = ${JSON.stringify(read("body.html"))};`,
  `export const legacyBodyEnHtml = ${JSON.stringify(read("body.en.html"))};`,
  `export const legacyBodyZhHtml = ${JSON.stringify(read("body.zh.html"))};`,
  `export const legacyInlineCss = ${JSON.stringify(read("inline.css"))};`,
  `export const legacyScripts = ${JSON.stringify(JSON.parse(read("scripts.json")))} as string[];`,
  `export const legacySchemas = ${JSON.stringify(JSON.parse(read("schemas.json")))} as unknown[];`,
  ""
];

fs.writeFileSync(path.join(projectRoot, "lib", "legacy-content.ts"), lines.join("\n"), "utf8");

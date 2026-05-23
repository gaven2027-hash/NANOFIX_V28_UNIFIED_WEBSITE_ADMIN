import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "final-packages");
const stageRoot = path.join(outputRoot, "NANOFIX_NextJS_Website_V28_CTA_Admin_Consistent_CODE_PACKAGE");
const excluded = new Set([
  ".next",
  ".npm-cache",
  "node_modules",
  "release-packages",
  "final-packages"
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyTree(src, dest) {
  ensureDir(dest);
  for (const item of fs.readdirSync(src, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;
    const from = path.join(src, item.name);
    const to = path.join(dest, item.name);
    if (item.isDirectory()) {
      copyTree(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

ensureDir(stageRoot);
copyTree(projectRoot, stageRoot);
console.log(stageRoot);

import fs from "node:fs";
import path from "node:path";

const imageRoot = path.join(process.cwd(), "public", "assets", "images");
const files = fs.existsSync(imageRoot) ? fs.readdirSync(imageRoot) : [];
const rows = files.map((file) => {
  const full = path.join(imageRoot, file);
  const stat = fs.statSync(full);
  return { file, bytes: stat.size, mb: Number((stat.size / 1024 / 1024).toFixed(3)) };
}).sort((a, b) => b.bytes - a.bytes);

const total = rows.reduce((sum, row) => sum + row.bytes, 0);
console.log(JSON.stringify({ total_mb: Number((total / 1024 / 1024).toFixed(3)), files: rows }, null, 2));

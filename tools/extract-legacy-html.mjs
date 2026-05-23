import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourcePath = path.resolve(projectRoot, "..", "nanofix-source-preview", "index.html");
const legacyDir = path.join(projectRoot, "lib", "legacy");

const html = fs.readFileSync(sourcePath, "utf8");
const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) {
  throw new Error("Cannot find source body");
}

const bodyScripts = [];
let body = bodyMatch[1].replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_match, script) => {
  bodyScripts.push(script.trim());
  return "";
});

body = body.replaceAll('src="assets/images/', 'src="/assets/images/');

const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1].trim());
const inlineScripts = [...head.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1].trim())
  .filter((script) => !script.includes('"@context": "https://schema.org"'));

const schemas = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => JSON.parse(match[1]));

fs.mkdirSync(legacyDir, { recursive: true });
fs.writeFileSync(path.join(legacyDir, "body.html"), body.trim(), "utf8");
fs.writeFileSync(path.join(legacyDir, "inline.css"), styles.join("\n\n"), "utf8");
fs.writeFileSync(path.join(legacyDir, "scripts.json"), JSON.stringify([...inlineScripts, ...bodyScripts], null, 2), "utf8");
fs.writeFileSync(path.join(legacyDir, "schemas.json"), JSON.stringify(schemas, null, 2), "utf8");

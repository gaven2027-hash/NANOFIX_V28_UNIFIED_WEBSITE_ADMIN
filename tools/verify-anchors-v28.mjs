import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = [
  "lib/legacy/body.html",
  "lib/legacy/body.en.html",
  "lib/legacy/body.zh.html"
];

const aliases = {
  "inter-floor-leak-diagnosis": "inter-floor-ceiling-leak-detection",
  "concealed-pipe-detection": "concealed-water-pipe-leak-detection",
  "concealed-water-leak-detection": "concealed-water-pipe-leak-detection",
  "thermal-imaging-scan": "thermal-imaging-leak-scan",
  "drone-facade-inspection": "drone-facade-leak-inspection",
  "why-choose-nanofix": "why-choose-nanofix-guide",
  "leakage-diagnosis-guide": "water-leak-diagnosis-tips",
  "no-hacking-repair-guide": "no-hacking-repair-solutions",
  "waterproofing-material-guide": "waterproofing-materials-tech",
  "warranty-maintenance-guide": "post-repair-warranty-care",
  "knowledge-base-faq": "waterproofing-faqs",
  "latest-insights-guides": "projects-industry-insights",
  "contact-info-location": "quote-company-info"
};

function normalize(anchor) {
  const cleaned = anchor.replace(/^#/, "").trim();
  return aliases[cleaned] || cleaned;
}

let hasFailure = false;
for (const file of files) {
  const html = readFileSync(join(root, file), "utf8");
  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]));
  const anchors = new Set(
    [...html.matchAll(/href=["']#([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((anchor) => anchor && !anchor.startsWith("!") && !anchor.startsWith("/"))
  );

  const missing = [...anchors].filter((anchor) => !ids.has(normalize(anchor)));
  if (missing.length) {
    hasFailure = true;
    console.error(`NANOFIX anchor check failed in ${file}:`);
    missing.forEach((anchor) => console.error(`- #${anchor} -> #${normalize(anchor)} missing`));
  } else {
    console.log(`NANOFIX anchor check passed: ${file} (${anchors.size} anchor targets).`);
  }
}

if (hasFailure) process.exit(1);
console.log("NANOFIX anchor verification completed successfully.");

import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const legacyDir = path.join(projectRoot, "lib", "legacy");
const stableMapSrc =
  "https://www.google.com/maps?q=16%20Raffles%20Quay%2C%20Hong%20Leong%20Building%2C%20Singapore%20048581&output=embed";

const oldMapSrcPattern =
  /https:\/\/www\.google\.com\/maps\/embed\?pb=!1m18!1m12!1m3!1d3988\.819665672659!2d103\.8488094760824!3d1\.2820038621473215!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13\.1!3m3!1m2!1s0x31da190d64e320d7%3A0xa61fc6b3a0e1b212!2sHong%20Leong%20Building!5e0!3m2!1sen!2ssg!4v1700000000000!5m2!1sen!2ssg/g;

function repairHtml(html) {
  const repaired = html
    .replace(oldMapSrcPattern, stableMapSrc)
    .replaceAll('loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>', 'loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>')
    .replaceAll(
      'class="nanofix-google-map-iframe" src="https://www.google.com/maps',
      'class="nanofix-google-map-iframe" data-map-src="https://www.google.com/maps'
    )
    .replaceAll(
      'data-map-src="https://www.google.com/maps?q=16%20Raffles%20Quay%2C%20Hong%20Leong%20Building%2C%20Singapore%20048581&output=embed"',
      `data-map-src="${stableMapSrc}" src="${stableMapSrc}"`
    );

  return repaired.replace(
    new RegExp(`src="${stableMapSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+src="${stableMapSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g"),
    `src="${stableMapSrc}"`
  );
}

for (const fileName of ["body.html", "body.en.html", "body.zh.html"]) {
  const filePath = path.join(legacyDir, fileName);
  fs.writeFileSync(filePath, repairHtml(fs.readFileSync(filePath, "utf8")), "utf8");
}

console.log(`Repaired Google Map iframe sources to ${stableMapSrc}`);

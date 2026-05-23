import fs from "node:fs";

const file = "lib/legacy/body.html";
let html = fs.readFileSync(file, "utf8");

html = html.replace(
  "Home / Leak Detection / No-Hacking Repair / Waterproofing Works / Track Record & Warranty / Free Inspection & Quote",
  "Home / Leak Detection / No-Hacking Repair / Waterproofing Works / Track Record & Warranty / Get a Free Quote"
);

html = html
  .replaceAll("Free Inspection &amp; Quote", "Free Quote")
  .replaceAll("Free Inspection & Quote", "Free Quote")
  .replaceAll("免费检测与报价", "免费报价")
  .replaceAll("⭐️ Free Quote", "⭐️ Get a Free Quote")
  .replaceAll("⭐️ 免费报价", "⭐️ 获取免费报价");

html = html
  .replaceAll('data-en="⭐️ Get a Free Quote"', 'data-en="⭐️ Get a Free Quote"')
  .replaceAll('data-zh="⭐️ 获取免费报价"', 'data-zh="⭐️ 获取免费报价"');

html = html
  .replace(/data-en="Request Free Quote"/g, 'data-en="Request Free Inspection &amp; Quote"')
  .replace(/>Request Free Quote</g, ">Request Free Inspection &amp; Quote<")
  .replace(/data-zh="申请免费报价"/g, 'data-zh="申请免费检测与报价"');

html = html.replace(
  /<button([^>]*id="submitBtn"[^>]*)data-en="Request Free Inspection &amp; Quote"([^>]*)>Request Free Inspection &amp; Quote<\/button>/,
  '<button$1data-en="Submit Repair Request"$2>Submit Repair Request</button>'
);
html = html.replace(
  /<button([^>]*type="submit"[^>]*)data-en="Request Free Inspection &amp; Quote"([^>]*)>Request Free Inspection &amp; Quote<\/button>/,
  '<button$1data-en="Submit Repair Request"$2>Submit Repair Request</button>'
);
html = html.replaceAll('data-zh="申请免费检测与报价" id="submitBtn"', 'data-zh="提交报修申请" id="submitBtn"');
html = html.replaceAll('data-zh="申请免费检测与报价" type="submit"', 'data-zh="提交报修申请" type="submit"');

html = html.replace(
  /<button([^>]*id="btn-en"[^>]*) onclick="switchLanguage\('en'\)"/,
  '<button$1 data-lang-toggle="en"'
);
html = html.replace(
  /<button([^>]*id="btn-zh"[^>]*) onclick="switchLanguage\('zh'\)"/,
  '<button$1 data-lang-toggle="zh"'
);

html = html.replace(
  /onclick="scrollCarousel\('([^']+)',\s*(-?\d+)\)"/g,
  'data-carousel-target="$1" data-carousel-direction="$2"'
);

html = html.replace(/\s+onclick="[^"]*"/g, "");
html = html.replace(/\s+onerror="[^"]*"/g, "");

fs.writeFileSync(file, html, "utf8");

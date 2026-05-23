import fs from "node:fs";

const file = "lib/legacy/body.html";
let html = fs.readFileSync(file, "utf8");

html = html.replace(
  /(<button[^>]*id="submitBtn"[^>]*data-en=")[^"]+("[^>]*data-zh=")[^"]+("[^>]*>)Request Free Inspection &amp; Quote(<\/button>)/,
  "$1Submit Repair Request$2提交报修申请$3Submit Repair Request$4"
);

html = html.replace(
  /(<button[^>]*data-en=")[^"]+("[^>]*data-zh=")[^"]+("[^>]*type="submit"[^>]*>)Request Free Inspection &amp; Quote(<\/button>)/,
  "$1Submit Repair Request$2提交报修申请$3Submit Repair Request$4"
);

html = html.replace(
  /<input accept="image\/\*,video\/\*" class="w-full text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-orange-100 file:text-orange-700" multiple="" type="file"\/>/,
  '<input accept="image/*,video/*" class="w-full text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-orange-100 file:text-orange-700" multiple="" name="media_files" type="file"/>'
);

html = html.replace(
  /<textarea class="md:col-span-2 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl h-28 text-sm resize-none focus:border-orange-500 outline-none"([^>]*) placeholder="Describe the issue..."><\/textarea>/,
  '<textarea class="md:col-span-2 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl h-28 text-sm resize-none focus:border-orange-500 outline-none"$1 name="message" placeholder="Describe the issue..."></textarea>'
);

fs.writeFileSync(file, html, "utf8");

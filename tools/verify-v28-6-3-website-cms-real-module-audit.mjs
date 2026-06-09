import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  websiteManagementApi: "app/api/admin/website-management/route.ts",
  cmsBlocksApi: "app/api/admin/cms/blocks/route.ts",
  homePage: "app/page.tsx",
  adminDynamicPage: "app/admin/[module]/page.tsx",
  adminPage: "app/admin/page.tsx",
};

const requiredMarkers = [
  {
    id: "api_admin_website_management_exists",
    file: files.websiteManagementApi,
    markers: ["website_pages", "website_content_blocks", "audit_logs"],
    severity: "P0",
    description: "Website Management API should connect real CMS tables and audit logs.",
  },
  {
    id: "api_admin_cms_blocks_exists",
    file: files.cmsBlocksApi,
    markers: ["website_content_blocks", "GET", "POST"],
    severity: "P0",
    description: "CMS blocks API should support real read/write for content blocks.",
  },
  {
    id: "public_home_has_cms_bridge",
    file: files.homePage,
    markers: ["website", "cms"],
    severity: "P1",
    description: "Public website should have a CMS bridge or documented CMS mapping.",
  },
  {
    id: "admin_ui_has_website_management",
    file: files.adminDynamicPage,
    markers: ["Website Management"],
    severity: "P1",
    description: "Admin UI should expose Website Management workspace.",
  },
];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

function findFiles(dir, regex) {
  const out = [];
  const start = path.join(root, dir);
  if (!fs.existsSync(start)) return out;

  const walk = (current) => {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        if (["node_modules", ".next", ".git"].includes(item.name)) continue;
        walk(full);
      } else if (regex.test(full.replaceAll("\\", "/"))) {
        out.push(path.relative(root, full).replaceAll("\\", "/"));
      }
    }
  };

  walk(start);
  return out.sort();
}

function checkMarker(item) {
  const content = read(item.file);
  if (!content) {
    return {
      id: item.id,
      ok: false,
      severity: item.severity,
      file: item.file,
      description: item.description,
      missing: ["FILE_MISSING"],
    };
  }

  const missing = item.markers.filter((m) => !content.includes(m));

  return {
    id: item.id,
    ok: missing.length === 0,
    severity: item.severity,
    file: item.file,
    description: item.description,
    missing,
  };
}

const cmsApiFiles = findFiles("app/api", /(cms|website-management|website|content|media|seo|schema).*route\.ts$/i);
const cmsUiFiles = findFiles("app", /(website|cms|content|media|seo|schema|guide|admin).*\.(tsx|ts)$/i);
const migrationFiles = findFiles("supabase/migrations", /.*\.sql$/i);

const migrationContent = migrationFiles.map((f) => [f, read(f)]);

const schemaMarkers = [
  "website_pages",
  "website_content_blocks",
  "website_media_assets",
  "website_page_versions",
  "audit_logs",
  "published",
  "draft",
];

const schemaPresence = schemaMarkers.map((marker) => {
  const matches = migrationContent
    .filter(([, content]) => content.includes(marker))
    .map(([file]) => file);

  return {
    marker,
    ok: matches.length > 0,
    files: matches.slice(0, 8),
  };
});

const staticRiskFiles = [
  "app/page.tsx",
  "components",
  "lib",
];

const riskyPatterns = [
  { id: "localStorage", pattern: "localStorage" },
  { id: "fake_success", pattern: "fake success" },
  { id: "mock_data", pattern: "mock" },
  { id: "demo_data", pattern: "demo" },
  { id: "placeholder", pattern: "placeholder" },
];

const riskFindings = [];

for (const rel of cmsUiFiles.concat(cmsApiFiles)) {
  const content = read(rel);
  for (const risk of riskyPatterns) {
    if (content.toLowerCase().includes(risk.pattern.toLowerCase())) {
      riskFindings.push({
        file: rel,
        risk: risk.id,
      });
    }
  }
}

const markerResults = requiredMarkers.map(checkMarker);
const findings = [];

for (const r of markerResults) {
  if (!r.ok) findings.push(r);
}

for (const s of schemaPresence) {
  if (!s.ok) {
    findings.push({
      id: `schema_missing_${s.marker}`,
      ok: false,
      severity: s.marker === "audit_logs" ? "P0" : "P1",
      file: "supabase/migrations",
      description: `CMS schema marker missing: ${s.marker}`,
      missing: [s.marker],
    });
  }
}

const report = {
  ok: findings.filter((f) => f.severity === "P0").length === 0,
  verifier: "verify-v28-6-3-website-cms-real-module-audit",
  generated_at: new Date().toISOString(),
  branch: process.env.GITHUB_REF_NAME || null,
  checked: {
    required_markers: markerResults.length,
    cms_api_files: cmsApiFiles.length,
    cms_ui_files: cmsUiFiles.length,
    migration_files: migrationFiles.length,
  },
  cms_api_files: cmsApiFiles,
  cms_ui_files: cmsUiFiles.slice(0, 80),
  schema_presence: schemaPresence,
  marker_results: markerResults,
  risk_findings: riskFindings.slice(0, 80),
  findings,
};

fs.writeFileSync(
  path.join(root, "V28_6_3_WEBSITE_CMS_REAL_MODULE_AUDIT_REPORT.json"),
  JSON.stringify(report, null, 2)
);

const md = [
  "# NANOFIX V28.6.3 Website CMS Real Module Audit Report",
  "",
  `- Generated at: ${report.generated_at}`,
  `- Verifier: ${report.verifier}`,
  `- Overall: ${report.ok ? "PASS" : "FAIL"}`,
  "",
  "## Checked",
  "",
  `- Required marker checks: ${report.checked.required_markers}`,
  `- CMS/API candidate files: ${report.checked.cms_api_files}`,
  `- CMS/UI candidate files: ${report.checked.cms_ui_files}`,
  `- Migration files scanned: ${report.checked.migration_files}`,
  "",
  "## Schema Presence",
  "",
  "| Marker | Result | Files |",
  "|---|---|---|",
  ...schemaPresence.map((s) => `| ${s.marker} | ${s.ok ? "PASS" : "FAIL"} | ${s.files.join("<br>")} |`),
  "",
  "## Required Marker Results",
  "",
  "| ID | Result | Severity | File | Missing |",
  "|---|---|---:|---|---|",
  ...markerResults.map((r) => `| ${r.id} | ${r.ok ? "PASS" : "FAIL"} | ${r.severity} | ${r.file} | ${(r.missing || []).join(", ")} |`),
  "",
  "## Risk Findings",
  "",
  report.risk_findings.length
    ? report.risk_findings.map((r) => `- ${r.risk}: ${r.file}`).join("\n")
    : "- None detected by simple marker scan.",
  "",
  "## Findings",
  "",
  findings.length
    ? findings.map((f) => `- **${f.severity} ${f.id}**: ${f.description} (${f.file}) missing: ${(f.missing || []).join(", ")}`).join("\n")
    : "- No blocking findings from this initial verifier.",
  "",
].join("\n");

fs.writeFileSync(
  path.join(root, "V28_6_3_WEBSITE_CMS_REAL_MODULE_AUDIT_REPORT.md"),
  md
);

console.log(JSON.stringify({
  ok: report.ok,
  verifier: report.verifier,
  findings: findings.length,
  reportJson: "V28_6_3_WEBSITE_CMS_REAL_MODULE_AUDIT_REPORT.json",
  reportMd: "V28_6_3_WEBSITE_CMS_REAL_MODULE_AUDIT_REPORT.md",
}, null, 2));

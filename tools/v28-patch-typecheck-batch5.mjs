#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'app', 'api', 'admin', 'customer-center', 'documents', 'route.ts');

if (!fs.existsSync(target)) {
  console.error('Missing app/api/admin/customer-center/documents/route.ts');
  process.exit(1);
}

let text = fs.readFileSync(target, 'utf8');
const before = text;

const queryType = `type CustomerDocumentQuery = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
  update: (patch: Record<string, unknown>) => {
    eq: (column: string, value: string) => {
      select: (columns: string) => {
        single: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

`;

if (!text.includes('type CustomerDocumentQuery =')) {
  if (text.includes("export const dynamic = 'force-dynamic';")) {
    text = text.replace("export const dynamic = 'force-dynamic';\n\n", "export const dynamic = 'force-dynamic';\n\n" + queryType);
  } else {
    const importEnd = text.lastIndexOf("import ");
    if (importEnd >= 0) {
      const lineEnd = text.indexOf('\n', importEnd);
      text = text.slice(0, lineEnd + 1) + '\n' + queryType + text.slice(lineEnd + 1);
    } else {
      text = queryType + text;
    }
  }
}

if (text !== before) {
  fs.writeFileSync(target, text);
  console.log('PATCH app/api/admin/customer-center/documents/route.ts');
} else {
  console.log('SKIP no change app/api/admin/customer-center/documents/route.ts');
}

console.log('Typecheck batch 5 patch completed.');

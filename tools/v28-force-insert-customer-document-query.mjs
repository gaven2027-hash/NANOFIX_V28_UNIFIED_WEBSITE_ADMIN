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

const queryType = `
type CustomerDocumentQuery = {
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
  const firstTypeIndex = text.indexOf('type ');
  if (firstTypeIndex >= 0) {
    text = text.slice(0, firstTypeIndex) + queryType + text.slice(firstTypeIndex);
  } else {
    const dynamicIndex = text.indexOf("export const dynamic = 'force-dynamic';");
    if (dynamicIndex >= 0) {
      const insertAt = text.indexOf('\n', dynamicIndex);
      text = text.slice(0, insertAt + 1) + queryType + text.slice(insertAt + 1);
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

console.log('Forced CustomerDocumentQuery insertion completed.');

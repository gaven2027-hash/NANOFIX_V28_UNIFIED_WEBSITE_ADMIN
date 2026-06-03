#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function patchFile(relativePath, mutator) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    console.log(`SKIP missing ${relativePath}`);
    return 0;
  }
  const before = fs.readFileSync(file, 'utf8');
  const after = mutator(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log(`PATCH ${relativePath}`);
    return 1;
  }
  console.log(`SKIP no change ${relativePath}`);
  return 0;
}

let changes = 0;

changes += patchFile('app/api/admin/dashboard/route.ts', (text) => {
  const pattern = /const rows = \(Array\.isArray\(data\) \? data\.filter\(isRow\) : \[\]\)\.map\(\(row\) => \(\{\s*\.\.\.row,\s*_dashboard_href: rowHref\(spec, row\)\s*\}\)\);/s;
  const replacement = `const rawRows: Row[] = Array.isArray(data) ? (data as unknown[]).filter(isRow) : [];
    const rows = rawRows.map((row) => ({
      ...row,
      _dashboard_href: rowHref(spec, row)
    }));`;
  return text.replace(pattern, replacement);
});

changes += patchFile('app/api/admin/customer-center/documents/route.ts', (text) => {
  let out = text;
  if (!out.includes('type CustomerDocumentQuery =')) {
    out = out.replace(
      'type CustomerDocumentType =',
      `type CustomerDocumentQuery = {
  select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }> } };
  update: (patch: Record<string, unknown>) => { eq: (column: string, value: string) => { select: (columns: string) => { single: () => Promise<{ data: unknown; error: { message: string } | null }> } } };
};

type CustomerDocumentType =`
    );
  }
  out = out.replaceAll('(supabase.from(table) as any)', '(supabase.from(table) as unknown as CustomerDocumentQuery)');
  return out;
});

changes += patchFile('app/api/admin/website-management/route.ts', (text) => text.replace(
  'type QueryBuilder = any;',
  `type QueryBuilder = {
  in: (column: string, values: readonly unknown[]) => QueryBuilder;
  not: (column: string, operator: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => { limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }> };
};`
).replace(
  'let query = supabase.from(spec.table).select(spec.select);',
  'let query = supabase.from(spec.table).select(spec.select) as unknown as QueryBuilder;'
));

console.log(`Typecheck/lint batch 4 patch completed. Changed files: ${changes}`);

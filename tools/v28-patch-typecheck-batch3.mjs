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

changes += patchFile('app/api/admin/customer-center/documents/route.ts', (text) => text.replace(
  'const { data: before } = await supabase.from(table).select(select).eq(idColumn, id).maybeSingle();',
  'const { data: before } = await (supabase.from(table) as any).select(select).eq(idColumn, id).maybeSingle();'
));

changes += patchFile('app/api/admin/customers/merge-center/route.ts', (text) => {
  let out = text;
  out = out.replace('const { count, error } = await supabase', 'const { data: updatedRows, error } = await supabase');
  out = out.replace(".select('*', { count: 'exact', head: true });", ".select('customer_id');");
  out = out.replace(
    'updateResults[table] = error ? { ok: false, error: error.message } : { ok: true, count: count ?? 0 };',
    'const count = Array.isArray(updatedRows) ? updatedRows.length : 0;\n    updateResults[table] = error ? { ok: false, error: error.message } : { ok: true, count };'
  );
  return out;
});

changes += patchFile('app/api/admin/dashboard/route.ts', (text) => text.replace(
  `    const rows = (Array.isArray(data) ? data.filter(isRow) : []).map((row) => ({\n      ...row,\n      _dashboard_href: rowHref(spec, row)\n    }));`,
  `    const rawRows: Row[] = Array.isArray(data) ? (data as unknown[]).filter(isRow) : [];\n    const rows = rawRows.map((row) => ({\n      ...row,\n      _dashboard_href: rowHref(spec, row)\n    }));`
));

changes += patchFile('app/api/admin/service-operations/route.ts', (text) => {
  let out = text;
  out = out.replace(
    "objectId: typeof (data as Record<string, unknown> | null)?.[spec.idColumn] === 'string' ? String((data as Record<string, unknown>)[spec.idColumn]) : undefined,",
    "objectId: typeof (data as unknown as Record<string, unknown> | null)?.[spec.idColumn] === 'string' ? String((data as unknown as Record<string, unknown>)[spec.idColumn]) : undefined,"
  );
  out = out.replaceAll('after: data as Record<string, unknown>,', 'after: data as unknown as Record<string, unknown>,');
  return out;
});

console.log(`Typecheck batch 3 patch completed. Changed files: ${changes}`);

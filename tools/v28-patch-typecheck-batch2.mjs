#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

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
    console.log(`PATCH ${rel(file)}`);
    return 1;
  }
  console.log(`SKIP no change ${relativePath}`);
  return 0;
}

function replaceAll(text, pairs) {
  let out = text;
  for (const [from, to] of pairs) out = out.split(from).join(to);
  return out;
}

let changes = 0;

changes += patchFile('app/api/admin/customer-center/documents/route.ts', (text) => text.replace(
  'const { data, error } = await supabase.from(table).update(patch).eq(idColumn, id).select(select).single();',
  'const { data, error } = await (supabase.from(table) as any).update(patch).eq(idColumn, id).select(select).single();'
));

changes += patchFile('app/api/admin/customers/merge-center/route.ts', (text) => text.replace(
  `    const { count, error } = await supabase\n      .from(table)\n      .update({ customer_id: primaryCustomerId, updated_at: now })\n      .in('customer_id', duplicateCustomerIds)\n      .select('*', { count: 'exact', head: true });\n    updateResults[table] = error ? { ok: false, error: error.message } : { ok: true, count: count ?? 0 };`,
  `    const { data: updatedRows, error } = await supabase\n      .from(table)\n      .update({ customer_id: primaryCustomerId, updated_at: now })\n      .in('customer_id', duplicateCustomerIds)\n      .select('customer_id');\n    const count = Array.isArray(updatedRows) ? updatedRows.length : 0;\n    updateResults[table] = error ? { ok: false, error: error.message } : { ok: true, count };`
));

changes += patchFile('app/api/admin/dashboard/route.ts', (text) => text.replace(
  `    const rows = (Array.isArray(data) ? data.filter(isRow) : []).map((row) => ({\n      ...row,\n      _dashboard_href: rowHref(spec, row)\n    }));`,
  `    const rawRows: Row[] = Array.isArray(data) ? (data as unknown[]).filter(isRow) : [];\n    const rows = rawRows.map((row) => ({\n      ...row,\n      _dashboard_href: rowHref(spec, row)\n    }));`
));

changes += patchFile('app/api/admin/website-management/route.ts', (text) => text
  .replace('type QueryBuilder = ReturnType<ReturnType<typeof createAdminClient>[\'from\']>;', 'type QueryBuilder = any;')
  .replace(
    `    const rows = (Array.isArray(data) ? data.filter(isRow) : []).map((row) => ({ ...row, _website_href: rowHref(spec, row) }));`,
    `    const rawRows: Row[] = Array.isArray(data) ? (data as unknown[]).filter(isRow) : [];\n    const rows = rawRows.map((row) => ({ ...row, _website_href: rowHref(spec, row) }));`
  )
);

changes += patchFile('app/api/admin/service-operations/inspections/route.ts', (text) => text
  .replace('sourceId: string; title: string;', 'sourceId: string | null; title: string;')
  .replace('relatedObjectId: string; customerId?: string | null;', 'relatedObjectId: string | null; customerId?: string | null;')
);

const idCastPatches = {
  'app/api/admin/service-operations/invoice-pdfs/route.ts': [
    ['loadInvoice(invoiceId)', 'loadInvoice(invoiceId as string)'],
    ['safePath(invoiceId)', 'safePath(invoiceId as string)'],
    ['settings.setting_id ?? null', '(settings as { setting_id?: string | null }).setting_id ?? null']
  ],
  'app/api/admin/service-operations/quotation-pdfs/route.ts': [
    ['loadQuotation(quotationId)', 'loadQuotation(quotationId as string)'],
    ['safePath(quotationId)', 'safePath(quotationId as string)'],
    ['settings.setting_id ?? null', '(settings as { setting_id?: string | null }).setting_id ?? null']
  ],
  'app/api/admin/service-operations/warranty-pdfs/route.ts': [
    ['loadWarranty(warrantyId)', 'loadWarranty(warrantyId as string)'],
    ['safePath(warrantyId)', 'safePath(warrantyId as string)'],
    ['settings.setting_id ?? null', '(settings as { setting_id?: string | null }).setting_id ?? null']
  ],
  'app/api/admin/service-operations/warranty-pdf/route.ts': [
    ['loadWarranty(warrantyId)', 'loadWarranty(warrantyId as string)'],
    ['nextWarrantyVersion(warrantyId)', 'nextWarrantyVersion(warrantyId as string)']
  ],
  'app/api/admin/service-operations/payment-checkout-sessions/route.ts': [
    ['loadPaymentIntent(paymentIntentId)', 'loadPaymentIntent(paymentIntentId as string)']
  ],
  'app/api/admin/service-operations/warranty-auto-generation/route.ts': [
    ['loadJob(jobId)', 'loadJob(jobId as string)'],
    ['loadLatestQuotation(jobId)', 'loadLatestQuotation(jobId as string)'],
    ['loadLatestInvoice(jobId)', 'loadLatestInvoice(jobId as string)'],
    ['warrantyNo(jobId)', 'warrantyNo(jobId as string)']
  ],
  'app/api/customer-portal/quote-acceptance/route.ts': [
    ['loadVisibleOwnedQuotation(auth.actor.profileId, quotationId)', 'loadVisibleOwnedQuotation(auth.actor.profileId, quotationId as string)'],
    ['latestVisibleQuotationPdf(quotationId)', 'latestVisibleQuotationPdf(quotationId as string)'],
    ['createTaskAndInbox({ quotationId,', 'createTaskAndInbox({ quotationId: quotationId as string,'],
    ['queueCustomerConfirmation({ customerId, quotationId,', 'queueCustomerConfirmation({ customerId, quotationId: quotationId as string,']
  ],
  'app/api/customer-portal/service-requests/route.ts': [
    ['warrantyBelongsToCustomer(relatedWarrantyId,', 'warrantyBelongsToCustomer(relatedWarrantyId as string,']
  ]
};

for (const [file, pairs] of Object.entries(idCastPatches)) {
  changes += patchFile(file, (text) => replaceAll(text, pairs));
}

changes += patchFile('app/api/admin/service-operations/route.ts', (text) => text
  .replace(
    "objectId: typeof data?.[spec.idColumn] === 'string' ? data[spec.idColumn] : undefined,",
    "objectId: typeof (data as Record<string, unknown> | null)?.[spec.idColumn] === 'string' ? String((data as Record<string, unknown>)[spec.idColumn]) : undefined,"
  )
  .replace('after: data as Record<string, unknown>,', 'after: data as unknown as Record<string, unknown>,')
);

changes += patchFile('app/api/customer-portal/upload-assets/route.ts', (text) => text.replace(
  '}).throwOnError().catch(() => undefined);',
  '}).throwOnError().then(() => undefined, () => undefined);'
));

console.log(`Typecheck batch 2 patch completed. Changed files: ${changes}`);

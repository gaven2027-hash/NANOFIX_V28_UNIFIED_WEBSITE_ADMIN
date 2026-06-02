import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}

export async function GET() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return json({ ok: true, skipped: true, rows: [], error: 'Supabase service role is not configured.' });

  const { data, error } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,portal_status,created_source,created_at')
    .in('portal_status', ['unclaimed', 'claim_pending'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return json({ ok: false, rows: [], error: error.message }, 500);
  return json({ ok: true, rows: data || [] });
}

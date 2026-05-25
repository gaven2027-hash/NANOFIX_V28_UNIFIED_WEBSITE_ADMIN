import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const publicColumns = 'platform,label,url,icon_key,display_order,placement,open_new_tab,rel_attr';
const allowedPlacements = ['header', 'footer', 'floating', 'contact_page', 'all'];

function normalizePlacement(value: string | null) {
  const placement = String(value || 'footer').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return allowedPlacements.includes(placement) ? placement : 'footer';
}

export async function GET(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase server client is not configured.' }, { status: 503 });

  const url = new URL(request.url);
  const placement = normalizePlacement(url.searchParams.get('placement'));

  const { data, error } = await supabase
    .from('website_social_links')
    .select(publicColumns)
    .eq('is_active', true)
    .in('placement', [placement, 'all'])
    .not('url', 'is', null)
    .order('display_order', { ascending: true })
    .order('platform', { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, placement, links: data || [] });
}

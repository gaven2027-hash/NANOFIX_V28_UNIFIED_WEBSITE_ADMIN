import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_review_links')
    .select('review_link_id,provider_key,label_en,label_zh,review_url,help_text_en,help_text_zh,open_in_new_tab,display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) return json({ ok: false, error: error.message, links: [] }, 200);
  return json({ ok: true, links: data || [] });
}

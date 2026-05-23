export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, cleanText, getClientIp } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'content_admin', 'operations_admin']);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('content_drafts')
    .select('content_id,module,platform,title,approval_status,publish_status,scheduled_at,published_at,created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, drafts: data, data_loop: 'prompt -> content_drafts(draft) -> ai_logs -> admin review -> schedule/publish' });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'content_admin', 'operations_admin']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('create_ai_draft_tx', {
    p_module: cleanText(body.module, 60) ?? 'website',
    p_platform: cleanText(body.platform, 60),
    p_prompt: cleanText(body.prompt, 2000) ?? '',
    p_title: cleanText(body.title, 180) ?? 'AI Draft',
    p_body_json: body.body_json ?? {},
    p_actor_id: auth.actor.profileId,
    p_actor_role: auth.role,
    p_ip: getClientIp(request)
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, draft: data, guardrail: 'AI drafts are saved as draft only. Human approval is required before publishing.' });
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireWebhookSecret, cleanText } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';

const supportedPlatforms = ['whatsapp', 'google_my_business', 'website_live_chat', 'facebook', 'instagram', 'tiktok', 'youtube', 'xiaohongshu'];

export async function POST(request: NextRequest) {
  const webhookAuth = requireWebhookSecret(request, 'SOCIAL_WEBHOOK_SECRET');
  if (!webhookAuth.ok) return webhookAuth.response;

  const body = await request.json().catch(() => ({}));
  const platform = supportedPlatforms.includes(body.platform) ? body.platform : 'website_live_chat';
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('ingest_social_message_tx', {
    p_platform: platform,
    p_sender_name: cleanText(body.sender_name, 120),
    p_sender_contact: cleanText(body.sender_contact, 120),
    p_message_text: cleanText(body.message, 2000) ?? '',
    p_payload: body
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, social_ingestion: data, data_loop: 'social_messages -> unified_intake -> leads -> audit_logs' });
}

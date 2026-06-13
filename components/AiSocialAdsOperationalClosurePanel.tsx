'use client';

import { useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Result = { label: string; ok: boolean; status?: number; message: string };

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

const defaultDraft = {
  module: 'website_cms',
  channel: 'website',
  title: 'No-hacking leak repair FAQ draft',
  prompt: 'Create a bilingual website FAQ draft for no-hacking leak repair and warranty care.',
  draft_body: 'Draft pending review: explain no-hacking leak diagnosis, repair options, warranty care and call-to-action. / 草稿待审核：说明免敲漏水检测、维修方案、保修维护和咨询行动。',
  target_url: '/guide/no-hacking-repair-solutions'
};

const defaultSocialLead = {
  platform: 'instagram',
  contact_name: 'Social Enquiry',
  phone: '+65 8000 0000',
  email: '',
  address: 'Singapore',
  postal_code: '',
  issue_type: 'Social media leak repair enquiry',
  message: 'Customer asked for no-hacking toilet leak repair quote from social inbox.',
  source_message_id: 'SOCIAL-DEMO-001'
};

const defaultPaidLead = {
  provider: 'google',
  campaign_ref: 'NANOFIX-DEMO-CAMPAIGN',
  landing_page: '/get-a-free-quote',
  contact_name: 'Paid Landing Lead',
  phone: '+65 8000 0001',
  email: '',
  address: 'Singapore',
  postal_code: '',
  issue_type: 'Paid campaign leak repair enquiry',
  message: 'Customer submitted interest from a paid landing page and needs service operations qualification.'
};

export function AiSocialAdsOperationalClosurePanel() {
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  async function run(label: string, url: string, payload: Record<string, unknown>) {
    setBusy(label);
    setResult(null);
    try {
      const { response, data } = await postJson(url, payload);
      setResult({
        label,
        ok: Boolean(data?.ok ?? response.ok),
        status: response.status,
        message: data?.next_step || data?.error || data?.warnings?.join('; ') || (response.ok ? 'Operational bridge recorded.' : 'Request failed.')
      });
    } catch (error) {
      setResult({ label, ok: false, message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setBusy('');
    }
  }

  return (
    <SectionCard
      title="V28.9 AI / Social / Ads Operational Closure / 运营闭环"
      subtitle="Create AI drafts, convert social enquiries into leads/service requests, and attribute paid campaign leads without any direct public publish or paid activation. / 创建 AI 草稿、把社媒询盘转成线索/工单、记录广告线索归因；不直接公开发布，也不直接启用付费投放。"
    >
      <div id="v28-9-ai-social-ads-operational-closure" className="scroll-mt-32 space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <button type="button" onClick={() => run('AI draft', '/api/ai/content-drafts', defaultDraft)} disabled={Boolean(busy)} className="rounded-3xl bg-activeBlue p-4 text-left text-white shadow-soft hover:bg-blue-700 disabled:opacity-60">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-black">Create AI Draft</span><Badge tone="blue">Review Gate</Badge></div>
            <p className="mt-2 text-xs font-bold text-white/80">Writes content draft + AI log + audit record for human approval.</p>
          </button>
          <button type="button" onClick={() => run('Social conversion', '/api/social/messages/convert', defaultSocialLead)} disabled={Boolean(busy)} className="rounded-3xl bg-slate-900 p-4 text-left text-white shadow-soft hover:bg-slate-800 disabled:opacity-60">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-black">Convert Social Enquiry</span><Badge tone="green">Lead + SR</Badge></div>
            <p className="mt-2 text-xs font-bold text-white/80">Creates unified intake, lead and service request for operations review.</p>
          </button>
          <button type="button" onClick={() => run('Paid attribution', '/api/ads/leads/attribute', defaultPaidLead)} disabled={Boolean(busy)} className="rounded-3xl bg-amber-500 p-4 text-left text-white shadow-soft hover:bg-amber-600 disabled:opacity-60">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-black">Attribute Paid Lead</span><Badge tone="amber">ROI Path</Badge></div>
            <p className="mt-2 text-xs font-bold text-white/90">Connects campaign source to lead/service request for ROI tracking.</p>
          </button>
        </div>

        <div className="rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-6 text-blue-950 ring-1 ring-blue-100">
          Approval rule / 审批规则：AI drafts stay pending review; social content stays in schedule approval; paid campaign actions record bridge evidence only and do not activate external spend.
        </div>

        {result ? (
          <div className={`rounded-2xl p-4 text-xs font-bold leading-6 ring-1 ${result.ok ? 'bg-emerald-50 text-emerald-950 ring-emerald-200' : 'bg-amber-50 text-amber-950 ring-amber-200'}`}>
            {result.label} · HTTP {result.status || '-'} · {result.message}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

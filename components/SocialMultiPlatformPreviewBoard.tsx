'use client';

import { useMemo, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { SocialMaterialPackBuilder, defaultSocialMaterialPack } from './SocialMaterialPackBuilder';

type Row = Record<string, unknown>;

export type SocialPreviewPlatform = {
  platform: string;
  label: string;
  zh: string;
  aspect: string;
  surface: string;
  bodyLabel: string;
  helper: string;
  defaultHashtags: string[];
};

export const SOCIAL_PREVIEW_PLATFORMS: SocialPreviewPlatform[] = [
  { platform: 'facebook', label: 'FB Preview', zh: 'Facebook 预览', aspect: '4:5 / 1:1', surface: 'Feed Post / Reel', bodyLabel: 'Post Caption', helper: 'Local trust, service proof, CTA and link preview.', defaultHashtags: ['#NANOFIX', '#SingaporeWaterproofing', '#LeakRepair'] },
  { platform: 'tiktok', label: 'TikTok Preview', zh: 'TikTok 预览', aspect: '9:16', surface: 'Short Video', bodyLabel: 'Title + Caption', helper: 'Hook, fast subtitles, short pain-point CTA.', defaultHashtags: ['#sgrenovation', '#leakrepair', '#hdb'] },
  { platform: 'youtube_shorts', label: 'YouTube Shorts Preview', zh: 'YouTube Shorts 预览', aspect: '9:16', surface: 'Shorts', bodyLabel: 'Title + Description', helper: 'Searchable title, description and service CTA.', defaultHashtags: ['#shorts', '#waterproofing', '#singapore'] },
  { platform: 'instagram', label: 'Instagram Preview', zh: 'Instagram 预览', aspect: '4:5 / 9:16', surface: 'Reel / Post / Story', bodyLabel: 'Caption', helper: 'Visual-first caption, emojis, hashtags and CTA.', defaultHashtags: ['#nanofixsg', '#waterproofing', '#homerepair'] },
  { platform: 'xiaohongshu', label: 'Xiaohongshu Preview', zh: '小红书预览', aspect: '3:4 / 4:5', surface: 'Note / Video Note', bodyLabel: '种草正文', helper: 'Problem story, local lifestyle tone and Chinese hashtags.', defaultHashtags: ['#新加坡漏水', '#防水维修', '#无拆砖维修'] },
  { platform: 'forum', label: 'Forum Preview', zh: '论坛预览', aspect: 'Text + Images', surface: 'Forum Thread', bodyLabel: 'Thread Body', helper: 'Long-form problem/solution post for forums and community boards.', defaultHashtags: ['NANOFIX', 'Singapore', 'Waterproofing'] },
  { platform: 'google_business_profile', label: 'Google Business Profile Preview', zh: 'Google 商家资料预览', aspect: 'Local Post', surface: 'GBP Update', bodyLabel: 'Business Update', helper: 'Local SEO post with service area and contact action.', defaultHashtags: ['Waterproofing Singapore', 'Leak Detection'] },
  { platform: 'linkedin', label: 'LinkedIn Preview', zh: 'LinkedIn 预览', aspect: '1.91:1 / 1:1', surface: 'Company Update', bodyLabel: 'Professional Caption', helper: 'Commercial proof, B2B credibility and portfolio CTA.', defaultHashtags: ['#FacilitiesManagement', '#Waterproofing', '#SingaporeBusiness'] },
  { platform: 'x_twitter', label: 'X / Twitter Preview', zh: 'X / Twitter 预览', aspect: 'Text / 16:9 image', surface: 'Post / Thread', bodyLabel: 'Post Text', helper: 'Short public update, complaint monitoring response draft, announcement or thread handoff.', defaultHashtags: ['#NANOFIX', '#Singapore', '#Waterproofing'] },
  { platform: 'carousell_services', label: 'Carousell Services Preview', zh: 'Carousell 服务预览', aspect: 'Listing + Images', surface: 'Service Listing', bodyLabel: 'Listing Description', helper: 'Service listing draft with price note, service area, before/after photos and WhatsApp CTA.', defaultHashtags: ['NANOFIX', 'Leak Repair', 'Singapore Services'] },
  { platform: 'seedly_community', label: 'Seedly Community Preview', zh: 'Seedly 社区预览', aspect: 'Question / Answer', surface: 'Community Answer', bodyLabel: 'Community Reply', helper: 'Helpful answer draft for cost, maintenance, property and repair-budget discussions, not hard advertising.', defaultHashtags: ['NANOFIX', 'Home Maintenance', 'Singapore'] },
  { platform: 'whatsapp_channel', label: 'WhatsApp Channel Preview', zh: 'WhatsApp 频道预览', aspect: 'Mobile Message', surface: 'Channel Update', bodyLabel: 'Broadcast Message', helper: 'Short direct update for subscribers, no auto-send by AI.', defaultHashtags: ['NANOFIX', 'Leak Repair'] },
  { platform: 'telegram_channel', label: 'Telegram Channel Preview', zh: 'Telegram 频道预览', aspect: 'Mobile Message', surface: 'Channel Post', bodyLabel: 'Channel Message', helper: 'Compact community update with link and CTA.', defaultHashtags: ['NANOFIX', 'Singapore'] },
  { platform: 'website_blog', label: 'Website Blog Preview', zh: '网站博客预览', aspect: 'Article', surface: 'Website Blog / Guide', bodyLabel: 'Article Summary', helper: 'SEO/AEO article preview for website CMS and internal linking.', defaultHashtags: ['SEO', 'AEO', 'NANOFIX'] }
];

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(approved|published|connected)/i.test(s)) return 'green';
  if (/(draft|pending|scheduled)/i.test(s)) return 'amber';
  if (/(rejected|failed|cancelled|disabled|error)/i.test(s)) return 'red';
  return 'blue';
}

function safePreviewText(value: unknown, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function findDraftForPlatform(drafts: Row[], platform: string) {
  return drafts.find((draft) => String(draft.platform || '') === platform) || null;
}

function buildPreviewBody(draft: Row | null, target: SocialPreviewPlatform) {
  if (draft) return safePreviewText(draft.body, `${target.helper} Draft content is ready for admin review.`);
  return `No ${target.label} draft has been generated yet. Upload/source one material pack, select this platform, then generate a platform-specific draft for review.`;
}

function parseJsonInput(value: string) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return null;
  }
}

export function SocialMultiPlatformPreviewBoard({
  drafts,
  onRefresh,
  onOpenDraft,
  onCreateSnapshot
}: {
  drafts: Row[];
  onRefresh: () => void | Promise<void>;
  onOpenDraft: (draft: Row) => void;
  onCreateSnapshot: (draft: Row) => void | Promise<void>;
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(SOCIAL_PREVIEW_PLATFORMS.map((item) => item.platform));
  const [baseTitle, setBaseTitle] = useState('NANOFIX no-hacking leak repair proof');
  const [baseBody, setBaseBody] = useState('Upload NANOFIX source videos, video clips, images and optional reference videos. AI creates platform-specific drafts only; admin review is required before scheduling or publishing.');
  const [serviceType, setServiceType] = useState('No-Hacking Leak Repair');
  const [sourceMediaJson, setSourceMediaJson] = useState(JSON.stringify(defaultSocialMaterialPack, null, 2));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const cards = useMemo(() => SOCIAL_PREVIEW_PLATFORMS.map((target) => ({ target, draft: findDraftForPlatform(drafts, target.platform) })), [drafts]);

  function togglePlatform(platform: string) {
    setSelectedPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
  }

  async function createPlatformDrafts() {
    const sourceMedia = parseJsonInput(sourceMediaJson);
    if (sourceMedia === null) {
      setMessage('Source Media JSON is invalid. / 素材 JSON 格式错误。');
      return;
    }
    if (!selectedPlatforms.length) {
      setMessage('Select at least one platform. / 请至少选择一个平台。');
      return;
    }
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/social-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_multi_platform_drafts',
        platforms: selectedPlatforms,
        base_title: baseTitle,
        base_body: baseBody,
        service_type: serviceType,
        source_media: sourceMedia
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Failed to generate platform drafts. / 生成平台草稿失败。');
      return;
    }
    setMessage(`Generated ${json.drafts?.length || 0} platform drafts. / 已生成 ${json.drafts?.length || 0} 个平台草稿。`);
    await onRefresh();
  }

  return (
    <div className="space-y-5">
      <SectionCard title="One Material Pack → Multi-Platform Drafts / 一次素材生成多平台草稿" subtitle="Separate NANOFIX source videos, reference videos and direct video clip uploads before generating platform drafts. AI cannot auto-publish. / 先明确区分素材视频、参考视频和可直接上传的视频片段，再生成多平台草稿；AI 默认不能自动发布。">
        {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="md:col-span-2"><span className={labelClass}>Base Title / 基础标题</span><input className={inputClass} value={baseTitle} onChange={(event) => setBaseTitle(event.target.value)} /></label>
            <label><span className={labelClass}>Service Type / 服务类型</span><input className={inputClass} value={serviceType} onChange={(event) => setServiceType(event.target.value)} /></label>
            <label><span className={labelClass}>AI Publish Rule / AI 发布规则</span><input className={inputClass} value="Draft only, admin approval required / 只保存草稿，必须人工审核" readOnly /></label>
            <label className="md:col-span-2"><span className={labelClass}>Base Body / 基础文案</span><textarea className={`${inputClass} min-h-28`} value={baseBody} onChange={(event) => setBaseBody(event.target.value)} /></label>
            <div className="md:col-span-2">
              <div className={labelClass}>Structured Source Media / 结构化素材包</div>
              <SocialMaterialPackBuilder value={sourceMediaJson} onChange={setSourceMediaJson} />
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Select Platforms / 勾选平台</div>
            <div className="mt-3 grid gap-2">
              {SOCIAL_PREVIEW_PLATFORMS.map((target) => (
                <label key={target.platform} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:ring-blue-200">
                  <span><span className="block">{target.label}</span><span className="block text-xs font-semibold text-slate-500">{target.zh}</span></span>
                  <input type="checkbox" checked={selectedPlatforms.includes(target.platform)} onChange={() => togglePlatform(target.platform)} className="h-4 w-4" />
                </label>
              ))}
            </div>
            <button type="button" disabled={saving} onClick={createPlatformDrafts} className="mt-4 w-full rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Generate Selected Drafts / 生成所选平台草稿</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Side-by-Side Platform Preview Windows / 多平台并排模拟预览窗口" subtitle="Each platform has its own preview card, format, caption, hashtags, CTA and approval/schedule controls. / 每个平台都有独立预览卡片、格式、文案、标签、CTA 和审核/排期操作。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ target, draft }) => {
            const body = buildPreviewBody(draft, target);
            const title = draft ? safePreviewText(draft.title, target.label) : target.label;
            const status = draft ? draft.approval_status : 'missing_draft';
            return (
              <article key={target.platform} className="flex min-h-[430px] flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-activeBlue">{target.surface}</div>
                    <h4 className="mt-1 text-lg font-black text-slate-950">{target.label}</h4>
                    <div className="text-xs font-semibold text-slate-500">{target.zh} · {target.aspect}</div>
                  </div>
                  <Badge tone={statusTone(status)}>{formatValue(status)}</Badge>
                </div>
                <div className="mt-4 rounded-[1.6rem] bg-slate-950 p-3 text-white shadow-inner">
                  <div className="rounded-[1.2rem] bg-white p-3 text-slate-900">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-slate-200" />
                      <div><div className="text-sm font-black">NANOFIX Singapore</div><div className="text-xs font-semibold text-slate-500">Preview · Admin Review</div></div>
                    </div>
                    <div className="mb-3 flex min-h-32 items-center justify-center rounded-2xl bg-slate-100 px-4 py-8 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500">{target.aspect} Media Preview</div>
                    <div className="text-sm font-black text-slate-950">{title}</div>
                    <div className="mt-2 line-clamp-6 text-sm font-semibold leading-6 text-slate-700">{body}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">{target.defaultHashtags.map((tag) => <span key={tag} className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{tag}</span>)}</div>
                    <div className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-700">CTA: WhatsApp Photo Consult / Book Site Inspection</div>
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{target.helper}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {draft ? <button type="button" onClick={() => onOpenDraft(draft)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Edit / 编辑</button> : null}
                  {draft ? <button type="button" onClick={() => void onCreateSnapshot(draft)} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Schedule Snapshot / 排期快照</button> : null}
                  {!draft ? <Badge tone="gray">Generate first / 先生成</Badge> : null}
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

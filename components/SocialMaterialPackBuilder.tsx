'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from './Badge';

export type SocialMaterialPack = {
  script_keywords: string;
  source_video_urls: string[];
  reference_video_urls: string[];
  video_clip_urls: string[];
  cover_image_url: string;
  image_urls: string[];
  service_area: string;
  cta: string;
  reference_notes: string;
  notes: string;
  uploaded_materials: Array<Record<string, unknown>>;
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

export const defaultSocialMaterialPack: SocialMaterialPack = {
  script_keywords: '',
  source_video_urls: [],
  reference_video_urls: [],
  video_clip_urls: [],
  cover_image_url: '',
  image_urls: [],
  service_area: 'Singapore',
  cta: 'WhatsApp NANOFIX for photo consultation',
  reference_notes: '',
  notes: 'Original source material package for multi-platform review.',
  uploaded_materials: []
};

function parseLines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function joinLines(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).join('\n') : '';
}

function safeObject(value: string) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function appendUnique(list: string[], value: string) {
  if (!value) return list;
  return Array.from(new Set([...list, value]));
}

function formatBytes(size: unknown) {
  const bytes = Number(size || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UploadButton({ kind, label, accept, onUploaded }: { kind: string; label: string; accept: string; onUploaded: (material: Record<string, unknown>) => void }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function upload(file?: File | null) {
    if (!file) return;
    setUploading(true);
    setMessage('');
    const form = new FormData();
    form.set('kind', kind);
    form.set('file', file);
    const response = await fetch('/api/admin/social-media/material-upload', { method: 'POST', body: form });
    const json = await response.json().catch(() => ({}));
    setUploading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Upload failed. / 上传失败。');
      return;
    }
    setMessage('Uploaded. / 已上传。');
    onUploaded(json.material);
  }

  return (
    <label className="block rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input type="file" accept={accept} disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} className="block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-activeBlue file:px-3 file:py-2 file:text-xs file:font-black file:text-white disabled:opacity-60" />
      {message ? <span className="mt-2 block text-xs font-bold text-blue-700">{message}</span> : null}
    </label>
  );
}

export function SocialMaterialPackBuilder({ value, onChange }: { value: string; onChange: (jsonValue: string) => void }) {
  const initial = useMemo(() => ({ ...defaultSocialMaterialPack, ...safeObject(value) }), [value]);
  const [pack, setPack] = useState<SocialMaterialPack>(initial);

  useEffect(() => {
    setPack(initial);
  }, [initial]);

  function update(next: Partial<SocialMaterialPack>) {
    const merged = { ...pack, ...next };
    setPack(merged);
    onChange(JSON.stringify(merged, null, 2));
  }

  function addUploaded(material: Record<string, unknown>, targetKind: string) {
    const url = String(material.signed_url || material.path || '');
    const uploaded = [...(pack.uploaded_materials || []), material];
    if (targetKind === 'source_video') update({ source_video_urls: appendUnique(pack.source_video_urls || [], url), uploaded_materials: uploaded });
    else if (targetKind === 'reference_video') update({ reference_video_urls: appendUnique(pack.reference_video_urls || [], url), uploaded_materials: uploaded });
    else if (targetKind === 'video_clip') update({ video_clip_urls: appendUnique(pack.video_clip_urls || [], url), uploaded_materials: uploaded });
    else if (targetKind === 'cover_image') update({ cover_image_url: url, uploaded_materials: uploaded });
    else update({ image_urls: appendUnique(pack.image_urls || [], url), uploaded_materials: uploaded });
  }

  return (
    <div className="space-y-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">Source video / 素材视频</Badge>
        <Badge tone="cyan">Reference video / 参考视频</Badge>
        <Badge tone="green">Direct video clip upload / 直接上传片段</Badge>
        <Badge tone="amber">Admin review required</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2"><span className={labelClass}>Script Keywords / 文案关键词</span><input className={inputClass} value={pack.script_keywords || ''} onChange={(event) => update({ script_keywords: event.target.value })} placeholder="toilet leak, no hacking repair, HDB, before after, fast inspection" /></label>
        <label><span className={labelClass}>Service Area / 服务区域</span><input className={inputClass} value={pack.service_area || ''} onChange={(event) => update({ service_area: event.target.value })} /></label>
        <label><span className={labelClass}>CTA / 联系引导</span><input className={inputClass} value={pack.cta || ''} onChange={(event) => update({ cta: event.target.value })} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Source Video URLs / 素材视频链接（一行一个）</span><textarea className={`${inputClass} min-h-24`} value={joinLines(pack.source_video_urls)} onChange={(event) => update({ source_video_urls: parseLines(event.target.value) })} placeholder="NANOFIX 自己的施工/检测/案例原始视频，用于生成内容" /></label>
        <label className="md:col-span-2"><span className={labelClass}>Reference Video URLs / 参考视频链接（一行一个）</span><textarea className={`${inputClass} min-h-24`} value={joinLines(pack.reference_video_urls)} onChange={(event) => update({ reference_video_urls: parseLines(event.target.value) })} placeholder="只参考风格/节奏/镜头/标题，不作为可直接使用素材" /></label>
        <label className="md:col-span-2"><span className={labelClass}>Video Clip URLs / 视频片段链接（一行一个）</span><textarea className={`${inputClass} min-h-24`} value={joinLines(pack.video_clip_urls)} onChange={(event) => update({ video_clip_urls: parseLines(event.target.value) })} placeholder="多段原始素材片段：施工前、施工中、施工后、检测过程" /></label>
        <label><span className={labelClass}>Cover Image URL / 封面图链接</span><input className={inputClass} value={pack.cover_image_url || ''} onChange={(event) => update({ cover_image_url: event.target.value })} /></label>
        <label><span className={labelClass}>Image URLs / 图片链接（一行一个）</span><textarea className={`${inputClass} min-h-20`} value={joinLines(pack.image_urls)} onChange={(event) => update({ image_urls: parseLines(event.target.value) })} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Reference Notes / 参考说明</span><textarea className={`${inputClass} min-h-24`} value={pack.reference_notes || ''} onChange={(event) => update({ reference_notes: event.target.value })} placeholder="说明参考视频要学习什么：节奏、镜头、字幕风格、标题方式等" /></label>
        <label className="md:col-span-2"><span className={labelClass}>Material Notes / 素材备注</span><textarea className={`${inputClass} min-h-24`} value={pack.notes || ''} onChange={(event) => update({ notes: event.target.value })} /></label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <UploadButton kind="source_video" label="Upload Source Video / 上传素材视频" accept="video/*" onUploaded={(material) => addUploaded(material, 'source_video')} />
        <UploadButton kind="reference_video" label="Upload Reference Video / 上传参考视频" accept="video/*" onUploaded={(material) => addUploaded(material, 'reference_video')} />
        <UploadButton kind="video_clip" label="Upload Video Clip / 上传视频片段" accept="video/*" onUploaded={(material) => addUploaded(material, 'video_clip')} />
        <UploadButton kind="cover_image" label="Upload Cover Image / 上传封面图" accept="image/*" onUploaded={(material) => addUploaded(material, 'cover_image')} />
        <UploadButton kind="image" label="Upload Image Material / 上传图片素材" accept="image/*" onUploaded={(material) => addUploaded(material, 'image')} />
      </div>

      {pack.uploaded_materials?.length ? (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Uploaded Materials / 已上传素材</div>
          <div className="mt-2 grid gap-2">
            {pack.uploaded_materials.map((item, index) => (
              <div key={`${String(item.path || item.name)}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                <span className="font-black text-slate-900">{String(item.kind || 'material')}</span> · {String(item.name || item.path || 'uploaded file')} · {formatBytes(item.size_bytes)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

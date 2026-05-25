'use client';

import { useState } from 'react';
import { Badge } from './Badge';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getOutput(row: Row | null) {
  return row?.output_json && typeof row.output_json === 'object' ? row.output_json as Row : {};
}

function getRendererResult(row: Row | null) {
  const output = getOutput(row);
  return output.renderer_result && typeof output.renderer_result === 'object' ? output.renderer_result as Row : null;
}

function getReview(row: Row | null) {
  const output = getOutput(row);
  return output.rendered_output_review && typeof output.rendered_output_review === 'object' ? output.rendered_output_review as Row : null;
}

function outputReference(result: Row | null) {
  return String(result?.output_video_url || result?.output_storage_path || '');
}

function canApprove(row: Row | null) {
  const output = getOutput(row);
  const result = getRendererResult(row);
  return row?.render_status === 'rendered' && output.renderer_contract_valid === true && !!outputReference(result);
}

function tone(value: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const text = String(value || '');
  if (/true|approved|rendered|valid/i.test(text)) return 'green';
  if (/false|failed|revision|invalid/i.test(text)) return 'red';
  if (/pending|draft|review/i.test(text)) return 'amber';
  return 'blue';
}

export function SocialRenderedOutputReviewPanel({ row, onUpdated }: { row: Row | null; onUpdated: (row: Row, message: string) => void | Promise<void> }) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const output = getOutput(row);
  const result = getRendererResult(row);
  const review = getReview(row);
  const approvedReady = canApprove(row);

  async function act(action: 'approve_rendered_output' | 'request_render_revision') {
    if (!row?.render_job_id) return;
    setSaving(true);
    const response = await fetch('/api/admin/social-media/render-jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ render_job_id: row.render_job_id, action, review_notes: reviewNotes })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      await onUpdated(row, json.error || 'Rendered output review action failed. / 渲染结果审核操作失败。');
      return;
    }
    await onUpdated(json.row, action === 'approve_rendered_output' ? 'Rendered output approved. / 渲染结果已批准。' : 'Revision requested. / 已要求返工。');
  }

  if (!row) return null;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-activeBlue">Rendered Output Review / 渲染结果审核</div>
          <div className="mt-1 text-sm font-bold text-slate-600">Review renderer result before any scheduling or publishing handoff. / 排期或发布前必须人工审核渲染结果。</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={tone(row.render_status)}>job {formatValue(row.render_status)}</Badge>
          <Badge tone={tone(output.renderer_contract_valid)}>contract {formatValue(output.renderer_contract_valid)}</Badge>
          <Badge tone="amber">AI auto publish false</Badge>
        </div>
      </div>

      {result ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className={labelClass}>Output Reference / 输出引用</div><div className="break-all text-sm font-black text-slate-900">{outputReference(result) || '—'}</div></div>
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className={labelClass}>Renderer / 渲染器</div><div className="text-sm font-black text-slate-900">{formatValue(result.renderer_name)} {formatValue(result.renderer_version)}</div></div>
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className={labelClass}>Video Info / 视频信息</div><div className="text-sm font-bold text-slate-700">{formatValue(result.output_mime_type)} · {formatValue(result.width)}×{formatValue(result.height)} · {formatValue(result.duration_seconds)}s</div></div>
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className={labelClass}>File / 文件</div><div className="text-sm font-bold text-slate-700">{formatValue(result.output_file_size_bytes)} bytes · {formatValue(result.checksum_sha256)}</div></div>
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 md:col-span-2"><div className={labelClass}>Thumbnail / 缩略图</div><div className="break-all text-sm font-bold text-slate-700">{formatValue(result.thumbnail_url || result.thumbnail_storage_path)}</div></div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-100">No renderer result yet. Generate render plan, queue the job, then run the internal worker after a real renderer is configured. / 还没有渲染结果。</div>
      )}

      {review ? (
        <div className="mt-4 rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100">
          <div className={labelClass}>Latest Review / 最近审核</div>
          <div className="text-sm font-black text-blue-900">{formatValue(review.status)}</div>
          <div className="mt-1 text-xs font-semibold text-blue-800">{formatValue(review.review_notes)}</div>
        </div>
      ) : null}

      <label className="mt-4 block"><span className={labelClass}>Review Notes / 审核备注</span><textarea className={`${inputClass} min-h-24`} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Approve note or revision request..." /></label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={saving || !approvedReady} onClick={() => void act('approve_rendered_output')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">Approve Rendered Output / 批准渲染结果</button>
        <button type="button" disabled={saving || !result} onClick={() => void act('request_render_revision')} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60">Request Revision / 要求返工</button>
      </div>
      {!approvedReady ? <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Approval is enabled only when status is rendered, renderer contract is valid, and a real output video URL/storage path exists. / 只有 rendered + contract valid + 有真实输出视频引用时才能批准。</div> : null}
    </div>
  );
}

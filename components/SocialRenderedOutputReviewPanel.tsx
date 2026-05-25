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

function getScheduleHandoff(row: Row | null) {
  const output = getOutput(row);
  return output.schedule_snapshot_handoff && typeof output.schedule_snapshot_handoff === 'object' ? output.schedule_snapshot_handoff as Row : null;
}

function outputReference(result: Row | null) {
  return String(result?.output_video_url || result?.output_storage_path || '');
}

function canApprove(row: Row | null) {
  const output = getOutput(row);
  const result = getRendererResult(row);
  return row?.render_status === 'rendered' && output.renderer_contract_valid === true && !!outputReference(result);
}

function canCreateScheduleSnapshot(row: Row | null) {
  const output = getOutput(row);
  const result = getRendererResult(row);
  const review = getReview(row);
  return row?.render_status === 'approved'
    && output.renderer_contract_valid === true
    && review?.status === 'approved'
    && review?.final_approval_completed === true
    && !!outputReference(result);
}

function tone(value: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const text = String(value || '');
  if (/true|approved|rendered|valid|scheduled|publish_ready/i.test(text)) return 'green';
  if (/false|failed|revision|invalid/i.test(text)) return 'red';
  if (/pending|draft|review/i.test(text)) return 'amber';
  return 'blue';
}

export function SocialRenderedOutputReviewPanel({ row, onUpdated }: { row: Row | null; onUpdated: (row: Row, message: string) => void | Promise<void> }) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const output = getOutput(row);
  const result = getRendererResult(row);
  const review = getReview(row);
  const handoff = getScheduleHandoff(row);
  const approvedReady = canApprove(row);
  const scheduleReady = canCreateScheduleSnapshot(row);

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
    await onUpdated(json.row, action === 'approve_rendered_output' ? 'Final approval completed. Ready for scheduling. / 最终审批已完成，可以安排排期。' : 'Revision requested. / 已要求返工。');
  }

  async function createScheduleSnapshot() {
    if (!row?.render_job_id) return;
    setSaving(true);
    const response = await fetch('/api/admin/social-media/render-jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ render_job_id: row.render_job_id, action: 'create_rendered_output_schedule_snapshot', scheduled_at: scheduledAt })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      await onUpdated(row, json.error || 'Final approve & schedule failed. / 最终审批排期失败。');
      return;
    }
    await onUpdated(json.row, `Final-approved schedule snapshot created: v${json.version?.version_no || '—'} / 已创建最终审批后的排期快照。`);
  }

  if (!row) return null;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-activeBlue">Final Approval Before Scheduling / 排期前最终审批</div>
          <div className="mt-1 text-sm font-bold text-slate-600">All final review must be completed before scheduling. Once scheduled, the video is considered publish-ready. / 所有最终审核必须在排期前完成；安排排期后即代表视频已达到发布要求。</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={tone(row.render_status)}>job {formatValue(row.render_status)}</Badge>
          <Badge tone={tone(output.renderer_contract_valid)}>contract {formatValue(output.renderer_contract_valid)}</Badge>
          <Badge tone={tone(output.final_approval_completed_before_schedule)}>final approval {formatValue(output.final_approval_completed_before_schedule)}</Badge>
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
          <div className={labelClass}>Latest Final Approval / 最近最终审批</div>
          <div className="text-sm font-black text-blue-900">{formatValue(review.status)} · final approval {formatValue(review.final_approval_completed)}</div>
          <div className="mt-1 text-xs font-semibold text-blue-800">{formatValue(review.review_notes)}</div>
        </div>
      ) : null}

      {handoff ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
          <div className={labelClass}>Scheduled Publish-Ready Snapshot / 已排期发布就绪快照</div>
          <div className="text-sm font-black text-emerald-900">{formatValue(handoff.status)} · v{formatValue(handoff.version_no)}</div>
          <div className="mt-1 text-xs font-semibold text-emerald-800">Scheduled at: {formatValue(handoff.scheduled_at)} · Version ID: {formatValue(handoff.version_id)}</div>
        </div>
      ) : null}

      <label className="mt-4 block"><span className={labelClass}>Final Review Notes / 最终审批备注</span><textarea className={`${inputClass} min-h-24`} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Final approval note or revision request..." /></label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={saving || !approvedReady} onClick={() => void act('approve_rendered_output')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">Final Approve / 最终审批通过</button>
        <button type="button" disabled={saving || !result} onClick={() => void act('request_render_revision')} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60">Request Revision / 要求返工</button>
      </div>
      {!approvedReady ? <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Final approval is enabled only when status is rendered, renderer contract is valid, and a real output video URL/storage path exists. / 只有 rendered + contract valid + 有真实输出视频引用时才能最终审批。</div> : null}

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <label><span className={labelClass}>Schedule Time / 排期时间</span><input className={inputClass} type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
        <button type="button" disabled={saving || !scheduleReady} onClick={createScheduleSnapshot} className="mt-3 rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Final Approve & Schedule / 最终确认并排期</button>
        {!scheduleReady ? <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Scheduling is enabled only after final-approved rendered output with valid renderer contract and real video output reference. / 只有完成最终审批后的有效渲染结果才能安排排期。</div> : null}
        <div className="mt-2 text-xs font-bold text-slate-500">Scheduling confirms the video has passed all required reviews and is publish-ready at the scheduled time. It still does not auto-publish or call platform APIs in this step. / 排期代表视频已完成全部审核并达到发布要求；此步骤仍不自动发布、不调用平台 API。</div>
      </div>
    </div>
  );
}

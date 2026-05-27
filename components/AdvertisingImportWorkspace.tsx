'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionCard } from './SectionCard';
import { Badge } from './Badge';

type Row = Record<string, unknown>;
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
function text(value: unknown, fallback = '—') { return value === null || value === undefined || value === '' ? fallback : String(value); }
function tone(value: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' { const t = String(value || '').toLowerCase(); if (t.includes('success')) return 'green'; if (t.includes('failed')) return 'red'; if (t.includes('running') || t.includes('pending')) return 'amber'; return 'blue'; }
function splitCsvLine(line: string) { const out: string[] = []; let current = ''; let quoted = false; for (let i = 0; i < line.length; i += 1) { const ch = line[i]; if (ch === '"' && line[i + 1] === '"') { current += '"'; i += 1; continue; } if (ch === '"') { quoted = !quoted; continue; } if (ch === ',' && !quoted) { out.push(current.trim()); current = ''; continue; } current += ch; } out.push(current.trim()); return out; }
function previewRows(csv: string) { const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); if (lines.length < 2) return []; const headers = splitCsvLine(lines[0]); return lines.slice(1, 8).map((line) => { const values = splitCsvLine(line); return headers.reduce<Row>((row, header, index) => { row[header] = values[index] || ''; return row; }, {}); }); }

export function AdvertisingImportWorkspace() {
  const [csv, setCsv] = useState('');
  const [sampleCsv, setSampleCsv] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [syncLogs, setSyncLogs] = useState<Row[]>([]);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Row | null>(null);
  const preview = useMemo(() => previewRows(csv), [csv]);

  const loadTemplate = useCallback(async () => {
    const response = await fetch('/api/admin/advertising-center/import', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (json.ok) {
      setSampleCsv(json.sampleCsv || '');
      setColumns(json.templateColumns || []);
      setCsv((current) => current || json.sampleCsv || '');
    }
  }, []);
  const loadLogs = useCallback(async () => {
    const response = await fetch('/api/admin/advertising-center', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (json.ok) setSyncLogs(json.syncLogs || []);
  }, []);
  useEffect(() => { void loadTemplate(); void loadLogs(); }, [loadTemplate, loadLogs]);
  async function importCsv() {
    setMessage('');
    setResult(null);
    const response = await fetch('/api/admin/advertising-center/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) { setMessage(json.error || 'CSV import failed. / CSV 导入失败。'); return; }
    setResult(json);
    setMessage(`Imported ${json.rows_imported} row(s). / 已导入 ${json.rows_imported} 行。`);
    await loadLogs();
  }

  return <div className="space-y-5"><SectionCard title="Advertising CSV / Excel Import / 广告 CSV / Excel 导入" subtitle="Paste exported platform CSV or Excel CSV. The import updates internal advertising performance and ROI records only. / 粘贴平台导出的 CSV 或 Excel CSV，只更新内部广告表现与 ROI 记录。"><div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Template columns / 模板字段:<br /><span className="break-all text-activeBlue">{columns.join(', ')}</span></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setCsv(sampleCsv)} className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200">Load Sample / 加载示例</button><button type="button" onClick={importCsv} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700">Import CSV / 导入 CSV</button></div></SectionCard>{message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]"><SectionCard title="CSV Content / CSV 内容" subtitle="Required: date, platform, campaign_name. campaign_id is optional. / 必填：date、platform、campaign_name；campaign_id 可选。"><textarea className={`${inputClass} min-h-[360px] font-mono text-xs`} value={csv} onChange={(event) => setCsv(event.target.value)} /></SectionCard><SectionCard title="Import Logs / 导入日志" subtitle="Recent sync logs. / 最近同步日志。"><div className="space-y-2">{syncLogs.map((log, index) => <div key={String(log.sync_log_id || index)} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="flex items-center justify-between gap-2"><div className="font-black text-slate-900">{text(log.platform)}</div><Badge tone={tone(log.status)}>{text(log.status)}</Badge></div><div className="mt-1 text-xs font-bold text-slate-500">Rows: {text(log.rows_imported)} · {text(log.started_at)}</div>{log.error_message ? <div className="mt-1 text-xs font-bold text-red-700">{text(log.error_message)}</div> : null}</div>)}{!syncLogs.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No sync logs yet. / 暂无导入日志。</div> : null}</div></SectionCard></div><SectionCard title="Preview Rows / 预览行" subtitle="Preview first 7 rows before import. / 导入前预览前 7 行。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[900px] w-full text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr>{Object.keys(preview[0] || {}).slice(0, 10).map((key) => <th key={key} className="p-2">{key}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{preview.map((row, index) => <tr key={index}>{Object.keys(row).slice(0, 10).map((key) => <td key={key} className="p-2 font-semibold text-slate-700">{text(row[key])}</td>)}</tr>)}{!preview.length ? <tr><td className="p-4 text-center font-bold text-slate-500">No preview rows. / 暂无预览。</td></tr> : null}</tbody></table></div></SectionCard>{result ? <SectionCard title="Last Import Result / 最近导入结果" subtitle="Inserted rows and affected campaigns. / 导入行和受影响广告活动。"><pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs font-semibold text-white">{JSON.stringify(result, null, 2)}</pre></SectionCard> : null}</div>;
}

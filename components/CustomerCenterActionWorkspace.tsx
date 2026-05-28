'use client';

import { useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

const bindingQueue = [
  { id: 'BIND-001', customer: 'Mr Tan', source: 'Public repair form', match: 'Phone + address', status: 'suggested_match', href: '#pending-customer-binding' },
  { id: 'BIND-002', customer: 'Condo Owner', source: 'WhatsApp enquiry', match: 'WhatsApp only', status: 'manual_review', href: '#binding-review-merge' },
  { id: 'BIND-003', customer: 'Commercial Client', source: 'Google Business', match: 'Email + company', status: 'pending', href: '#data-matching-rules' }
];

const reviewQueue = [
  { id: 'REV-001', name: 'Verified Customer', rating: '5★', service: 'No-Hacking Repair', status: 'pending_review', risk: 'address in photo', display: 'Homepage Carousel' },
  { id: 'REV-002', name: 'Ms Lim', rating: '5★', service: 'Waterproofing Works', status: 'redaction_required', risk: 'full name visible', display: 'Service Page Block' },
  { id: 'REV-003', name: 'Anonymous', rating: '4★', service: 'Leak Detection', status: 'approved', risk: 'low', display: 'Track Record Page' }
];

const privacyControls = [
  ['Full name', 'Hidden by default', 'Admin can hide more, cannot reveal without consent'],
  ['Phone / WhatsApp / Email', 'Always hidden', 'Never public display'],
  ['Full address / unit number', 'Always redacted', 'Area only if customer allowed'],
  ['Photos / videos', 'Consent required', 'Admin may mask sensitive details'],
  ['Invoice amount', 'Hidden by default', 'Do not publish unless explicitly allowed']
];

function statusTone(status: string) {
  if (status.includes('required') || status.includes('manual')) return 'amber';
  if (status.includes('approved') || status.includes('linked')) return 'green';
  return 'blue';
}

export function CustomerCenterActionWorkspace() {
  const [activeReview, setActiveReview] = useState(reviewQueue[0].id);
  const [logs, setLogs] = useState<string[]>([]);
  const review = reviewQueue.find((item) => item.id === activeReview) ?? reviewQueue[0];

  function log(action: string) {
    setLogs((current) => [`${new Date().toLocaleString()} — ${action} — ${review.id}`, ...current].slice(0, 6));
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Pending Customer Binding / 待绑定客户" subtitle="Public repair, WhatsApp, social and Google enquiries can be matched to Customer Portal profiles before they become linked records. / 公开报修、WhatsApp、社媒和 Google 咨询先匹配客户档案，再绑定为客户记录。">
        <div id="pending-customer-binding" className="grid gap-3 md:grid-cols-3">
          {bindingQueue.map((item) => (
            <button key={item.id} type="button" className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:ring-1 hover:ring-activeBlue">
              <div className="flex items-center justify-between gap-3"><span className="font-black text-slate-900">{item.customer}</span><Badge tone={statusTone(item.status)}>{item.status}</Badge></div>
              <div className="mt-2 text-xs font-bold text-slate-500">{item.source}</div>
              <div className="mt-1 text-xs font-black text-activeBlue">Match: {item.match}</div>
              <div className="mt-3 text-xs font-black text-slate-500">Actions: Link / Reject / Manual review</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Review Approval & Privacy Redaction / 评价审核与隐私脱敏" subtitle="Customer reviews can be approved, rejected, archived, soft-deleted, redacted and assigned to homepage/service/track-record display locations. / 客户评价可审核、驳回、存档、软删除、脱敏，并分配到首页、服务页或案例页展示。">
        <div id="review-approval-privacy-redaction" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1fr_90px_150px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1fr_80px_150px_150px]">
              <span>Review / 评价</span><span>Rating</span><span>Status</span><span className="hidden md:block">Display</span>
            </div>
            {reviewQueue.map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveReview(item.id)} className={`grid w-full grid-cols-[1fr_90px_150px] gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[1fr_80px_150px_150px] ${review.id === item.id ? 'bg-sky-50' : 'bg-white'}`}>
                <span><span className="block font-black text-slate-900">{item.name}</span><span className="block text-xs font-semibold text-slate-500">{item.service} · {item.id}</span></span>
                <span className="font-black text-slate-700">{item.rating}</span>
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                <span className="hidden text-xs font-bold text-slate-500 md:block">{item.display}</span>
              </button>
            ))}
          </div>

          <aside className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-5 text-white">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-white/75">Selected review / 当前评价</div>
              <h3 className="mt-2 text-xl font-black">{review.name}</h3>
              <p className="mt-1 text-sm font-bold text-white/85">{review.service} · {review.rating}</p>
            </div>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-3"><b>Risk:</b> {review.risk}</div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>Display:</b> {review.display}</div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>Rule:</b> Admin may hide more information but cannot reveal customer-hidden information without new consent.</div>
            </div>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={() => log('Approve with redaction / 脱敏后批准')} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700">Approve with redaction / 脱敏后批准</button>
              <button type="button" onClick={() => log('Request customer revision / 要求客户修改')} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-200">Request revision / 要求修改</button>
              <button type="button" onClick={() => log('Archive review / 存档评价')} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-200">Archive / 存档</button>
              <button type="button" onClick={() => log('Soft delete review / 软删除评价')} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700">Soft delete / 软删除</button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-black text-slate-900">Review audit preview / 评价审计预览</div>
              <div className="mt-3 grid gap-2">
                {logs.length ? logs.map((item) => <div key={item} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">{item}</div>) : <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-100">No review action yet / 暂无评价操作</div>}
              </div>
            </div>
          </aside>
        </div>
      </SectionCard>

      <SectionCard title="Review Display Locations / 评价展示位置管理" subtitle="Approved reviews can be assigned to homepage carousel, service page blocks, Track Record & Warranty pages, or kept internal only. / 已批准评价可分配到首页滚动、服务页评价、案例与保修页，或仅内部保存。">
        <div id="review-display-locations" className="grid gap-3 md:grid-cols-4">
          {['Homepage Carousel / 首页滚动评论', 'Service Page Block / 服务页评价区', 'Track Record Page / 案例与保修页面', 'Internal Only / 仅内部保存'].map((item) => (
            <button key={item} type="button" className="rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-black text-slate-800 transition hover:bg-blue-50 hover:ring-1 hover:ring-activeBlue">{item}</button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Review Privacy Settings / 评价公开信息设置" subtitle="Privacy defaults protect PDPA-sensitive data. Super Admin can force hide, but not force reveal without consent. / 默认保护 PDPA 敏感信息；总管理员可强制隐藏，但不能无授权强制公开。">
        <div id="review-privacy-settings" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {privacyControls.map(([field, value, rule]) => (
            <div key={field} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-black text-slate-900">{field}</div>
              <div className="mt-1 text-sm font-bold text-activeBlue">{value}</div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{rule}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

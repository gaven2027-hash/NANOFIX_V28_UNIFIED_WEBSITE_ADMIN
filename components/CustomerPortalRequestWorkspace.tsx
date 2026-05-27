'use client';

import { useState } from 'react';

type RequestKind = 'new_repair' | 'warranty_claim';

type SubmitState = {
  loading: boolean;
  message: string;
  ok: boolean | null;
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-sky-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

export function CustomerPortalRequestWorkspace() {
  const [requestKind, setRequestKind] = useState<RequestKind>('new_repair');
  const [state, setState] = useState<SubmitState>({ loading: false, message: '', ok: null });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, message: '', ok: null });
    const form = new FormData(event.currentTarget);
    const payload = {
      requestType: requestKind,
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
      address: String(form.get('address') || ''),
      postalCode: String(form.get('postalCode') || ''),
      issueType: String(form.get('issueType') || ''),
      message: String(form.get('message') || ''),
      warrantyId: String(form.get('warrantyId') || ''),
      warrantyCode: String(form.get('warrantyCode') || ''),
      originalJobReference: String(form.get('originalJobReference') || ''),
      suspectedRecurringIssue: form.get('suspectedRecurringIssue') === 'on',
      preferredAppointmentTime: String(form.get('preferredAppointmentTime') || ''),
      sourcePlatform: requestKind === 'warranty_claim' ? 'customer_portal_warranty_claim' : 'customer_portal_new_repair',
      sourceType: 'direct',
      sourceMedium: 'customer_portal_form',
      registrationMode: 'customer_portal'
    };

    try {
      const response = await fetch('/api/public/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) {
        setState({ loading: false, ok: false, message: result?.error || 'Submission failed. / 提交失败。' });
        return;
      }
      setState({
        loading: false,
        ok: true,
        message: requestKind === 'warranty_claim'
          ? 'Warranty claim submitted. Our team will check whether it is within warranty scope. / 保修范围申请已提交，我们会审核是否属于保修范围。'
          : 'Repair request submitted. Our team will review and contact you shortly. / 新增维修请求已提交，我们会尽快审核并联系您。'
      });
      event.currentTarget.reset();
    } catch {
      setState({ loading: false, ok: false, message: 'Submission service is not reachable. / 提交服务暂时无法连接。' });
    }
  }

  return (
    <section id="submit-request" className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Request / 客户提交请求</div>
          <h2 className="mt-1 text-2xl font-black text-slate-950">New Repair or Warranty Claim / 新增维修或保修范围申请</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Customer Portal submissions are customer-owned records. New repair creates a service request; warranty claim links to warranty review before deciding in-warranty, out-of-warranty or new quotation handling.
            / 客户门户提交内容属于客户自己的记录。新增维修会创建报修单；保修范围申请会进入保修审核，再判断保修内、保修外或需要重新报价。
          </p>
        </div>
        <div className="grid w-full gap-2 rounded-3xl bg-adminBg p-2 sm:w-auto sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setRequestKind('new_repair')}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${requestKind === 'new_repair' ? 'bg-activeBlue text-white shadow-lg shadow-sky-200' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
          >
            New Repair / 新增维修
          </button>
          <button
            type="button"
            onClick={() => setRequestKind('warranty_claim')}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${requestKind === 'warranty_claim' ? 'bg-activeBlue text-white shadow-lg shadow-sky-200' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
          >
            Warranty Claim / 保修范围申请
          </button>
        </div>
      </div>

      <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
        <label>
          <span className={labelClass}>Full Name / 姓名</span>
          <input name="name" className={inputClass} placeholder="Ms Lim Siew Mei" required />
        </label>
        <label>
          <span className={labelClass}>Phone / WhatsApp / 电话</span>
          <input name="phone" className={inputClass} placeholder="+65 8xxx xxxx" required />
        </label>
        <label>
          <span className={labelClass}>Email / 邮箱</span>
          <input name="email" type="email" className={inputClass} placeholder="customer@email.com" />
        </label>
        <label>
          <span className={labelClass}>Preferred Appointment Time / 期望预约时间</span>
          <input name="preferredAppointmentTime" className={inputClass} placeholder="Tomorrow afternoon / 明天下午" />
        </label>
        <label className="lg:col-span-2">
          <span className={labelClass}>Address / 地址</span>
          <input name="address" className={inputClass} placeholder="Block / Condo / Unit / Road" />
        </label>
        <label>
          <span className={labelClass}>Postal Code / 邮编</span>
          <input name="postalCode" className={inputClass} placeholder="Singapore postal code" />
        </label>
        <label>
          <span className={labelClass}>Issue Type / 问题类型</span>
          <select name="issueType" className={inputClass} defaultValue={requestKind === 'warranty_claim' ? 'Warranty scope review' : 'Ceiling leak'}>
            <option>Ceiling leak</option>
            <option>Toilet leakage</option>
            <option>Balcony / planter leak</option>
            <option>External wall seepage</option>
            <option>No-hacking repair</option>
            <option>Warranty scope review</option>
            <option>Other</option>
          </select>
        </label>

        {requestKind === 'warranty_claim' ? (
          <>
            <label>
              <span className={labelClass}>Warranty ID / 保修记录 ID</span>
              <input name="warrantyId" className={inputClass} placeholder="Linked warranty record ID" />
            </label>
            <label>
              <span className={labelClass}>Warranty Code / 保修编号</span>
              <input name="warrantyCode" className={inputClass} placeholder="NFX-WTY-2026-0001" />
            </label>
            <label className="lg:col-span-2">
              <span className={labelClass}>Original Job Reference / 原维修项目</span>
              <input name="originalJobReference" className={inputClass} placeholder="Invoice / job / QR code reference" />
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-100 lg:col-span-2">
              <input name="suspectedRecurringIssue" type="checkbox" className="h-4 w-4" />
              Suspected same issue recurring / 疑似原问题复发
            </label>
          </>
        ) : null}

        <label className="lg:col-span-2">
          <span className={labelClass}>Problem Description / 问题描述</span>
          <textarea name="message" className={`${inputClass} min-h-32 resize-y`} placeholder="Describe leakage location, timing, visible stains, photos/videos uploaded in customer media flow, and urgency. / 描述漏水位置、发生时间、水印、照片视频和紧急程度。" />
        </label>

        {state.message ? (
          <div className={`rounded-2xl px-4 py-3 text-sm font-bold lg:col-span-2 ${state.ok ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-800 ring-1 ring-rose-100'}`}>
            {state.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
          <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-6 py-3 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {state.loading ? 'Submitting... / 提交中...' : requestKind === 'warranty_claim' ? 'Submit Warranty Claim / 提交保修范围申请' : 'Submit New Repair / 提交新增维修'}
          </button>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500 ring-1 ring-slate-200">
            Photos/videos should be uploaded through the customer media upload flow and linked to this request. / 图片视频应通过客户素材上传流程上传并绑定到本请求。
          </div>
        </div>
      </form>
    </section>
  );
}

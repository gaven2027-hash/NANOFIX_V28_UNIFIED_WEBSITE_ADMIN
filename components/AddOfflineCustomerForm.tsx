'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { PhoneCountryCodeInput, composePhoneNumber } from './PhoneCountryCodeInput';
import { SectionCard } from './SectionCard';

type Result = {
  ok: boolean;
  message: string;
  customer_id?: string;
  service_request_id?: string;
  portal_status?: string;
};

export function AddOfflineCustomerForm() {
  const [name, setName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+65');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Leak Detection');
  const [issueType, setIssueType] = useState('Water leakage repair');
  const [serviceDate, setServiceDate] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const phone = composePhoneNumber(phoneCountryCode, phoneLocal);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    if (!name.trim() || !phone) {
      setLoading(false);
      setResult({ ok: false, message: 'Customer name and phone / WhatsApp are required. / 客户姓名和电话为必填。' });
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/admin/customers/offline', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          customer: {
            name,
            phone,
            phone_country_code: phoneCountryCode,
            phone_local_number: phoneLocal,
            email,
            address
          },
          order: {
            service_category: serviceCategory,
            issue_type: issueType,
            service_date: serviceDate,
            warranty_months: warrantyMonths ? Number(warrantyMonths) : null,
            payment_status: paymentStatus,
            amount: amount ? Number(amount) : null,
            notes
          }
        })
      });
      const data = await response.json().catch(() => ({}));
      setResult({
        ok: Boolean(data.ok),
        message: data.message || data.error || (response.ok ? 'Created successfully. / 已创建。' : 'Create failed. / 创建失败。'),
        customer_id: data.customer_id,
        service_request_id: data.service_request_id,
        portal_status: data.portal_status
      });
      if (response.ok && data.ok) {
        setName(''); setPhoneLocal(''); setEmail(''); setAddress(''); setAmount(''); setNotes('');
        setIssueType('Water leakage repair'); setServiceCategory('Leak Detection'); setServiceDate(''); setWarrantyMonths('12'); setPaymentStatus('pending');
      }
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : 'Unknown error / 未知错误' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard
      title="Add Offline Customer / 后台代录客户"
      subtitle="Create an Unclaimed Customer Profile for customers who completed work but do not want to register yet. They can later claim the account by phone or email OTP and see all linked repair records. / 为已合作但暂不注册的客户创建未认领客户档案；以后客户可通过手机号或邮箱验证认领账号并查看所有维修记录。"
    >
      <form id="add-offline-customer" onSubmit={submit} className="scroll-mt-32 space-y-5">
        <div className="rounded-3xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">
          Portal Status will be saved as <b>unclaimed</b>. The admin does not create a customer password. / 门户状态会保存为 <b>未认领</b>，后台不为客户创建密码。
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
            <h3 className="text-base font-black text-slate-950">1. Customer Info / 客户资料</h3>
            <div className="mt-4 grid gap-3">
              <input value={name} onChange={(event) => setName(event.target.value)} required className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Customer Name / 客户姓名" />
              <PhoneCountryCodeInput countryCode={phoneCountryCode} onCountryCodeChange={setPhoneCountryCode} value={phoneLocal} onChange={setPhoneLocal} required placeholder="Phone / WhatsApp / 手机或 WhatsApp" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Email / 邮箱（可选，用于以后认领账号）" />
              <input value={address} onChange={(event) => setAddress(event.target.value)} className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Repair Address / 维修地址" />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
            <h3 className="text-base font-black text-slate-950">2. Order / Repair Record / 订单与维修记录</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)} className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue">
                <option>Leak Detection</option><option>No-Hacking Repair</option><option>Waterproofing Works</option><option>Warranty Claim</option><option>Other</option>
              </select>
              <input value={issueType} onChange={(event) => setIssueType(event.target.value)} className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Issue Type / 问题类型" />
              <input value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} type="date" className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" />
              <input value={warrantyMonths} onChange={(event) => setWarrantyMonths(event.target.value)} inputMode="numeric" className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Warranty Months / 保修月数" />
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue">
                <option value="pending">Payment Pending / 待付款</option><option value="paid">Paid / 已付款</option><option value="partial">Partial / 部分付款</option><option value="waived">Waived / 豁免</option>
              </select>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Amount SGD / 金额" />
            </div>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-3 min-h-[110px] w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Internal Notes / 内部备注" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-100">
            Linked path / 关联路径：customers.customer_id → service_requests.customer_id → quotations / invoices / payments / warranties. Claim path / 认领路径：phone/email OTP → customer_account_claims → claimed_auth_user_id.
          </div>
          <button disabled={loading} className="rounded-2xl bg-activeBlue px-6 py-4 text-sm font-black text-white shadow-soft hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
            {loading ? 'Creating... / 创建中...' : 'Create Unclaimed Profile / 创建未认领档案'}
          </button>
        </div>

        {result ? (
          <div className={`rounded-2xl p-4 text-sm font-bold leading-6 ring-1 ${result.ok ? 'bg-emerald-50 text-emerald-950 ring-emerald-200' : 'bg-red-50 text-red-950 ring-red-200'}`}>
            {result.message}
            {result.customer_id ? <div className="mt-1 text-xs">customer_id: {result.customer_id}</div> : null}
            {result.service_request_id ? <div className="text-xs">service_request_id: {result.service_request_id}</div> : null}
            {result.portal_status ? <div className="text-xs">portal_status: {result.portal_status}</div> : null}
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}

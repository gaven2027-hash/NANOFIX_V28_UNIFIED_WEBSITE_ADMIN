'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

const phoneInputClass = 'w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue';

function composePhoneNumber(countryCode: string, localNumber: string) {
  const local = localNumber.replace(/[^0-9]/g, '').trim();
  const code = countryCode.trim() || '+65';
  return local ? `${code} ${local}` : '';
}

type ClaimMethod = 'phone' | 'email';

type ClaimResult = {
  ok: boolean;
  message?: string;
  error?: string;
  claim_id?: string;
  portal_status?: string;
};

export function ClaimExistingAccountForm() {
  const [method, setMethod] = useState<ClaimMethod>('phone');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+65');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    const claimIdentifier = method === 'phone' ? composePhoneNumber(phoneCountryCode, phoneLocal) : email.trim().toLowerCase();
    if (!claimIdentifier) {
      setResult({ ok: false, error: method === 'phone' ? 'Phone / WhatsApp is required. / 请输入手机或 WhatsApp。' : 'Email is required. / 请输入邮箱。' });
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/customer-portal/claim-existing-account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          claim_method: method,
          claim_identifier: claimIdentifier,
          full_name: fullName,
          phone_country_code: phoneCountryCode,
          phone_local_number: phoneLocal
        })
      });
      const data = (await response.json().catch(() => ({}))) as ClaimResult;
      setResult({ ...data, ok: Boolean(data.ok && response.ok) });
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : 'Unknown error / 未知错误' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mt-5 text-center">
        <div className="mx-auto inline-flex rounded-full bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-activeBlue ring-1 ring-blue-100">NANOFIX Customer Portal / 客户门户</div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Claim Existing Account</h1>
        <p className="mt-1 text-base font-black text-activeBlue">认领已有维修记录</p>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-700">Use your phone / WhatsApp or email to find records created before registration.<br />使用手机 / WhatsApp 或邮箱，查找后台已代录的维修记录。</p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => setMethod('phone')} className={`rounded-xl px-3 py-2 text-xs font-black ${method === 'phone' ? 'bg-activeBlue text-white' : 'text-slate-600'}`}>Phone / 手机</button>
          <button type="button" onClick={() => setMethod('email')} className={`rounded-xl px-3 py-2 text-xs font-black ${method === 'email' ? 'bg-activeBlue text-white' : 'text-slate-600'}`}>Email / 邮箱</button>
        </div>
        <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Full Name / 姓名（可选）" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        {method === 'phone' ? (
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <input value={phoneCountryCode} onChange={(event) => setPhoneCountryCode(event.target.value)} required className={phoneInputClass} placeholder="+65" />
            <input value={phoneLocal} onChange={(event) => setPhoneLocal(event.target.value)} required inputMode="tel" className={phoneInputClass} placeholder="Phone / WhatsApp / 手机或 WhatsApp" />
          </div>
        ) : <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Email / 邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />}
        {result ? <div className={`rounded-2xl px-4 py-3 text-sm font-bold leading-6 ring-1 ${result.ok ? 'bg-emerald-50 text-emerald-900 ring-emerald-100' : 'bg-red-50 text-red-800 ring-red-100'}`}>{result.message || result.error}{result.claim_id ? <div className="mt-1 text-xs">claim_id: {result.claim_id}</div> : null}{result.portal_status ? <div className="text-xs">portal_status: {result.portal_status}</div> : null}</div> : null}
        <button className="w-full rounded-2xl bg-activeBlue px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>{loading ? 'Checking... / 查询中...' : 'Find My Existing Records / 查找已有维修记录'}</button>
        <p className="text-center text-[11px] font-bold leading-5 text-slate-500">Already activated? / 已激活账号？ <Link href="/login?role=customer" className="text-activeBlue hover:underline">Sign in / 登录</Link></p>
      </form>
    </>
  );
}

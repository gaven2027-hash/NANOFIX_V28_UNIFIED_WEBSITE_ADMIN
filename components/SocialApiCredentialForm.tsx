'use client';

import { useMemo, useState } from 'react';

type Rule = {
  platform: string;
  api: string;
  testApi: string;
  syncApi: string;
  credentialFields: string;
  linkedModules: string;
};

type Result = {
  action: string;
  ok: boolean;
  status?: number;
  message: string;
};

function platformSlug(rule: Rule) {
  if (rule.api.includes('/api/ads/google/')) return 'google-ads';
  const matched = rule.api.match(/\/api\/social\/accounts\/([^/]+)\//);
  return matched?.[1] || rule.platform.toLowerCase().replace(/\s+/g, '-');
}

function parseFields(fields: string) {
  return fields.split(',').map((field) => field.trim()).filter(Boolean);
}

function normaliseKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

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

export function SocialApiCredentialForm({ rules }: { rules: Rule[] }) {
  const [selected, setSelected] = useState(rules[0]?.api || '');
  const active = useMemo(() => rules.find((rule) => rule.api === selected) || rules[0], [rules, selected]);
  const fields = useMemo(() => parseFields(active?.credentialFields || ''), [active]);
  const [accountName, setAccountName] = useState('NANOFIX Official');
  const [accountId, setAccountId] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  if (!active) return null;

  function updateCredential(field: string, value: string) {
    setCredentials((current) => ({ ...current, [normaliseKey(field)]: value }));
  }

  async function submit(action: 'connect' | 'test' | 'sync') {
    const endpoint = action === 'connect' ? active.api : action === 'test' ? active.testApi : active.syncApi;
    setBusyAction(action);
    setResult(null);
    try {
      const payload = {
        account_name: accountName,
        account_id: accountId,
        customer_id: platformSlug(active) === 'google-ads' ? accountId : undefined,
        credentials
      };
      const { response, data } = await postJson(endpoint, payload);
      setResult({
        action,
        ok: Boolean(data?.ok ?? response.ok),
        status: response.status,
        message: data?.warning || data?.next_step || data?.error || (response.ok ? 'Saved / 已保存' : 'Request failed / 请求失败')
      });
    } catch (error) {
      setResult({ action, ok: false, message: error instanceof Error ? error.message : 'Unknown error / 未知错误' });
    } finally {
      setBusyAction('');
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">Paste API Credentials & Bind Account / 粘贴 API 信息并绑定账号</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">Do not paste secrets into the browser URL. Paste them here, then click Save Binding, Test Connection and Sync Data. / 不要把密钥粘贴到浏览器地址栏；请粘贴到这里，然后保存绑定、测试连接、同步数据。</p>
        </div>
        <span className="rounded-2xl bg-activeBlue px-3 py-2 text-xs font-black text-white">Secure POST Form</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <label className="grid gap-1 text-xs font-black text-slate-600">
          Platform / 平台
          <select value={selected} onChange={(event) => { setSelected(event.target.value); setCredentials({}); setResult(null); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
            {rules.map((rule) => <option key={rule.api} value={rule.api}>{rule.platform}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-600">
          Account Name / 账号名称
          <input value={accountName} onChange={(event) => setAccountName(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800" placeholder="NANOFIX Official" />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-600">
          Account ID / 外部账号 ID
          <input value={accountId} onChange={(event) => setAccountId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800" placeholder="Page ID / Customer ID / Phone Number ID" />
        </label>
      </div>

      <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-100">
        Linked Modules / 绑定后联通栏目：{active.linkedModules}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const key = normaliseKey(field);
          const secretLike = /secret|token|key/i.test(field);
          return (
            <label key={field} className="grid gap-1 text-xs font-black text-slate-600">
              {field}
              <input
                type={secretLike ? 'password' : 'text'}
                value={credentials[key] || ''}
                onChange={(event) => updateCredential(field, event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                placeholder="Paste here / 粘贴到这里"
              />
            </label>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => submit('connect')} disabled={Boolean(busyAction)} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{busyAction === 'connect' ? 'Saving...' : 'Save Binding / 保存绑定'}</button>
        <button type="button" onClick={() => submit('test')} disabled={Boolean(busyAction)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">{busyAction === 'test' ? 'Testing...' : 'Test Connection / 测试连接'}</button>
        <button type="button" onClick={() => submit('sync')} disabled={Boolean(busyAction)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">{busyAction === 'sync' ? 'Syncing...' : 'Sync Data / 同步数据'}</button>
      </div>

      {result ? (
        <div className={`mt-4 rounded-2xl p-3 text-xs font-bold leading-5 ring-1 ${result.ok ? 'bg-emerald-50 text-emerald-950 ring-emerald-200' : 'bg-amber-50 text-amber-950 ring-amber-200'}`}>
          {result.action.toUpperCase()} · HTTP {result.status || '-'} · {result.message}
        </div>
      ) : null}
    </div>
  );
}

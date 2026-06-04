"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "./Badge";
import { SectionCard } from "./SectionCard";
import {
  adPlatforms,
  adServiceCategories,
  calculateCpl,
  calculateRoas,
  calculateRoi,
} from "@/lib/nanofix/advertising-center";

type Row = Record<string, unknown>;

type ApiState = {
  campaigns: Row[];
  accounts: Row[];
  suggestions: Row[];
  approvals: Row[];
  budgetRequests: Row[];
  syncLogs: Row[];
  takeovers: Row[];
  role: string;
  fullAccess: boolean;
  fallback?: string | null;
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100";
const labelClass =
  "mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500";

function num(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}
function money(value: unknown) {
  return `$${num(value).toLocaleString("en-SG", { maximumFractionDigits: 0 })}`;
}
function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
function tone(
  value: unknown,
): "blue" | "green" | "amber" | "red" | "gray" | "cyan" {
  const text = String(value || "").toLowerCase();
  if (
    text.includes("approved") ||
    text.includes("active") ||
    text.includes("normal")
  )
    return "green";
  if (
    text.includes("review") ||
    text.includes("draft") ||
    text.includes("submitted") ||
    text.includes("pending")
  )
    return "amber";
  if (
    text.includes("high") ||
    text.includes("critical") ||
    text.includes("paused") ||
    text.includes("rejected")
  )
    return "red";
  if (
    text.includes("google") ||
    text.includes("meta") ||
    text.includes("tiktok") ||
    text.includes("manual")
  )
    return "cyan";
  return "blue";
}
function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}
function campaignName(row: Row) {
  return text(row.campaign_name || row.campaign, "Untitled Campaign");
}
function campaignSpend(row: Row) {
  return num(row.spend_amount ?? row.spend);
}
function campaignRevenue(row: Row) {
  return num(row.revenue_amount ?? row.revenue);
}
function campaignGross(row: Row) {
  return num(row.gross_profit_amount ?? row.revenue_amount ?? row.revenue);
}
function campaignLeads(row: Row) {
  return num(row.leads_count ?? row.leads);
}
function campaignBookings(row: Row) {
  return num(row.bookings_count ?? row.bookings);
}

export function AdvertisingCenterWorkspace() {
  const [state, setState] = useState<ApiState>({
    campaigns: [],
    accounts: [],
    suggestions: [],
    approvals: [],
    budgetRequests: [],
    syncLogs: [],
    takeovers: [],
    role: "unknown",
    fullAccess: false,
    fallback: null,
  });
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({
    platform: "google_ads",
    service_category: adServiceCategories[0],
    campaign_name: "HDB Ceiling Leak Search Campaign",
    daily_budget: "30",
    monthly_budget: "900",
    landing_page_url: "https://www.nanofixsg.com/leak-detection",
    headline: "No-Hacking Leak Detection in Singapore",
    primary_text:
      "Send photos on WhatsApp. NANOFIX checks leakage source before hacking tiles.",
    utm_campaign: "hdb_ceiling_leak_search",
  });

  async function loadData() {
    const response = await fetch("/api/admin/advertising-center", {
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok)
      return setMessage(
        json.error ||
          "Advertising center data unavailable. / 广告中心数据暂不可用。",
      );
    const fallbackActive = Boolean(json.fallback);
    setState({
      campaigns: fallbackActive ? [] : json.campaigns || [],
      accounts: fallbackActive ? [] : json.accounts || [],
      suggestions: fallbackActive ? [] : json.suggestions || [],
      approvals: fallbackActive ? [] : json.approvals || [],
      budgetRequests: fallbackActive ? [] : json.budgetRequests || [],
      syncLogs: fallbackActive ? [] : json.syncLogs || [],
      takeovers: fallbackActive ? [] : json.takeovers || [],
      role: json.context?.role || "unknown",
      fullAccess: Boolean(json.super_admin_full_access),
      fallback: json.fallback,
    });
  }

  useEffect(() => {
    void loadData();
  }, []);

  const metrics = useMemo(() => {
    const spend = state.campaigns.reduce((s, r) => s + campaignSpend(r), 0);
    const leads = state.campaigns.reduce((s, r) => s + campaignLeads(r), 0);
    const bookings = state.campaigns.reduce(
      (s, r) => s + campaignBookings(r),
      0,
    );
    const revenue = state.campaigns.reduce((s, r) => s + campaignRevenue(r), 0);
    const gross = state.campaigns.reduce((s, r) => s + campaignGross(r), 0);
    return {
      spend,
      leads,
      bookings,
      revenue,
      gross,
      cpl: calculateCpl(spend, leads),
      roas: calculateRoas(revenue, spend),
      roi: calculateRoi(revenue, spend, gross),
    };
  }, [state.campaigns]);

  function generatedUrl() {
    try {
      const url = new URL(
        draft.landing_page_url || "https://www.nanofixsg.com",
      );
      url.searchParams.set("utm_source", draft.platform);
      url.searchParams.set(
        "utm_medium",
        draft.platform === "manual_import" ? "manual" : "paid",
      );
      url.searchParams.set(
        "utm_campaign",
        draft.utm_campaign || draft.campaign_name,
      );
      url.searchParams.set(
        "utm_content",
        draft.headline
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 60),
      );
      return url.toString();
    } catch {
      return draft.landing_page_url;
    }
  }

  async function createDraft() {
    setMessage("");
    const response = await fetch("/api/admin/advertising-center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_campaign",
        ...draft,
        landing_page_url: generatedUrl(),
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok)
      return setMessage(json.error || "Create draft failed. / 创建草稿失败。");
    setMessage("Campaign draft created. / 广告活动草稿已创建。");
    await loadData();
  }

  async function updateCampaign(action: string, campaign: Row) {
    setMessage("");
    const response = await fetch("/api/admin/advertising-center", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        campaign_id: campaign.campaign_id,
        takeover_reason: "Super Admin manual takeover from Advertising Center",
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok)
      return setMessage(json.error || "Update failed. / 更新失败。");
    setMessage(
      action === "super_admin_takeover"
        ? "Super Admin takeover recorded. / 总管理员接管已记录。"
        : "Campaign updated. / 广告活动已更新。",
    );
    await loadData();
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Advertising & Promotion Center / 广告投放与推广中心"
        subtitle=""
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid flex-1 gap-3 md:grid-cols-6">
            <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
              <div className="text-2xl font-black text-blue-900">
                {money(metrics.spend)}
              </div>
              <div className="text-xs font-bold text-blue-700">
                Spend / 花费
              </div>
            </div>
            <div className="rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100">
              <div className="text-2xl font-black text-cyan-900">
                {metrics.leads}
              </div>
              <div className="text-xs font-bold text-cyan-700">
                Leads / 线索
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <div className="text-2xl font-black text-emerald-900">
                {metrics.bookings}
              </div>
              <div className="text-xs font-bold text-emerald-700">
                Bookings / 预约
              </div>
            </div>
            <div className="rounded-2xl bg-green-50 p-4 ring-1 ring-green-100">
              <div className="text-2xl font-black text-green-900">
                {money(metrics.revenue)}
              </div>
              <div className="text-xs font-bold text-green-700">
                Revenue / 收款
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <div className="text-2xl font-black text-amber-900">
                {money(metrics.cpl)}
              </div>
              <div className="text-xs font-bold text-amber-700">
                CPL / 线索成本
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <div className="text-lg font-black">{state.role}</div>
              <div className="text-xs font-bold text-slate-300">
                {state.fullAccess
                  ? "Super Admin / 总管理员"
                  : "Scoped / 范围权限"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            Refresh / 刷新
          </button>
        </div>
        {state.fallback ? (
          <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black text-red-800 ring-1 ring-red-100">
            Live advertising tables unavailable: {state.fallback}
          </div>
        ) : null}
      </SectionCard>

      {message ? (
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <SectionCard title="Create Campaign Draft / 创建广告草稿" subtitle="">
          <div className="space-y-3">
            <label>
              <span className={labelClass}>Platform / 平台</span>
              <select
                className={inputClass}
                value={draft.platform}
                onChange={(event) =>
                  setDraft({ ...draft, platform: event.target.value })
                }
              >
                {adPlatforms.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Service / 服务</span>
              <select
                className={inputClass}
                value={draft.service_category}
                onChange={(event) =>
                  setDraft({ ...draft, service_category: event.target.value })
                }
              >
                {adServiceCategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <input
              className={inputClass}
              value={draft.campaign_name}
              onChange={(event) =>
                setDraft({ ...draft, campaign_name: event.target.value })
              }
              placeholder="Campaign Name"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputClass}
                value={draft.daily_budget}
                type="number"
                onChange={(event) =>
                  setDraft({ ...draft, daily_budget: event.target.value })
                }
                placeholder="Daily Budget"
              />
              <input
                className={inputClass}
                value={draft.monthly_budget}
                type="number"
                onChange={(event) =>
                  setDraft({ ...draft, monthly_budget: event.target.value })
                }
                placeholder="Monthly Budget"
              />
            </div>
            <input
              className={inputClass}
              value={draft.landing_page_url}
              onChange={(event) =>
                setDraft({ ...draft, landing_page_url: event.target.value })
              }
              placeholder="Landing Page"
            />
            <input
              className={inputClass}
              value={draft.headline}
              onChange={(event) =>
                setDraft({ ...draft, headline: event.target.value })
              }
              placeholder="Headline"
            />
            <textarea
              className={`${inputClass} min-h-24`}
              value={draft.primary_text}
              onChange={(event) =>
                setDraft({ ...draft, primary_text: event.target.value })
              }
              placeholder="Primary text"
            />
            <input
              className={inputClass}
              value={draft.utm_campaign}
              onChange={(event) =>
                setDraft({ ...draft, utm_campaign: event.target.value })
              }
              placeholder="UTM Campaign"
            />
            <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              Generated URL / 生成追踪链接:
              <br />
              <span className="break-all text-activeBlue">
                {generatedUrl()}
              </span>
            </div>
            <button
              type="button"
              onClick={createDraft}
              className="w-full rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
            >
              Save Draft / 保存草稿
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Campaign ROI & Approval / 广告 ROI 与审批"
          subtitle=""
        >
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Campaign</th>
                  <th className="p-3">Platform</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Spend</th>
                  <th className="p-3">Leads</th>
                  <th className="p-3">Revenue</th>
                  <th className="p-3">ROAS</th>
                  <th className="p-3">ROI</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.campaigns.map((row, index) => {
                  const spend = campaignSpend(row);
                  const revenue = campaignRevenue(row);
                  const gross = campaignGross(row);
                  return (
                    <tr
                      key={String(row.campaign_id || index)}
                      className="hover:bg-blue-50/50"
                    >
                      <td className="p-3">
                        <div className="font-black text-slate-900">
                          {campaignName(row)}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          {text(row.service_category || row.service)}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge tone={tone(row.platform)}>
                          {text(row.platform)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge tone={tone(row.approval_status || row.status)}>
                          {text(row.approval_status || row.status)}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold">{money(spend)}</td>
                      <td className="p-3 font-bold">{campaignLeads(row)}</td>
                      <td className="p-3 font-bold text-green-700">
                        {money(revenue)}
                      </td>
                      <td className="p-3 font-bold">
                        {calculateRoas(revenue, spend)}x
                      </td>
                      <td className="p-3 font-bold">
                        {pct(calculateRoi(revenue, spend, gross))}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCampaign("submit_for_review", row)
                            }
                            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCampaign("super_admin_approve", row)
                            }
                            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCampaign("super_admin_takeover", row)
                            }
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                          >
                            Takeover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!state.campaigns.length ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-6 text-center text-sm font-black text-slate-500"
                    >
                      No live campaigns found. / 暂无真实广告记录。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Connected Accounts / 广告账号" subtitle="">
          <div className="space-y-3">
            {state.accounts.map((a, i) => (
              <div
                key={String(a.ad_account_id || i)}
                className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
              >
                <div className="font-black text-slate-900">
                  {text(a.account_name)}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge tone={tone(a.platform)}>{text(a.platform)}</Badge>
                  <Badge tone={tone(a.connection_status || a.status)}>
                    {text(a.connection_status || a.status)}
                  </Badge>
                </div>
                <div className="mt-2 text-xs font-bold text-slate-500">
                  {text(a.sync_mode)} · {text(a.currency)} · {text(a.timezone)}
                </div>
              </div>
            ))}
            {!state.accounts.length ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-500 ring-1 ring-slate-200">
                No live ad accounts found. / 暂无真实广告账号。
              </div>
            ) : null}
          </div>
        </SectionCard>
        <SectionCard title="AI Suggestions / AI 广告建议" subtitle="">
          <div className="space-y-3">
            {state.suggestions.map((s, i) => (
              <div
                key={String(s.suggestion_id || i)}
                className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100"
              >
                <div className="text-xs font-black uppercase text-amber-700">
                  {text(s.suggestion_type)}
                </div>
                <div className="mt-1 font-black text-slate-900">
                  {text(s.title)}
                </div>
                <textarea
                  className={`${inputClass} mt-2 min-h-20 bg-white text-xs`}
                  defaultValue={text(s.editable_text || s.summary, "")}
                />
              </div>
            ))}
            {!state.suggestions.length ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-500 ring-1 ring-slate-200">
                No live AI suggestions found. / 暂无真实 AI 建议。
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

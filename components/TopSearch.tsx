'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { createBrowserClient } from '@/lib/supabase/browser';

const filterOptions = ['All', 'Customers', 'Leads', 'Jobs', 'Invoices', 'Warranties', 'AI Logs', 'Backups', 'Audit Logs'];

type SearchResult = {
  type: string;
  title: string;
  subtitle: string;
  href: string;
  status: string | null;
  created_at: string | null;
};

export function TopSearch() {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const term = query.trim();

    if (!searchOpen || term.length < 2) {
      setResults([]);
      setMessage('');
      setLoading(false);
      return () => controller.abort();
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setMessage('');
      try {
        const supabase = createBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          setResults([]);
          setMessage('Login session required for Global Search. / 全局搜索需要登录会话。');
          return;
        }

        const params = new URLSearchParams({ q: term, category: category.toLowerCase() });
        const response = await fetch(`/api/global-search?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          setResults([]);
          setMessage(payload.error ?? 'Search failed. / 搜索失败。');
          return;
        }
        setResults(payload.results ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setMessage('Search is temporarily unavailable. / 搜索暂时不可用。');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, searchOpen]);

  function toggleSearch() {
    setSearchOpen((open) => {
      const next = !open;
      if (next) {
        window.setTimeout(() => inputRef.current?.focus(), 40);
      } else {
        setFiltersOpen(false);
        setQuery('');
        setResults([]);
        setMessage('');
      }
      return next;
    });
  }

  return (
    <header id="global-search" className="sticky top-0 z-20 scroll-mt-24 border-b border-slate-200 bg-white/90 backdrop-blur">
      <span id="global-search-1" className="sr-only">Global Search Input</span>
      <span id="global-search-2" className="sr-only">Collapsible Category Filters</span>
      <span id="global-search-3" className="sr-only">RLS-Filtered Result Groups</span>
      <span id="global-search-4" className="sr-only">Permission-Controlled Deep Links</span>
      <span id="global-search-5" className="sr-only">Search Click Export Audit Logs</span>
      <div className="flex min-h-20 flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="shrink-0 xl:max-w-[360px]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-activeBlue">NANOFIX V28 Command</div>
            <h1 className="text-xl font-black text-slate-900">Admin Backend / 总后台管理系统</h1>
          </div>

          <div className="w-full xl:max-w-[960px] 2xl:max-w-[1120px]">
            <button
              type="button"
              onClick={toggleSearch}
              aria-expanded={searchOpen}
              aria-controls="global-search-panel"
              className="ml-auto flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-left text-sm font-black text-slate-800 shadow-sm transition hover:border-activeBlue hover:bg-blue-50 xl:max-w-none"
            >
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-activeBlue text-white">⌕</span>
                <span>
                  <span className="block">Global Search / 全局搜索</span>
                  <span className="block text-xs font-semibold text-slate-500">JWT + profiles.role protected search across customers, leads, jobs, invoices and logs</span>
                </span>
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-activeBlue shadow-sm">{searchOpen ? 'Collapse ▴' : 'Expand ▾'}</span>
            </button>

            {searchOpen && (
              <div id="global-search-panel" className="relative mt-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-soft">
                <label className="sr-only" htmlFor="global-search-input">Global Search</label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="global-search-input"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search customers, leads, jobs, invoices, warranties, AI logs, backups..."
                    className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 pr-40 text-sm font-semibold outline-none ring-activeBlue/20 transition focus:border-activeBlue focus:ring-4"
                  />
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((value) => !value)}
                    className="absolute right-2 top-2 rounded-xl bg-activeBlue px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                  >
                    {filtersOpen ? 'Hide Filters ▴' : 'Show Filters ▾'}
                  </button>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">Default status: collapsed. Results are permission-checked and search actions are written to audit logs.</p>
                {filtersOpen && (
                  <div className="mt-3 grid grid-flow-col auto-cols-max items-center justify-start gap-2 overflow-x-auto whitespace-nowrap pb-1">
                    {filterOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${category === item ? 'bg-activeBlue text-white' : 'bg-slate-100 text-blue-800'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
                {(loading || message || results.length > 0) && (
                  <div className="absolute left-3 right-3 top-20 z-40 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Permission-controlled deep links</span>
                      <Badge tone="green">JWT + RLS ready</Badge>
                    </div>
                    {loading ? <div className="rounded-xl bg-adminBg px-3 py-2 text-sm font-medium text-slate-700">Searching... / 搜索中...</div> : null}
                    {message ? <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{message}</div> : null}
                    <div className="space-y-2">
                      {results.map((result) => (
                        <Link key={`${result.type}-${result.href}`} href={result.href} className="block rounded-xl bg-adminBg px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-blue-50">
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-black">{result.title}</span>
                            {result.status ? <Badge tone="blue">{result.status}</Badge> : null}
                          </span>
                          <span className="mt-0.5 block text-xs font-semibold text-slate-500">{result.type} · {result.subtitle}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

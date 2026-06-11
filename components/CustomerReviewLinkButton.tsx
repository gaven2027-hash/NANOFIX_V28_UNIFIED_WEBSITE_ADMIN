'use client';

import { useEffect, useState } from 'react';

type ReviewLink = {
  review_link_id: string;
  provider_key: string;
  label_en: string;
  label_zh: string;
  review_url: string;
  help_text_en?: string | null;
  help_text_zh?: string | null;
  open_in_new_tab?: boolean;
};

export function CustomerReviewLinkButton() {
  const [links, setLinks] = useState<ReviewLink[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch('/api/customer/review-links', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (active && json.ok && Array.isArray(json.links)) setLinks(json.links);
    }
    void load();
    return () => { active = false; };
  }, []);

  if (!links.length) return null;

  return (
    <div id="submit-review-link" className="mt-4 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-100">
      <div className="text-sm font-black text-slate-950">Leave a Review / 我要评论</div>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Click the button below to open the official review page. / 点击下方按钮直接打开官方评论页面。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.review_link_id}
            href={link.review_url}
            target={link.open_in_new_tab === false ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            {link.label_en} / {link.label_zh}
          </a>
        ))}
      </div>
    </div>
  );
}

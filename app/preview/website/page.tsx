import type { Metadata } from 'next';
import { LegacyWebsitePage, type LegacyLocale } from '@/components/LegacyWebsitePage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Website Preview',
  description: 'Noindex internal preview for NANOFIX Website Management.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

function cleanRoute(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const route = (raw || '/').trim();
  const safe = route.startsWith('/') ? route : `/${route}`;
  return safe.replace(/[^a-zA-Z0-9/_#?&=.-]/g, '').slice(0, 240) || '/';
}

function cleanLocale(value: string | string[] | undefined): LegacyLocale {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'zh' ? 'zh' : 'en';
}

export default function WebsitePreviewPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const routePath = cleanRoute(searchParams?.route_path);
  const locale = cleanLocale(searchParams?.locale);
  const blockKey = Array.isArray(searchParams?.block_key) ? searchParams?.block_key[0] : searchParams?.block_key || 'main';

  return (
    <>
      <meta name="robots" content="noindex,nofollow,noarchive,noimageindex" />
      <div data-preview-route="website" data-preview-block-key={blockKey} data-preview-mode="published_preview">
        <LegacyWebsitePage routePath={routePath} locale={locale} homeHref="/" />
      </div>
    </>
  );
}

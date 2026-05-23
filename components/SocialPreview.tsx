import { socialDrafts } from '@/data/adminData';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

export function SocialPreview() {
  return (
    <SectionCard title="Unified Multi-Platform AI Review / 多平台并排模拟预览" subtitle="AI creates separate drafts by platform, but cannot auto-publish. Admin can edit, regenerate, approve, reject or schedule per platform.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {socialDrafts.map((draft) => (
          <article key={draft.platform} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-900 to-blue-700 p-5 text-center text-white">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">{draft.platform}</div>
                <div className="mt-3 text-xl font-black">{draft.title}</div>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2"><Badge tone="cyan">{draft.ratio}</Badge><Badge tone={draft.status === 'Approved' ? 'green' : draft.status === 'Needs Edit' ? 'amber' : 'blue'}>{draft.status}</Badge></div>
              <p className="text-sm font-semibold text-slate-800">CTA: {draft.cta}</p>
              <p className="text-xs text-slate-500">{draft.hashtags}</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <button className="rounded-xl bg-slate-100 px-2 py-2 text-slate-700">Edit / 编辑</button>
                <button className="rounded-xl bg-blue-50 px-2 py-2 text-blue-700">Regenerate / 重新生成</button>
                <button className="rounded-xl bg-emerald-50 px-2 py-2 text-emerald-700">Approve / 批准</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

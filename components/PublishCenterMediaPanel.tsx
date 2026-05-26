'use client';

import { MediaSourcePicker } from './MediaSourcePicker';
import { Badge } from './Badge';

type Row = Record<string, unknown>;

type Props = {
  mediaAssets: Row[];
  onChange: (assets: Row[]) => void;
  onAssetApplied?: (asset: Row) => void;
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function mediaAssetPayload(asset: Row) {
  return {
    asset_id: asset.asset_id,
    source_type: asset.source_type,
    asset_url: asset.asset_url,
    storage_path: asset.storage_path,
    mime_type: asset.mime_type,
    alt_text: asset.alt_text,
    title: asset.title,
    selected_at: new Date().toISOString()
  };
}

export function PublishCenterMediaPanel({ mediaAssets, onChange, onAssetApplied }: Props) {
  function add(asset: Row) {
    const payload = mediaAssetPayload(asset);
    onChange([...mediaAssets, payload]);
    onAssetApplied?.(payload);
  }

  function remove(assetId: unknown) {
    onChange(mediaAssets.filter((asset) => String(asset.asset_id) !== String(assetId)));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Selected Publish Media Package / 已选择发布素材包</div>
          <Badge tone={mediaAssets.length ? 'cyan' : 'amber'}>{mediaAssets.length} media</Badge>
        </div>
        <div className="space-y-2">
          {mediaAssets.map((asset) => (
            <div key={String(asset.asset_id)} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">{formatValue(asset.title || asset.asset_url || asset.storage_path)}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{formatValue(asset.mime_type)} · {formatValue(asset.source_type)}</div>
                  <div className="mt-1 break-all text-xs font-semibold text-blue-700">{formatValue(asset.asset_url || asset.storage_path)}</div>
                </div>
                <button type="button" onClick={() => remove(asset.asset_id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100">Remove</button>
              </div>
            </div>
          ))}
          {!mediaAssets.length ? <div className="text-sm font-bold text-slate-500">No publish media selected. / 暂无发布素材。</div> : null}
        </div>
      </div>

      <MediaSourcePicker
        moduleKey="publish_center"
        usageContext="final_publish_package"
        title="Publish Package Media Source / 发布素材包来源"
        helper="Attach final images, GIFs, videos, PDFs or thumbnails for this publish item using local upload, URL import or media library. / 为最终发布项目绑定图片、GIF、视频、PDF 或封面，支持本地上传、URL 和素材库。"
        onSelect={add}
        compact
      />
    </div>
  );
}

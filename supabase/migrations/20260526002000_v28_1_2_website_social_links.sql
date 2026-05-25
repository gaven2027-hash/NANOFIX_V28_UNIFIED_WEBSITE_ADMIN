create table if not exists public.website_social_links (
  website_social_link_id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text,
  icon_key text,
  display_order integer not null default 0,
  placement text not null default 'footer',
  is_active boolean not null default true,
  open_new_tab boolean not null default true,
  rel_attr text not null default 'noopener noreferrer',
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists website_social_links_platform_placement_uidx
  on public.website_social_links(platform, placement);

create index if not exists website_social_links_active_order_idx
  on public.website_social_links(is_active, display_order, platform);

alter table public.website_social_links enable row level security;

drop policy if exists website_social_links_admin_all on public.website_social_links;
create policy website_social_links_admin_all
  on public.website_social_links
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role in ('super_admin','operations_admin','content_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role in ('super_admin','operations_admin','content_admin')
    )
  );

insert into public.website_social_links (platform, label, icon_key, display_order, placement, is_active, notes)
values
  ('facebook', 'Facebook', 'facebook', 1, 'footer', true, 'Website footer social link. Replace URL in Website Management.'),
  ('instagram', 'Instagram', 'instagram', 2, 'footer', true, 'Website footer social link. Replace URL in Website Management.'),
  ('tiktok', 'TikTok', 'tiktok', 3, 'footer', true, 'Website footer social link. Replace URL in Website Management.'),
  ('youtube', 'YouTube', 'youtube', 4, 'footer', true, 'Website footer social link. Replace URL in Website Management.')
on conflict (platform, placement) do nothing;

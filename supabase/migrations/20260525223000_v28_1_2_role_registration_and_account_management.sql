alter table public.profiles add column if not exists profile_status text not null default 'active';
alter table public.profiles add column if not exists review_status text not null default 'approved';
alter table public.profiles add column if not exists reviewed_by uuid;
alter table public.profiles add column if not exists reviewed_at timestamptz;
alter table public.profiles add column if not exists account_admin_note text;
alter table public.profiles add column if not exists requested_role text;
alter table public.profiles add column if not exists registration_source text not null default 'admin_created';
alter table public.profiles add column if not exists invited_by uuid;
alter table public.profiles add column if not exists invited_at timestamptz;
alter table public.profiles add column if not exists approved_role text;

alter table public.profiles drop constraint if exists profiles_profile_status_check;
alter table public.profiles add constraint profiles_profile_status_check check (profile_status in ('active','disabled','frozen','blacklisted','archived'));

alter table public.profiles drop constraint if exists profiles_review_status_check;
alter table public.profiles add constraint profiles_review_status_check check (review_status in ('pending_review','approved','rejected'));

alter table public.profiles drop constraint if exists profiles_requested_role_check;
alter table public.profiles add constraint profiles_requested_role_check check (requested_role is null or requested_role in ('customer','engineer','admin'));

alter table public.profiles drop constraint if exists profiles_approved_role_check;
alter table public.profiles add constraint profiles_approved_role_check check (approved_role is null or approved_role in ('customer','engineer','admin','super_admin'));

alter table public.profiles drop constraint if exists profiles_registration_source_check;
alter table public.profiles add constraint profiles_registration_source_check check (registration_source in ('self_customer','self_engineer','self_admin','admin_created','admin_invited'));

create index if not exists profiles_profile_status_idx on public.profiles(profile_status);
create index if not exists profiles_review_status_idx on public.profiles(review_status);
create index if not exists profiles_role_status_idx on public.profiles(role, profile_status, review_status);
create index if not exists profiles_requested_role_idx on public.profiles(requested_role);
create index if not exists profiles_registration_source_idx on public.profiles(registration_source);
create index if not exists profiles_requested_review_idx on public.profiles(requested_role, review_status, profile_status);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text;
  source text;
  existing_profile_id uuid;
begin
  requested := coalesce(new.raw_user_meta_data ->> 'requested_role', 'customer');
  if requested not in ('customer','engineer','admin') then
    requested := 'customer';
  end if;

  source := case requested
    when 'engineer' then 'self_engineer'
    when 'admin' then 'self_admin'
    else 'self_customer'
  end;

  select profile_id into existing_profile_id
  from public.profiles
  where lower(email) = lower(coalesce(new.email, ''))
    and auth_user_id is null
  order by created_at asc
  limit 1;

  if existing_profile_id is not null then
    update public.profiles
    set
      auth_user_id = new.id,
      email = new.email,
      full_name = coalesce(public.profiles.full_name, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
      username = coalesce(public.profiles.username, nullif(new.raw_user_meta_data ->> 'username', '')),
      mobile_phone = coalesce(public.profiles.mobile_phone, nullif(new.raw_user_meta_data ->> 'mobile_phone', '')),
      whatsapp_phone = coalesce(public.profiles.whatsapp_phone, nullif(new.raw_user_meta_data ->> 'whatsapp_phone', '')),
      password_status = 'set',
      updated_at = now()
    where profile_id = existing_profile_id;
    return new;
  end if;

  insert into public.profiles (
    auth_user_id,
    email,
    full_name,
    username,
    mobile_phone,
    whatsapp_phone,
    role,
    requested_role,
    approved_role,
    registration_source,
    is_active,
    profile_status,
    review_status,
    password_status,
    email_verified,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'mobile_phone', ''),
    nullif(new.raw_user_meta_data ->> 'whatsapp_phone', ''),
    requested,
    requested,
    null,
    source,
    false,
    'disabled',
    'pending_review',
    'set',
    false,
    now(),
    now()
  )
  on conflict (auth_user_id) do update set
    email = excluded.email,
    requested_role = coalesce(public.profiles.requested_role, excluded.requested_role),
    registration_source = coalesce(public.profiles.registration_source, excluded.registration_source),
    updated_at = now();

  return new;
end;
$$;

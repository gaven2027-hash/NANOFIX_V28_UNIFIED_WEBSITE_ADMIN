-- NANOFIX V28.1.3 Message Inbox Reply Workflow
-- Adds production-ready fields for WhatsApp / social DM / comments / website live chat handling.
-- AI remains advisory only. Human approval is required before API dispatch.

create table if not exists public.social_messages (
  message_id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(lead_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  channel text not null default 'manual',
  external_message_id text,
  direction text not null default 'inbound' check (direction in ('inbound','outbound','internal_note')),
  body text,
  risk_level text not null default 'normal',
  handling_status text not null default 'new' check (handling_status in ('new','pending_review','in_progress','converted_to_lead','replied','closed','spam','archived')),
  follow_up_note text,
  handled_by uuid,
  handled_at timestamptz,
  lead_conversion_status text not null default 'not_converted' check (lead_conversion_status in ('not_converted','suggested','converted','not_relevant')),
  created_at timestamptz not null default now()
);

alter table public.social_messages enable row level security;

alter table public.social_messages add column if not exists message_kind text not null default 'private_message';
alter table public.social_messages add column if not exists platform_message_type text;
alter table public.social_messages add column if not exists external_thread_id text;
alter table public.social_messages add column if not exists external_sender_id text;
alter table public.social_messages add column if not exists external_sender_name text;
alter table public.social_messages add column if not exists contact_name text;
alter table public.social_messages add column if not exists contact_phone text;
alter table public.social_messages add column if not exists contact_whatsapp text;
alter table public.social_messages add column if not exists contact_email text;
alter table public.social_messages add column if not exists source_url text;
alter table public.social_messages add column if not exists platform_payload jsonb not null default '{}'::jsonb;
alter table public.social_messages add column if not exists customer_match_suggestions jsonb not null default '[]'::jsonb;
alter table public.social_messages add column if not exists ai_intent text;
alter table public.social_messages add column if not exists ai_summary text;
alter table public.social_messages add column if not exists ai_reply_suggestion text;
alter table public.social_messages add column if not exists ai_suggested_action text;
alter table public.social_messages add column if not exists ai_confidence_percent numeric(5,2) not null default 0;
alter table public.social_messages add column if not exists risk_score_percent numeric(5,2) not null default 0;
alter table public.social_messages add column if not exists sentiment text;
alter table public.social_messages add column if not exists urgency_reason text;
alter table public.social_messages add column if not exists reply_status text not null default 'not_started';
alter table public.social_messages add column if not exists last_reply_id uuid;
alter table public.social_messages add column if not exists assigned_to uuid;
alter table public.social_messages add column if not exists sla_due_at timestamptz;
alter table public.social_messages add column if not exists sla_status text not null default 'on_track';
alter table public.social_messages add column if not exists escalated_at timestamptz;
alter table public.social_messages add column if not exists escalation_reason text;
alter table public.social_messages add column if not exists updated_at timestamptz not null default now();

create table if not exists public.social_message_replies (
  reply_id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.social_messages(message_id) on delete cascade,
  channel text not null default 'manual',
  external_message_id text,
  external_reply_id text,
  provider text not null default 'manual',
  reply_body text not null,
  reply_type text not null default 'draft' check (reply_type in ('draft','manual_sent','api_queued','api_sent','failed','internal_note')),
  dispatch_status text not null default 'draft' check (dispatch_status in ('draft','manual_required','queued','sent','failed','blocked')),
  provider_payload jsonb not null default '{}'::jsonb,
  ai_generated boolean not null default false,
  human_approved boolean not null default false,
  created_by uuid,
  approved_by uuid,
  sent_by uuid,
  sent_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_message_replies enable row level security;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'social_messages_message_kind_chk') then
    alter table public.social_messages add constraint social_messages_message_kind_chk check (message_kind in ('private_message','public_comment','public_review','whatsapp_message','website_live_chat','forum_reply','system_alert','manual_note'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_messages_reply_status_chk') then
    alter table public.social_messages add constraint social_messages_reply_status_chk check (reply_status in ('not_started','drafted','pending_human_review','manual_required','queued','sent','failed','not_needed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_messages_sla_status_chk') then
    alter table public.social_messages add constraint social_messages_sla_status_chk check (sla_status in ('on_track','due_soon','overdue','closed','paused'));
  end if;
end $$;

create index if not exists social_messages_channel_idx on public.social_messages(channel);
create index if not exists social_messages_external_message_id_idx on public.social_messages(external_message_id);
create index if not exists social_messages_external_thread_id_idx on public.social_messages(external_thread_id);
create index if not exists social_messages_message_kind_idx on public.social_messages(message_kind);
create index if not exists social_messages_handling_status_idx on public.social_messages(handling_status);
create index if not exists social_messages_reply_status_idx on public.social_messages(reply_status);
create index if not exists social_messages_sla_due_at_idx on public.social_messages(sla_due_at);
create index if not exists social_messages_created_at_idx on public.social_messages(created_at);
create index if not exists social_message_replies_message_id_idx on public.social_message_replies(message_id);
create index if not exists social_message_replies_dispatch_status_idx on public.social_message_replies(dispatch_status);
create index if not exists social_message_replies_created_at_idx on public.social_message_replies(created_at);

create or replace function public.nanofix_social_message_set_sla()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();

  if new.direction = 'inbound' and new.sla_due_at is null then
    if lower(coalesce(new.risk_level, 'normal')) in ('critical','high') then
      new.sla_due_at := coalesce(new.created_at, now()) + interval '15 minutes';
    elsif lower(coalesce(new.risk_level, 'normal')) in ('medium','warning') then
      new.sla_due_at := coalesce(new.created_at, now()) + interval '30 minutes';
    else
      new.sla_due_at := coalesce(new.created_at, now()) + interval '4 hours';
    end if;
  end if;

  if new.handling_status in ('replied','closed','spam','archived') then
    new.sla_status := 'closed';
  elsif new.sla_due_at is not null and now() > new.sla_due_at then
    new.sla_status := 'overdue';
  elsif new.sla_due_at is not null and now() > (new.sla_due_at - interval '10 minutes') then
    new.sla_status := 'due_soon';
  else
    new.sla_status := coalesce(new.sla_status, 'on_track');
  end if;

  return new;
end;
$$;

drop trigger if exists social_messages_set_sla_trigger on public.social_messages;
create trigger social_messages_set_sla_trigger
before insert or update on public.social_messages
for each row execute function public.nanofix_social_message_set_sla();

create or replace function public.nanofix_social_reply_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();

  if new.ai_generated = true
     and coalesce(new.human_approved, false) = false
     and new.dispatch_status in ('queued','sent') then
    raise exception 'AI-generated replies require human_approved=true before dispatch.' using errcode = '42501';
  end if;

  if new.dispatch_status = 'sent' and new.sent_at is null then
    new.sent_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists social_message_replies_guard_trigger on public.social_message_replies;
create trigger social_message_replies_guard_trigger
before insert or update on public.social_message_replies
for each row execute function public.nanofix_social_reply_guard();

drop policy if exists social_messages_admin_all on public.social_messages;
create policy social_messages_admin_all on public.social_messages for all
using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')))
with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));

drop policy if exists social_message_replies_admin_all on public.social_message_replies;
create policy social_message_replies_admin_all on public.social_message_replies for all
using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')))
with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));

grant select, insert, update on public.social_messages to authenticated;
grant select, insert, update on public.social_message_replies to authenticated;
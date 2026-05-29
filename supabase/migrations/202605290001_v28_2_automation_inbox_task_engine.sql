-- NANOFIX V28.2 Automation & Notification Engine → Internal Inbox → Unified Task Engine
-- Date: 2026-05-29
-- Purpose: real Supabase tables, RLS, indexes and transactional helper RPC for cross-module task handling.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.nanofix_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.automation_rules (
  rule_id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  name text not null,
  module text not null,
  trigger_event text not null,
  conditions_json jsonb not null default '{}'::jsonb,
  channels text[] not null default array['internal']::text[],
  target_roles text[] not null default array['operations_admin']::text[],
  is_enabled boolean not null default true,
  priority text not null default 'P2',
  created_by uuid references public.profiles(profile_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_rules_priority_check check (priority in ('P0','P1','P2','P3'))
);

drop trigger if exists automation_rules_touch_updated_at on public.automation_rules;
create trigger automation_rules_touch_updated_at before update on public.automation_rules for each row execute function public.nanofix_touch_updated_at();

create table if not exists public.notification_outbox (
  notification_id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.automation_rules(rule_id) on delete set null,
  channel text not null default 'internal',
  recipient_profile_id uuid references public.profiles(profile_id) on delete set null,
  recipient_customer_id uuid references public.customers(customer_id) on delete set null,
  target_role text,
  subject text not null,
  body text not null,
  payload_json jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'queued',
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  related_object_type text,
  related_object_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_outbox_status_check check (delivery_status in ('queued','processing','sent','failed','cancelled'))
);

drop trigger if exists notification_outbox_touch_updated_at on public.notification_outbox;
create trigger notification_outbox_touch_updated_at before update on public.notification_outbox for each row execute function public.nanofix_touch_updated_at();

create table if not exists public.unified_tasks (
  task_id uuid primary key default gen_random_uuid(),
  source_module text not null,
  source_table text,
  source_id text,
  title text not null,
  description text,
  status text not null default 'open',
  priority text not null default 'P2',
  assignee_profile_id uuid references public.profiles(profile_id) on delete set null,
  assignee_role text,
  due_at timestamptz,
  sla_minutes integer,
  escalated_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(profile_id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unified_tasks_status_check check (status in ('open','in_progress','review','blocked','completed','cancelled')),
  constraint unified_tasks_priority_check check (priority in ('P0','P1','P2','P3')),
  constraint unified_tasks_sla_check check (sla_minutes is null or sla_minutes >= 0)
);

drop trigger if exists unified_tasks_touch_updated_at on public.unified_tasks;
create trigger unified_tasks_touch_updated_at before update on public.unified_tasks for each row execute function public.nanofix_touch_updated_at();

create table if not exists public.internal_inbox_messages (
  message_id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid references public.profiles(profile_id) on delete set null,
  recipient_role text,
  sender_profile_id uuid references public.profiles(profile_id) on delete set null,
  subject text not null,
  body text not null,
  category text not null default 'general',
  priority text not null default 'P2',
  read_at timestamptz,
  acknowledged_at timestamptz,
  related_object_type text,
  related_object_id text,
  task_id uuid references public.unified_tasks(task_id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_inbox_priority_check check (priority in ('P0','P1','P2','P3'))
);

drop trigger if exists internal_inbox_messages_touch_updated_at on public.internal_inbox_messages;
create trigger internal_inbox_messages_touch_updated_at before update on public.internal_inbox_messages for each row execute function public.nanofix_touch_updated_at();

create table if not exists public.task_events (
  event_id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.unified_tasks(task_id) on delete cascade,
  actor_id uuid references public.profiles(profile_id) on delete set null,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists automation_rules_module_trigger_idx on public.automation_rules(module, trigger_event);
create index if not exists automation_rules_enabled_idx on public.automation_rules(is_enabled) where is_enabled = true;
create index if not exists notification_outbox_status_scheduled_idx on public.notification_outbox(delivery_status, scheduled_at);
create index if not exists notification_outbox_target_role_idx on public.notification_outbox(target_role, created_at desc);
create index if not exists internal_inbox_recipient_profile_idx on public.internal_inbox_messages(recipient_profile_id, created_at desc);
create index if not exists internal_inbox_recipient_role_idx on public.internal_inbox_messages(recipient_role, created_at desc);
create index if not exists internal_inbox_unread_idx on public.internal_inbox_messages(recipient_role, created_at desc) where read_at is null and archived_at is null;
create index if not exists unified_tasks_status_priority_idx on public.unified_tasks(status, priority, due_at);
create index if not exists unified_tasks_assignee_profile_idx on public.unified_tasks(assignee_profile_id, created_at desc);
create index if not exists unified_tasks_assignee_role_idx on public.unified_tasks(assignee_role, created_at desc);
create index if not exists unified_tasks_source_idx on public.unified_tasks(source_module, source_table, source_id);
create index if not exists task_events_task_idx on public.task_events(task_id, created_at desc);

alter table public.automation_rules enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.internal_inbox_messages enable row level security;
alter table public.unified_tasks enable row level security;
alter table public.task_events enable row level security;

drop policy if exists "internal roles can read automation rules" on public.automation_rules;
create policy "internal roles can read automation rules" on public.automation_rules for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','content_admin','support','engineer')));

drop policy if exists "automation managers can write automation rules" on public.automation_rules;
create policy "automation managers can write automation rules" on public.automation_rules for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','content_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','content_admin','support')));

drop policy if exists "internal roles can read notification outbox" on public.notification_outbox;
create policy "internal roles can read notification outbox" on public.notification_outbox for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','content_admin','support','engineer')));

drop policy if exists "automation managers can write notification outbox" on public.notification_outbox;
create policy "automation managers can write notification outbox" on public.notification_outbox for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','content_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','content_admin','support')));

drop policy if exists "internal inbox recipients and managers can read" on public.internal_inbox_messages;
create policy "internal inbox recipients and managers can read" on public.internal_inbox_messages for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and (p.role in ('super_admin','operations_admin','support') or p.profile_id = recipient_profile_id or p.role = recipient_role)));

drop policy if exists "internal roles can create inbox messages" on public.internal_inbox_messages;
create policy "internal roles can create inbox messages" on public.internal_inbox_messages for insert with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','content_admin','support','engineer')));

drop policy if exists "internal inbox recipients and managers can update" on public.internal_inbox_messages;
create policy "internal inbox recipients and managers can update" on public.internal_inbox_messages for update using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and (p.role in ('super_admin','operations_admin','support') or p.profile_id = recipient_profile_id or p.role = recipient_role))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and (p.role in ('super_admin','operations_admin','support') or p.profile_id = recipient_profile_id or p.role = recipient_role)));

drop policy if exists "internal task owners and managers can read" on public.unified_tasks;
create policy "internal task owners and managers can read" on public.unified_tasks for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and (p.role in ('super_admin','operations_admin','support') or p.profile_id = assignee_profile_id or p.role = assignee_role)));

drop policy if exists "internal roles can create unified tasks" on public.unified_tasks;
create policy "internal roles can create unified tasks" on public.unified_tasks for insert with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','content_admin','support','engineer')));

drop policy if exists "internal task owners and managers can update" on public.unified_tasks;
create policy "internal task owners and managers can update" on public.unified_tasks for update using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and (p.role in ('super_admin','operations_admin','support') or p.profile_id = assignee_profile_id or p.role = assignee_role))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and (p.role in ('super_admin','operations_admin','support') or p.profile_id = assignee_profile_id or p.role = assignee_role)));

drop policy if exists "task event participants can read" on public.task_events;
create policy "task event participants can read" on public.task_events for select using (exists (select 1 from public.unified_tasks t join public.profiles p on p.auth_user_id = auth.uid() where t.task_id = task_events.task_id and p.is_active = true and (p.role in ('super_admin','operations_admin','support') or p.profile_id = t.assignee_profile_id or p.role = t.assignee_role)));

drop policy if exists "internal roles can create task events" on public.task_events;
create policy "internal roles can create task events" on public.task_events for insert with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance','content_admin','support','engineer')));

grant select, insert, update on public.automation_rules to authenticated;
grant select, insert, update on public.notification_outbox to authenticated;
grant select, insert, update on public.internal_inbox_messages to authenticated;
grant select, insert, update on public.unified_tasks to authenticated;
grant select, insert on public.task_events to authenticated;

create or replace function public.create_unified_task_with_inbox(
  p_source_module text,
  p_title text,
  p_description text default null,
  p_source_table text default null,
  p_source_id text default null,
  p_priority text default 'P2',
  p_assignee_role text default null,
  p_due_at timestamptz default null,
  p_sla_minutes integer default null,
  p_inbox_subject text default null,
  p_inbox_body text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_actor_role text;
  v_task_id uuid;
begin
  select profile_id, role into v_actor_profile_id, v_actor_role from public.profiles where auth_user_id = auth.uid() and is_active = true limit 1;

  if v_actor_profile_id is null or v_actor_role not in ('super_admin','operations_admin','finance','content_admin','support','engineer') then
    raise exception 'NANOFIX internal role required';
  end if;

  insert into public.unified_tasks (source_module, source_table, source_id, title, description, priority, assignee_role, due_at, sla_minutes, created_by)
  values (p_source_module, p_source_table, p_source_id, p_title, p_description, coalesce(p_priority, 'P2'), p_assignee_role, p_due_at, p_sla_minutes, v_actor_profile_id)
  returning task_id into v_task_id;

  insert into public.task_events (task_id, actor_id, action, after_json)
  values (v_task_id, v_actor_profile_id, 'created_with_inbox_rpc', jsonb_build_object('source_module', p_source_module, 'title', p_title, 'assignee_role', p_assignee_role));

  if p_inbox_subject is not null and p_inbox_body is not null then
    insert into public.internal_inbox_messages (recipient_role, sender_profile_id, subject, body, category, priority, related_object_type, related_object_id, task_id)
    values (p_assignee_role, v_actor_profile_id, p_inbox_subject, p_inbox_body, 'task', coalesce(p_priority, 'P2'), coalesce(p_source_table, 'unified_task'), coalesce(p_source_id, v_task_id::text), v_task_id);
  end if;

  return v_task_id;
end;
$$;

revoke all on function public.create_unified_task_with_inbox(text,text,text,text,text,text,text,timestamptz,integer,text,text) from public;
grant execute on function public.create_unified_task_with_inbox(text,text,text,text,text,text,text,timestamptz,integer,text,text) to authenticated;

-- NANOFIX V28.2 Workflow Settings
-- Date: 2026-05-29
-- Purpose: settings for Automation Rule Settings, Notification Channel Settings and Unified Task SLA Settings.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.workflow_settings (
  setting_id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_type text not null,
  name text not null,
  description text,
  value_json jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  updated_by uuid references public.profiles(profile_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_settings_type_check check (setting_type in ('automation_rule_setting','notification_channel','unified_task_sla','escalation_rule'))
);

drop trigger if exists workflow_settings_touch_updated_at on public.workflow_settings;
create trigger workflow_settings_touch_updated_at before update on public.workflow_settings for each row execute function public.nanofix_touch_updated_at();

create index if not exists workflow_settings_type_idx on public.workflow_settings(setting_type, is_enabled, updated_at desc);

alter table public.workflow_settings enable row level security;

drop policy if exists "internal roles can read workflow settings" on public.workflow_settings;
create policy "internal roles can read workflow settings" on public.workflow_settings for select using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','finance','content_admin','support','engineer')
  )
);

drop policy if exists "workflow managers can write workflow settings" on public.workflow_settings;
create policy "workflow managers can write workflow settings" on public.workflow_settings for all using (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','content_admin','support')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin','operations_admin','content_admin','support')
  )
);

grant select, insert, update on public.workflow_settings to authenticated;

insert into public.workflow_settings (setting_key, setting_type, name, description, value_json, is_enabled)
values
  (
    'notification.channel.internal.default',
    'notification_channel',
    'Internal Inbox default channel',
    'Default internal notification delivery into Internal Inbox.',
    '{"channel":"internal","requires_acknowledgement":true,"retry_minutes":[5,15,60],"max_attempts":3}'::jsonb,
    true
  ),
  (
    'notification.channel.email.operations',
    'notification_channel',
    'Operations email escalation channel',
    'Email notification policy for Operations escalation.',
    '{"channel":"email","target_role":"operations_admin","enabled_in_production":true,"max_attempts":3,"quiet_hours":{"start":"22:00","end":"08:00","timezone":"Asia/Singapore"}}'::jsonb,
    true
  ),
  (
    'unified_task.sla.p0.repair_triage',
    'unified_task_sla',
    'P0 repair triage SLA',
    'SLA for urgent no-login website repair requests.',
    '{"priority":"P0","source_module":"service_operations","sla_minutes":120,"escalate_after_minutes":90,"escalate_to":"super_admin"}'::jsonb,
    true
  ),
  (
    'unified_task.sla.p1.review_redaction',
    'unified_task_sla',
    'P1 review privacy redaction SLA',
    'SLA for review privacy redaction before website display.',
    '{"priority":"P1","source_module":"customer_center","sla_minutes":480,"escalate_after_minutes":360,"escalate_to":"content_admin"}'::jsonb,
    true
  ),
  (
    'automation.rules.safe_write_policy',
    'automation_rule_setting',
    'Automation safe write policy',
    'Production policy that prevents visual-only success states and requires audit logs.',
    '{"no_fake_success":true,"no_browser_storage_state":true,"audit_required":true,"write_api_required":true}'::jsonb,
    true
  )
on conflict (setting_key) do update set
  setting_type = excluded.setting_type,
  name = excluded.name,
  description = excluded.description,
  value_json = excluded.value_json,
  is_enabled = excluded.is_enabled,
  updated_at = now();

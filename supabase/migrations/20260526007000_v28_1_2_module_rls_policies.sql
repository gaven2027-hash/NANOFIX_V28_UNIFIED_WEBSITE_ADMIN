drop policy if exists admin_profiles_admin_select on public.admin_profiles;
create policy admin_profiles_admin_select on public.admin_profiles for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists ai_drafts_content_admin_all on public.ai_drafts;
create policy ai_drafts_content_admin_all on public.ai_drafts for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists ai_logs_admin_select on public.ai_logs;
create policy ai_logs_admin_select on public.ai_logs for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));

drop policy if exists ai_management_records_admin_all on public.ai_management_records;
create policy ai_management_records_admin_all on public.ai_management_records for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists ai_operation_versions_admin_all on public.ai_operation_versions;
create policy ai_operation_versions_admin_all on public.ai_operation_versions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists app_modules_admin_all on public.app_modules;
create policy app_modules_admin_all on public.app_modules for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists auth_otp_logs_admin_select on public.auth_otp_logs;
create policy auth_otp_logs_admin_select on public.auth_otp_logs for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists backup_jobs_admin_all on public.backup_jobs;
create policy backup_jobs_admin_all on public.backup_jobs for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin')));

drop policy if exists backup_schedules_admin_all on public.backup_schedules;
create policy backup_schedules_admin_all on public.backup_schedules for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin')));

drop policy if exists content_drafts_content_admin_all on public.content_drafts;
create policy content_drafts_content_admin_all on public.content_drafts for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists cta_config_content_admin_all on public.cta_config;
create policy cta_config_content_admin_all on public.cta_config for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists customer_auth_actions_admin_all on public.customer_auth_actions;
create policy customer_auth_actions_admin_all on public.customer_auth_actions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists customer_binding_suggestions_admin_all on public.customer_binding_suggestions;
create policy customer_binding_suggestions_admin_all on public.customer_binding_suggestions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists customer_center_records_admin_all on public.customer_center_records;
create policy customer_center_records_admin_all on public.customer_center_records for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists customer_center_versions_admin_all on public.customer_center_versions;
create policy customer_center_versions_admin_all on public.customer_center_versions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists customer_portal_versions_admin_all on public.customer_portal_versions;
create policy customer_portal_versions_admin_all on public.customer_portal_versions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists dead_letter_events_admin_select on public.dead_letter_events;
create policy dead_letter_events_admin_select on public.dead_letter_events for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists engineer_portal_versions_admin_all on public.engineer_portal_versions;
create policy engineer_portal_versions_admin_all on public.engineer_portal_versions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists entity_events_admin_select on public.entity_events;
create policy entity_events_admin_select on public.entity_events for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists form_rate_limits_admin_select on public.form_rate_limits;
create policy form_rate_limits_admin_select on public.form_rate_limits for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists global_search_documents_admin_all on public.global_search_documents;
create policy global_search_documents_admin_all on public.global_search_documents for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin')));

drop policy if exists inbound_events_admin_select on public.inbound_events;
create policy inbound_events_admin_select on public.inbound_events for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists integration_outbox_admin_select on public.integration_outbox;
create policy integration_outbox_admin_select on public.integration_outbox for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists invoice_items_finance_admin_all on public.invoice_items;
create policy invoice_items_finance_admin_all on public.invoice_items for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance')));

drop policy if exists lead_attachments_admin_all on public.lead_attachments;
create policy lead_attachments_admin_all on public.lead_attachments for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin')));

drop policy if exists module_health_events_admin_select on public.module_health_events;
create policy module_health_events_admin_select on public.module_health_events for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists otp_verifications_admin_select on public.otp_verifications;
create policy otp_verifications_admin_select on public.otp_verifications for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists password_reset_requests_admin_select on public.password_reset_requests;
create policy password_reset_requests_admin_select on public.password_reset_requests for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists payment_events_finance_admin_select on public.payment_events;
create policy payment_events_finance_admin_select on public.payment_events for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','finance')));

drop policy if exists pdpa_requests_admin_all on public.pdpa_requests;
create policy pdpa_requests_admin_all on public.pdpa_requests for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists search_logs_admin_select on public.search_logs;
create policy search_logs_admin_select on public.search_logs for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support','content_admin')));

drop policy if exists seo_routes_content_admin_all on public.seo_routes;
create policy seo_routes_content_admin_all on public.seo_routes for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists social_management_records_content_admin_all on public.social_management_records;
create policy social_management_records_content_admin_all on public.social_management_records for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin','support')));

drop policy if exists social_publish_versions_content_admin_all on public.social_publish_versions;
create policy social_publish_versions_content_admin_all on public.social_publish_versions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

drop policy if exists status_transition_logs_admin_select on public.status_transition_logs;
create policy status_transition_logs_admin_select on public.status_transition_logs for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists system_setting_records_admin_all on public.system_setting_records;
create policy system_setting_records_admin_all on public.system_setting_records for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin')));

drop policy if exists system_setting_versions_admin_all on public.system_setting_versions;
create policy system_setting_versions_admin_all on public.system_setting_versions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin')));

drop policy if exists webhook_events_admin_select on public.webhook_events;
create policy webhook_events_admin_select on public.webhook_events for select using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists webhook_retry_jobs_admin_all on public.webhook_retry_jobs;
create policy webhook_retry_jobs_admin_all on public.webhook_retry_jobs for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','operations_admin','support')));

drop policy if exists website_publish_versions_content_admin_all on public.website_publish_versions;
create policy website_publish_versions_content_admin_all on public.website_publish_versions for all using (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin'))) with check (exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.is_active = true and p.role in ('super_admin','content_admin','operations_admin')));

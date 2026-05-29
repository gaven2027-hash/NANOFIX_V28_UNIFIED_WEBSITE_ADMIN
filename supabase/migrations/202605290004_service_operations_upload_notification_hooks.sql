-- NANOFIX V28.2 Service Operations Phase A.6
-- Storage upload metadata, compression state and customer notification hook fields.

alter table public.service_upload_reviews
  add column if not exists compression_status text not null default 'pending_client_compression',
  add column if not exists original_size_bytes bigint,
  add column if not exists compressed_size_bytes bigint,
  add column if not exists checksum_sha256 text,
  add column if not exists notification_id uuid references public.notification_outbox(notification_id) on delete set null,
  add column if not exists attached_to_record boolean not null default false;

alter table public.service_upload_reviews
  drop constraint if exists service_upload_reviews_compression_status_check;

alter table public.service_upload_reviews
  add constraint service_upload_reviews_compression_status_check check (compression_status in ('pending_client_compression','compressed','not_required','failed','server_processed'));

create index if not exists service_upload_reviews_notification_idx on public.service_upload_reviews(notification_id, created_at desc);
create index if not exists service_upload_reviews_attachment_idx on public.service_upload_reviews(attached_to_record, review_status, created_at desc);

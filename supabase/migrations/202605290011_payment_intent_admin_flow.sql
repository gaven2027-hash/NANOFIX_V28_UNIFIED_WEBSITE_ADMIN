-- NANOFIX V28.2 Service Operations Phase C.3
-- Finance payment intent admin linkage and customer status flow hardening.

create index if not exists payment_intents_status_created_idx on public.payment_intents(status, created_at desc);
create index if not exists payment_intents_provider_idx on public.payment_intents(provider, created_at desc);
create index if not exists payment_intents_payment_url_idx on public.payment_intents(payment_url) where payment_url is not null;

create or replace function public.payment_intents_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_intents_touch_updated_at on public.payment_intents;
create trigger payment_intents_touch_updated_at
before update on public.payment_intents
for each row execute function public.payment_intents_touch_updated_at();

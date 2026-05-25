create unique index if not exists invoices_one_per_quotation_uidx
  on public.invoices(quotation_id)
  where quotation_id is not null;

create unique index if not exists receipts_one_per_payment_uidx
  on public.receipts(payment_id)
  where payment_id is not null;

create unique index if not exists warranties_one_per_receipt_uidx
  on public.warranties(receipt_id)
  where receipt_id is not null;

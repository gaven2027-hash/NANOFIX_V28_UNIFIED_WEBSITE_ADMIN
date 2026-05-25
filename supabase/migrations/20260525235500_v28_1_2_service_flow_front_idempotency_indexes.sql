create unique index if not exists service_requests_one_per_lead_uidx
  on public.service_requests(lead_id)
  where lead_id is not null;

create unique index if not exists bookings_one_site_inspection_per_request_uidx
  on public.bookings(service_request_id, booking_type)
  where service_request_id is not null and booking_type = 'site_inspection';

create unique index if not exists inspections_one_per_request_uidx
  on public.inspections(service_request_id)
  where service_request_id is not null;

create unique index if not exists quotations_one_per_request_uidx
  on public.quotations(service_request_id)
  where service_request_id is not null;

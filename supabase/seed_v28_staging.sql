-- NANOFIX V28 staging seed. Safe demo data only; do not import production data.
insert into public.app_modules(module_key, display_name, criticality, owner_role, enabled)
values
  ('website','Website Public Pages','critical','content_admin',true),
  ('admin','Admin Console','critical','super_admin',true),
  ('customer_portal','Customer Portal','high','customer_admin',true),
  ('operations','Service & Order Operations','critical','operations_admin',true),
  ('finance','Invoice, Payment & Receipt','high','finance_admin',true),
  ('warranty','Warranty Center','high','operations_admin',true),
  ('ai_center','AI Intelligence Center','medium','marketing_admin',true),
  ('social','Social Media Management','medium','marketing_admin',true),
  ('backup','Backup & Download Center','critical','super_admin',true)
on conflict (module_key) do update set
  display_name = excluded.display_name,
  criticality = excluded.criticality,
  owner_role = excluded.owner_role,
  enabled = excluded.enabled;

insert into public.website_pages(route_path, title, description, status, published_at)
values
  ('/','NANOFIX Singapore','Staging homepage CMS record','published',now()),
  ('/leak-detection','Leak Detection','Staging CMS record','published',now()),
  ('/get-a-free-quote','Get a Free Quote','Staging CMS record','published',now())
on conflict (route_path) do update set title = excluded.title, updated_at = now();

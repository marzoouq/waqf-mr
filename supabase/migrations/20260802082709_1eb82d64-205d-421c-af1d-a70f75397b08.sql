ALTER TABLE public.access_log DROP CONSTRAINT IF EXISTS access_log_event_type_check;
ALTER TABLE public.access_log ADD CONSTRAINT access_log_event_type_check CHECK (event_type = ANY (ARRAY[
  'login_success','login_failed','logout','idle_logout','unauthorized_access',
  'signup_attempt','role_fetch','client_error','diagnostics_run',
  'page_view','page_exit','invoice_download','invoice_download_denied'
]));

ALTER TABLE public.access_log_archive DROP CONSTRAINT IF EXISTS access_log_archive_event_type_check;

DROP POLICY IF EXISTS "Admin and accountant can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Beneficiaries and waqif can view invoice files" ON storage.objects;
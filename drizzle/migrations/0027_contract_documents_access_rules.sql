-- تثبيت صلاحيات مخزن سندات إيجار في خطوات الإعداد المحفوظة (مطابقة للحالة المباشرة، لا تغيّر صفوفًا موجودة)
INSERT INTO public.file_access_rules (bucket_id, role, can_read, can_download, can_upload, can_delete) VALUES
  ('contract-documents','accountant', true, true, true, false),
  ('contract-documents','beneficiary', false, false, false, false),
  ('contract-documents','waqif', false, false, false, false)
ON CONFLICT DO NOTHING;
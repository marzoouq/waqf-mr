CREATE TABLE public.file_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  role public.app_role NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_download boolean NOT NULL DEFAULT false,
  can_upload boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_access_rules TO authenticated;
GRANT ALL ON public.file_access_rules TO service_role;
ALTER TABLE public.file_access_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages file rules" ON public.file_access_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.file_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  object_path text NOT NULL,
  user_id uuid NOT NULL,
  effect text NOT NULL DEFAULT 'allow' CHECK (effect IN ('allow','deny')),
  expires_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_id, object_path, user_id)
);
CREATE INDEX file_access_grants_lookup ON public.file_access_grants (bucket_id, object_path, user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_access_grants TO authenticated;
GRANT ALL ON public.file_access_grants TO service_role;
ALTER TABLE public.file_access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages file grants" ON public.file_access_grants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- قواعد افتراضية مطابقة للوضع الحالي (لا توسيع لأي صلاحية)
INSERT INTO public.file_access_rules (bucket_id, role, can_read, can_download, can_upload, can_delete) VALUES
  ('invoices','accountant', true, true, true, true),
  ('invoices','beneficiary', true, true, false, false),
  ('invoices','waqif', true, true, false, false),
  ('disbursement-vouchers','accountant', true, true, true, true),
  ('disbursement-vouchers','beneficiary',
     COALESCE((SELECT value FROM public.app_settings WHERE key='voucher_pdf_beneficiary_access'),'false')='true',
     COALESCE((SELECT value FROM public.app_settings WHERE key='voucher_pdf_beneficiary_access'),'false')='true', false, false),
  ('disbursement-vouchers','waqif',
     COALESCE((SELECT value FROM public.app_settings WHERE key='voucher_pdf_beneficiary_access'),'false')='true',
     COALESCE((SELECT value FROM public.app_settings WHERE key='voucher_pdf_beneficiary_access'),'false')='true', false, false),
  ('waqf-documents','accountant', true, true, false, false),
  ('waqf-documents','beneficiary', true, true, false, false),
  ('waqf-documents','waqif', true, true, false, false),
  ('waqf-assets','accountant', true, true, false, false);

-- قرار الوصول المركزي: الناظر دائماً؛ الحجب الفردي يغلب؛ ثم الإذن الفردي؛ ثم قاعدة الدور + شروط الحزمة؛ وإلا رفض
CREATE OR REPLACE FUNCTION public.can_access_file(_user_id uuid, _bucket text, _path text, _action text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  g text;
  allowed boolean := false;
BEGIN
  IF _user_id IS NULL OR _action NOT IN ('read','download','upload','delete') THEN RETURN false; END IF;
  -- منع استطلاع صلاحيات مستخدم آخر من الواجهة
  IF _user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(),'') <> 'service_role' THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;

  SELECT effect INTO g FROM public.file_access_grants
   WHERE bucket_id = _bucket AND object_path = _path AND user_id = _user_id
     AND (expires_at IS NULL OR expires_at > now());
  IF g = 'deny' THEN RETURN false; END IF;
  IF g = 'allow' AND _action IN ('read','download') THEN RETURN true; END IF;

  SELECT bool_or(CASE _action WHEN 'read' THEN r.can_read WHEN 'download' THEN r.can_download
                 WHEN 'upload' THEN r.can_upload ELSE r.can_delete END)
    INTO allowed
    FROM public.file_access_rules r JOIN public.user_roles ur ON ur.role = r.role
   WHERE ur.user_id = _user_id AND r.bucket_id = _bucket;
  IF NOT COALESCE(allowed,false) THEN RETURN false; END IF;

  -- شروط النشر الخاصة بكل حزمة لغير الطاقم التشغيلي
  IF public.has_role(_user_id, 'accountant'::app_role) THEN RETURN true; END IF;
  IF _bucket = 'disbursement-vouchers' THEN
    RETURN EXISTS (SELECT 1 FROM public.disbursement_vouchers v WHERE v.pdf_path = _path
                   AND v.status = 'approved'::voucher_status AND public.is_fiscal_year_accessible(v.fiscal_year_id));
  ELSIF _bucket = 'waqf-documents' THEN
    RETURN EXISTS (SELECT 1 FROM public.archived_documents d WHERE d.storage_path = _path AND d.is_published);
  ELSIF _bucket = 'invoices' THEN
    RETURN EXISTS (SELECT 1 FROM public.invoices i JOIN public.fiscal_years f ON f.id = i.fiscal_year_id
                    WHERE i.file_path = _path AND f.published)
        OR EXISTS (SELECT 1 FROM public.payment_invoices p JOIN public.fiscal_years f ON f.id = p.fiscal_year_id
                    WHERE p.file_path = _path AND f.published);
  END IF;
  RETURN false;
END $$;
REVOKE EXECUTE ON FUNCTION public.can_access_file(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_file(uuid,text,text,text) TO authenticated, service_role;

-- إسقاط كل السياسات المتفرقة
DROP POLICY IF EXISTS "Accountants all on disbursement-vouchers bucket" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can update invoices" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins all on disbursement-vouchers bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete waqf assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update waqf assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload waqf assets" ON storage.objects;
DROP POLICY IF EXISTS "Beneficiary and waqif read approved vouchers" ON storage.objects;
DROP POLICY IF EXISTS "Privileged can list waqf assets" ON storage.objects;
DROP POLICY IF EXISTS "waqf_docs_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "waqf_docs_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "waqf_docs_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "waqf_docs_select_published" ON storage.objects;
DROP POLICY IF EXISTS "waqf_docs_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view waqf assets" ON storage.objects;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND bucket_list_hint IS NULL LOOP NULL; END LOOP;
EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND (COALESCE(qual,'') || COALESCE(with_check,'')) ~ '(invoices|disbursement-vouchers|waqf-documents|waqf-assets)' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- سياسات موحّدة: كل عملية تمر عبر قرار الناظر (لا قراءة مباشرة للفواتير)
CREATE POLICY "fac_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('disbursement-vouchers','waqf-documents','waqf-assets')
         AND public.can_access_file(auth.uid(), bucket_id, name, 'read'));
CREATE POLICY "fac_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('invoices','disbursement-vouchers','waqf-documents','waqf-assets')
         AND public.can_access_file(auth.uid(), bucket_id, name, 'upload'));
CREATE POLICY "fac_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('invoices','disbursement-vouchers','waqf-documents','waqf-assets')
         AND public.can_access_file(auth.uid(), bucket_id, name, 'upload'))
  WITH CHECK (public.can_access_file(auth.uid(), bucket_id, name, 'upload'));
CREATE POLICY "fac_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('invoices','disbursement-vouchers','waqf-documents','waqf-assets')
         AND public.can_access_file(auth.uid(), bucket_id, name, 'delete'));

-- حارس: يفشل الترحيل إن بقيت سياسة لا تمر عبر القرار المركزي
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
             AND (COALESCE(qual,'') || COALESCE(with_check,'')) !~ 'can_access_file') THEN
    RAISE EXCEPTION 'storage.objects policy bypasses can_access_file';
  END IF;
END $$;
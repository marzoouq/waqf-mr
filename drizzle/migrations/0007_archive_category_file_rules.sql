CREATE TABLE public.file_category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL DEFAULT 'waqf-documents',
  category text NOT NULL,
  role public.app_role NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_download boolean NOT NULL DEFAULT false,
  can_upload boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_id, category, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_category_rules TO authenticated;
GRANT ALL ON public.file_category_rules TO service_role;
ALTER TABLE public.file_category_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages category rules" ON public.file_category_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- الافتراضي محجوب للمستفيد والواقف والدعم؛ المحاسب يرث صلاحية الحاوية الحالية كي لا يتعطل العمل
INSERT INTO public.file_category_rules (category, role, can_read, can_download, can_upload, can_delete)
SELECT c.cat, r.role,
       COALESCE(fr.can_read,false) AND r.role = 'accountant',
       COALESCE(fr.can_download,false) AND r.role = 'accountant',
       COALESCE(fr.can_upload,false) AND r.role = 'accountant',
       COALESCE(fr.can_delete,false) AND r.role = 'accountant'
FROM unnest(ARRAY['meeting_minutes','annual_reports','certificates','official_contracts','correspondence','other']) AS c(cat)
CROSS JOIN (VALUES ('accountant'::public.app_role),('beneficiary'::public.app_role),('waqif'::public.app_role),('support'::public.app_role)) AS r(role)
LEFT JOIN public.file_access_rules fr ON fr.bucket_id = 'waqf-documents' AND fr.role = r.role
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_access_file(_user_id uuid, _bucket text, _path text, _action text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  g text;
  allowed boolean := false;
  doc_cat text;
BEGIN
  IF _user_id IS NULL OR _action NOT IN ('read','download','upload','delete') THEN RETURN false; END IF;
  IF _user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(),'') <> 'service_role' THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;

  SELECT effect INTO g FROM public.file_access_grants
   WHERE bucket_id = _bucket AND object_path = _path AND user_id = _user_id
     AND (expires_at IS NULL OR expires_at > now());
  IF g = 'deny' THEN RETURN false; END IF;
  IF g = 'allow' AND _action IN ('read','download') THEN RETURN true; END IF;

  IF _bucket = 'waqf-documents' THEN
    SELECT d.category INTO doc_cat FROM public.archived_documents d WHERE d.storage_path = _path LIMIT 1;
  END IF;

  IF doc_cat IS NOT NULL THEN
    -- قاعدة الفئة تُقدَّم على قاعدة الحاوية
    SELECT bool_or(CASE _action WHEN 'read' THEN r.can_read WHEN 'download' THEN r.can_download
                   WHEN 'upload' THEN r.can_upload ELSE r.can_delete END)
      INTO allowed
      FROM public.file_category_rules r JOIN public.user_roles ur ON ur.role = r.role
     WHERE ur.user_id = _user_id AND r.bucket_id = _bucket AND r.category = doc_cat;
  ELSE
    SELECT bool_or(CASE _action WHEN 'read' THEN r.can_read WHEN 'download' THEN r.can_download
                   WHEN 'upload' THEN r.can_upload ELSE r.can_delete END)
      INTO allowed
      FROM public.file_access_rules r JOIN public.user_roles ur ON ur.role = r.role
     WHERE ur.user_id = _user_id AND r.bucket_id = _bucket;
  END IF;
  IF NOT COALESCE(allowed,false) THEN RETURN false; END IF;

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

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
             AND (COALESCE(qual,'') || COALESCE(with_check,'')) !~ 'can_access_file') THEN
    RAISE EXCEPTION 'storage policy bypasses can_access_file';
  END IF;
END $$;
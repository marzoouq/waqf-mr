CREATE OR REPLACE FUNCTION public.can_access_file(_user_id uuid, _bucket text, _path text, _action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g text;
  allowed boolean := false;
  doc_cat text;
BEGIN
  IF _user_id IS NULL OR _action NOT IN ('read','download','upload','delete') THEN RETURN false; END IF;
  IF _user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(),'') <> 'service_role' THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;

  -- كشوف البنك: إذن الناظر للقسم والكشف شرط سابق لأي إذن فردي (fail-closed)
  IF _bucket = 'waqf-bank-statements'
     AND NOT public.has_role(_user_id, 'accountant'::app_role)
     AND NOT public.bank_statement_visible(_user_id) THEN
    RETURN false;
  END IF;

  SELECT effect INTO g FROM public.file_access_grants
   WHERE bucket_id = _bucket AND object_path = _path AND user_id = _user_id
     AND (expires_at IS NULL OR expires_at > now());
  IF g = 'deny' THEN RETURN false; END IF;
  IF g = 'allow' AND _action IN ('read','download') AND _bucket <> 'waqf-bank-statements' THEN RETURN true; END IF;

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
  ELSIF _bucket = 'waqf-bank-statements' THEN
    -- الكشف الحالي فقط، وبإذن الناظر لإظهار القسم والكشف معاً
    RETURN _action IN ('read','download') AND public.bank_statement_visible(_user_id)
       AND EXISTS (SELECT 1 FROM public.waqf_bank_statements s WHERE s.storage_path = _path AND s.is_current);
  END IF;
  RETURN false;
END $function$;
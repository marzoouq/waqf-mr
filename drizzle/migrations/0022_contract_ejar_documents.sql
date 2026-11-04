CREATE TABLE public.contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  doc_type text NOT NULL DEFAULT 'ejar',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL DEFAULT 0,
  ejar_number text,
  documented_at date,
  ejar_start_date date,
  ejar_end_date date,
  is_current boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  archive_reason text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_documents TO authenticated;
GRANT ALL ON public.contract_documents TO service_role;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX contract_documents_one_current ON public.contract_documents (contract_id, doc_type) WHERE is_current;
CREATE UNIQUE INDEX contract_documents_ejar_number_current ON public.contract_documents (ejar_number) WHERE is_current AND ejar_number IS NOT NULL;
CREATE INDEX contract_documents_contract_idx ON public.contract_documents (contract_id);

CREATE POLICY "staff_select_contract_documents" ON public.contract_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.can_access_file(auth.uid(), 'contract-documents', storage_path, 'read'));
CREATE POLICY "staff_insert_contract_documents" ON public.contract_documents FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role))
    AND uploaded_by = auth.uid() AND doc_type = 'ejar');
CREATE POLICY "staff_update_contract_documents" ON public.contract_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "admin_delete_contract_documents" ON public.contract_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.validate_contract_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.mime_type NOT IN ('application/pdf','image/jpeg','image/png') THEN
      RAISE EXCEPTION 'نوع الملف غير مقبول — PDF أو JPG أو PNG فقط';
    END IF;
    IF NEW.file_size_bytes > 10485760 THEN RAISE EXCEPTION 'حجم الملف يتجاوز 10 ميغابايت'; END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_current = false AND NEW.is_current = true THEN
    RAISE EXCEPTION 'لا يمكن إعادة تفعيل نسخة مؤرشفة';
  END IF;
  SELECT fy.status INTO v_status FROM contracts c JOIN fiscal_years fy ON fy.id = c.fiscal_year_id WHERE c.id = NEW.contract_id;
  IF v_status = 'closed' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'السنة المالية مقفلة — التعديل للناظر فقط';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_contract_document BEFORE INSERT OR UPDATE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_contract_document();
CREATE TRIGGER audit_contract_documents AFTER INSERT OR UPDATE OR DELETE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE OR REPLACE FUNCTION public.prevent_contract_delete_with_ejar()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.contract_documents WHERE contract_id = OLD.id) THEN
    RAISE EXCEPTION 'لا يمكن حذف عقد مرفق به عقد إيجار موثق — احذف الملف أولاً';
  END IF;
  RETURN OLD;
END; $$;
CREATE TRIGGER prevent_contract_delete_with_ejar BEFORE DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_contract_delete_with_ejar();

CREATE OR REPLACE FUNCTION public.log_contract_document_download(p_document_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_path text;
BEGIN
  SELECT storage_path INTO v_path FROM contract_documents WHERE id = p_document_id;
  IF v_path IS NULL OR NOT public.can_access_file(auth.uid(), 'contract-documents', v_path, 'read') THEN
    RAISE EXCEPTION 'غير مصرح بتنزيل هذا الملف';
  END IF;
  INSERT INTO audit_log (table_name, operation, record_id, user_id, new_data)
  VALUES ('contract_documents', 'DOWNLOAD', p_document_id, auth.uid(), jsonb_build_object('storage_path', v_path));
  RETURN v_path;
END; $$;
REVOKE ALL ON FUNCTION public.log_contract_document_download(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_contract_document_download(uuid) TO authenticated;

-- ملاحظات فحص شجرة التدقيق الخاصة بعقود إيجار
CREATE OR REPLACE FUNCTION public.audit_ejar_issues(p_fiscal_year_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'code','contract_without_ejar','severity','medium',
      'message','عقد نشط بلا عقد إيجار موثق: ' || c.contract_number || ' — ' || c.tenant_name,
      'ref', c.contract_number))
    FROM contracts c
    WHERE c.fiscal_year_id = p_fiscal_year_id AND c.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM contract_documents d WHERE d.contract_id = c.id AND d.is_current)), '[]'::jsonb)
  || COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'code','ejar_dates_mismatch','severity','low',
      'message','تواريخ عقد إيجار تختلف عن العقد ' || c.contract_number,
      'ref', c.contract_number))
    FROM contracts c JOIN contract_documents d ON d.contract_id = c.id AND d.is_current
    WHERE c.fiscal_year_id = p_fiscal_year_id
      AND ((d.ejar_start_date IS NOT NULL AND d.ejar_start_date <> c.start_date)
        OR (d.ejar_end_date IS NOT NULL AND d.ejar_end_date <> c.end_date))), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.audit_ejar_issues(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_ejar_issues(uuid) TO authenticated;

CREATE POLICY "fac_select_contract_docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contract-documents' AND public.can_access_file(auth.uid(), bucket_id, name, 'read'));
CREATE POLICY "fac_insert_contract_docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contract-documents' AND public.can_access_file(auth.uid(), bucket_id, name, 'upload'));
CREATE POLICY "fac_delete_contract_docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contract-documents' AND public.can_access_file(auth.uid(), bucket_id, name, 'delete'));
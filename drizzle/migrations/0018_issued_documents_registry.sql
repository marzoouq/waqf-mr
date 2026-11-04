CREATE TABLE public.issued_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number text NOT NULL UNIQUE,
  doc_type text NOT NULL,
  fiscal_year_id uuid REFERENCES public.fiscal_years(id) ON DELETE SET NULL,
  source_id uuid,
  content_hash text,
  page_count integer,
  verification_code text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  status text NOT NULL DEFAULT 'issued',
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX issued_documents_source_uniq ON public.issued_documents (doc_type, source_id) WHERE source_id IS NOT NULL;
CREATE SEQUENCE IF NOT EXISTS public.issued_documents_rpt_seq;

GRANT SELECT ON public.issued_documents TO authenticated;
GRANT ALL ON public.issued_documents TO service_role;
ALTER TABLE public.issued_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY issued_documents_staff_read ON public.issued_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role));
-- لا سياسات إضافة/تعديل/حذف: الإضافة حصراً عبر issue_document

CREATE OR REPLACE FUNCTION public.issue_document(
  p_doc_type text, p_fiscal_year_id uuid DEFAULT NULL, p_content_hash text DEFAULT NULL,
  p_page_count integer DEFAULT NULL, p_source_id uuid DEFAULT NULL, p_doc_number text DEFAULT NULL)
RETURNS TABLE(doc_number text, verification_code text, issued_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_num text; r public.issued_documents;
BEGIN
  IF v_uid IS NULL OR NOT (has_role(v_uid,'admin') OR has_role(v_uid,'accountant')
     OR has_role(v_uid,'beneficiary') OR has_role(v_uid,'waqif')) THEN
    RAISE EXCEPTION 'غير مصرح بإصدار وثيقة' USING ERRCODE = '42501';
  END IF;
  IF p_doc_type !~ '^[a-z_]{2,40}$' THEN RAISE EXCEPTION 'نوع وثيقة غير صالح'; END IF;
  IF p_content_hash IS NOT NULL AND p_content_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'بصمة غير صالحة'; END IF;
  -- رقم مخصص فقط للموظفين (سندات الصرف تستخدم رقمها الأصلي)
  IF p_doc_number IS NOT NULL AND NOT (has_role(v_uid,'admin') OR has_role(v_uid,'accountant')) THEN
    RAISE EXCEPTION 'غير مصرح' USING ERRCODE = '42501';
  END IF;
  IF p_source_id IS NOT NULL THEN
    SELECT * INTO r FROM public.issued_documents d WHERE d.doc_type = p_doc_type AND d.source_id = p_source_id;
    IF FOUND THEN RETURN QUERY SELECT r.doc_number, r.verification_code, r.issued_at; RETURN; END IF;
  END IF;
  v_num := COALESCE(p_doc_number,
    'RPT-' || to_char(now() AT TIME ZONE 'Asia/Riyadh','YYYY') || '-' || lpad(nextval('public.issued_documents_rpt_seq')::text, 6, '0'));
  INSERT INTO public.issued_documents(doc_number, doc_type, fiscal_year_id, source_id, content_hash, page_count, issued_by)
  VALUES (v_num, p_doc_type, p_fiscal_year_id, p_source_id, p_content_hash, p_page_count, v_uid)
  RETURNING * INTO r;
  RETURN QUERY SELECT r.doc_number, r.verification_code, r.issued_at;
END $$;
REVOKE ALL ON FUNCTION public.issue_document(text, uuid, text, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_document(text, uuid, text, integer, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_issued_document(p_code text)
RETURNS TABLE(doc_number text, doc_type text, issued_at timestamptz, page_count integer, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.doc_number, d.doc_type, d.issued_at, d.page_count, d.status
  FROM public.issued_documents d
  WHERE p_code ~ '^[0-9a-f]{24}$' AND d.verification_code = p_code LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.verify_issued_document(text) TO anon, authenticated;
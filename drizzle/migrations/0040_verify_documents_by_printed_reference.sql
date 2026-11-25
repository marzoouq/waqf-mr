CREATE OR REPLACE FUNCTION public.verify_issued_document(p_code text)
RETURNS TABLE(doc_number text, doc_type text, issued_at timestamptz, page_count integer, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.doc_number, d.doc_type, d.issued_at, d.page_count,
         CASE WHEN dv.status::text = 'void' THEN 'void' ELSE d.status END
  FROM public.issued_documents d
  LEFT JOIN public.disbursement_vouchers dv
    ON d.doc_type = 'disbursement_voucher' AND dv.id = d.source_id
  WHERE (btrim(p_code) ~ '^[0-9a-f]{24}$' AND d.verification_code = btrim(p_code))
     OR (btrim(p_code) ~ '^[A-Za-z0-9][A-Za-z0-9/-]{1,63}$' AND d.doc_number = btrim(p_code))
  LIMIT 1;
$$;
-- إضافة إعداد للتحكم بوصول المستفيد/الواقف لملفات PDF سندات الصرف
INSERT INTO public.app_settings (key, value)
VALUES ('voucher_pdf_beneficiary_access', 'false')
ON CONFLICT (key) DO NOTHING;

-- تحديث سياسة التخزين لاحترام الإعداد
DROP POLICY IF EXISTS "Beneficiary and waqif read approved vouchers" ON storage.objects;

CREATE POLICY "Beneficiary and waqif read approved vouchers"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'disbursement-vouchers'
  AND (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role))
  AND COALESCE((SELECT value FROM public.app_settings WHERE key = 'voucher_pdf_beneficiary_access'), 'false') = 'true'
  AND EXISTS (
    SELECT 1 FROM public.disbursement_vouchers v
    WHERE v.pdf_path = storage.objects.name
      AND v.status = 'approved'::voucher_status
      AND is_fiscal_year_accessible(v.fiscal_year_id)
  )
);
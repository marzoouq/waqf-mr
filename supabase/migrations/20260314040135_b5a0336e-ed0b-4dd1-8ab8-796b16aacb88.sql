
-- ============================================================
-- CRIT-2: السماح للمحاسب برفع ملفات في bucket invoices
-- ============================================================
CREATE POLICY "Accountants can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices'
  AND public.has_role(auth.uid(), 'accountant'::public.app_role)
);

-- السماح للمحاسب بقراءة وتحميل الملفات
CREATE POLICY "Accountants can read invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices'
  AND public.has_role(auth.uid(), 'accountant'::public.app_role)
);

-- السماح للمحاسب بحذف الملفات
CREATE POLICY "Accountants can delete invoices"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices'
  AND public.has_role(auth.uid(), 'accountant'::public.app_role)
);

-- ============================================================
-- SEC-MED-3: Validation trigger لـ VAT على payment_invoices
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_payment_invoice_vat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.vat_amount > NEW.amount THEN
    RAISE EXCEPTION 'vat_amount (%) cannot exceed amount (%)', NEW.vat_amount, NEW.amount;
  END IF;
  IF NEW.vat_rate < 0 OR NEW.vat_rate > 100 THEN
    RAISE EXCEPTION 'vat_rate (%) must be between 0 and 100', NEW.vat_rate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment_invoice_vat
  BEFORE INSERT OR UPDATE ON public.payment_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_invoice_vat();

-- نفس التحقق على جدول invoices أيضاً
CREATE OR REPLACE FUNCTION public.validate_invoice_vat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.vat_amount > NEW.amount THEN
    RAISE EXCEPTION 'vat_amount (%) cannot exceed amount (%)', NEW.vat_amount, NEW.amount;
  END IF;
  IF NEW.vat_rate < 0 OR NEW.vat_rate > 100 THEN
    RAISE EXCEPTION 'vat_rate (%) must be between 0 and 100', NEW.vat_rate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_invoice_vat
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice_vat();

-- ============================================================
-- HIGH-3: UNIQUE index على invoice_number + fiscal_year_id
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS invoices_number_fy_unique
  ON public.invoices (invoice_number, fiscal_year_id)
  WHERE invoice_number IS NOT NULL;

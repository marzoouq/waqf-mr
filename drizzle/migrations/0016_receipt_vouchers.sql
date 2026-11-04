CREATE SEQUENCE IF NOT EXISTS public.receipt_voucher_seq;

CREATE TABLE public.receipt_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  payment_invoice_id uuid NOT NULL REFERENCES public.payment_invoices(id) ON DELETE RESTRICT,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  fiscal_year_id uuid REFERENCES public.fiscal_years(id),
  amount numeric NOT NULL CHECK (amount >= 0),
  paid_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  verification_code text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','void')),
  void_reason text,
  voided_at timestamptz,
  voided_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX receipt_vouchers_one_issued_per_invoice ON public.receipt_vouchers(payment_invoice_id) WHERE status = 'issued';
CREATE INDEX receipt_vouchers_contract_idx ON public.receipt_vouchers(contract_id);

GRANT SELECT ON public.receipt_vouchers TO authenticated;
GRANT ALL ON public.receipt_vouchers TO service_role;
ALTER TABLE public.receipt_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read receipts" ON public.receipt_vouchers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role));

CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_date date)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN 'RCV-' || to_char(COALESCE(p_date, CURRENT_DATE), 'YYYY') || '-' || lpad(nextval('public.receipt_voucher_seq')::text, 6, '0');
END; $$;
REVOKE ALL ON FUNCTION public.generate_receipt_number(date) FROM PUBLIC, anon, authenticated;

-- إصدار السند تلقائياً عند السداد، وإلغاؤه تلقائياً عند التراجع عن السداد
CREATE OR REPLACE FUNCTION public.sync_receipt_voucher()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    IF NOT EXISTS (SELECT 1 FROM receipt_vouchers WHERE payment_invoice_id = NEW.id AND status = 'issued') THEN
      INSERT INTO receipt_vouchers (receipt_number, payment_invoice_id, contract_id, fiscal_year_id, amount, paid_date, created_by)
      VALUES (public.generate_receipt_number(COALESCE(NEW.paid_date, CURRENT_DATE)), NEW.id, NEW.contract_id, NEW.fiscal_year_id,
              COALESCE(NEW.paid_amount, NEW.amount), COALESCE(NEW.paid_date, CURRENT_DATE), auth.uid());
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status IS DISTINCT FROM 'paid' THEN
    UPDATE receipt_vouchers SET status = 'void', void_reason = 'إلغاء تسديد الفاتورة', voided_at = now(), voided_by = auth.uid()
    WHERE payment_invoice_id = NEW.id AND status = 'issued';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.sync_receipt_voucher() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_sync_receipt_voucher AFTER INSERT OR UPDATE OF status ON public.payment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_receipt_voucher();

CREATE OR REPLACE FUNCTION public.void_receipt_voucher(p_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'إلغاء السند للناظر فقط'; END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RAISE EXCEPTION 'سبب الإلغاء مطلوب'; END IF;
  UPDATE receipt_vouchers SET status='void', void_reason=trim(p_reason), voided_at=now(), voided_by=auth.uid()
  WHERE id = p_id AND status = 'issued';
  IF NOT FOUND THEN RAISE EXCEPTION 'السند غير موجود أو ملغى مسبقاً'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.void_receipt_voucher(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_receipt_voucher(uuid, text) TO authenticated;

-- تحقق عام من رمز QR: بيانات غير شخصية فقط
CREATE OR REPLACE FUNCTION public.verify_receipt_voucher(p_code text)
RETURNS TABLE(receipt_number text, paid_date date, amount numeric, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.receipt_number, r.paid_date, r.amount, r.status FROM receipt_vouchers r
  WHERE p_code ~ '^[0-9a-f]{24}$' AND r.verification_code = p_code LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.verify_receipt_voucher(text) TO anon, authenticated;

CREATE TRIGGER audit_receipt_vouchers AFTER INSERT OR UPDATE OR DELETE ON public.receipt_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- إصدار بأثر رجعي للفواتير المسددة حالياً بترتيب تاريخ السداد
INSERT INTO public.receipt_vouchers (receipt_number, payment_invoice_id, contract_id, fiscal_year_id, amount, paid_date)
SELECT public.generate_receipt_number(x.pd), x.id, x.contract_id, x.fiscal_year_id, x.amt, x.pd
FROM (
  SELECT pi.id, pi.contract_id, pi.fiscal_year_id, COALESCE(pi.paid_amount, pi.amount) amt, COALESCE(pi.paid_date, pi.due_date) pd
  FROM public.payment_invoices pi WHERE pi.status = 'paid'
  ORDER BY COALESCE(pi.paid_date, pi.due_date), pi.payment_number, pi.id
) x;
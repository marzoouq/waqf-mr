-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('disbursement-vouchers', 'disbursement-vouchers', false)
ON CONFLICT (id) DO NOTHING;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.voucher_status AS ENUM ('draft','approved','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.voucher_payment_method AS ENUM ('cash','bank_transfer','cheque','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS public.disbursement_voucher_seq;

CREATE TABLE IF NOT EXISTS public.disbursement_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text NOT NULL UNIQUE,
  expense_id uuid NOT NULL,
  fiscal_year_id uuid NOT NULL,
  recipient_name text NOT NULL,
  recipient_id_number text,
  recipient_phone text,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method public.voucher_payment_method NOT NULL DEFAULT 'cash',
  transfer_reference text,
  work_description text NOT NULL,
  signature_data text,
  status public.voucher_status NOT NULL DEFAULT 'draft',
  approved_by uuid,
  approved_at timestamptz,
  void_reason text,
  voided_at timestamptz,
  pdf_path text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voucher_signature_size CHECK (signature_data IS NULL OR octet_length(signature_data) <= 100000),
  CONSTRAINT voucher_approval_consistency CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT voucher_void_consistency CHECK (status <> 'void' OR (void_reason IS NOT NULL AND voided_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS disbursement_vouchers_one_active_per_expense
  ON public.disbursement_vouchers(expense_id) WHERE status <> 'void';
CREATE INDEX IF NOT EXISTS idx_disbursement_vouchers_fy ON public.disbursement_vouchers(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_vouchers_status ON public.disbursement_vouchers(status);

CREATE OR REPLACE FUNCTION public.generate_voucher_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_next bigint; v_year text;
BEGIN
  v_next := nextval('public.disbursement_voucher_seq');
  v_year := to_char(now(), 'YYYY');
  RETURN 'SRF-' || v_year || '-' || lpad(v_next::text, 6, '0');
END;
$$;

DROP TRIGGER IF EXISTS trg_dv_updated_at ON public.disbursement_vouchers;
CREATE TRIGGER trg_dv_updated_at BEFORE UPDATE ON public.disbursement_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_dv_audit ON public.disbursement_vouchers;
CREATE TRIGGER trg_dv_audit AFTER INSERT OR UPDATE OR DELETE ON public.disbursement_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_dv_closed_fy ON public.disbursement_vouchers;
CREATE TRIGGER trg_dv_closed_fy BEFORE INSERT OR UPDATE OR DELETE ON public.disbursement_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();

ALTER TABLE public.disbursement_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage disbursement_vouchers" ON public.disbursement_vouchers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants manage disbursement_vouchers" ON public.disbursement_vouchers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Deny raw select to beneficiary and waqif" ON public.disbursement_vouchers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Restrict unpublished fy on disbursement_vouchers" ON public.disbursement_vouchers
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (is_fiscal_year_accessible(fiscal_year_id));

CREATE OR REPLACE VIEW public.disbursement_vouchers_public
WITH (security_invoker = false) AS
SELECT id, voucher_number, expense_id, fiscal_year_id,
  recipient_name, amount, payment_method, work_description,
  status, approved_at, created_at, pdf_path
FROM public.disbursement_vouchers
WHERE status = 'approved' AND is_fiscal_year_accessible(fiscal_year_id);

GRANT SELECT ON public.disbursement_vouchers_public TO authenticated;

-- RPC: create voucher
CREATE OR REPLACE FUNCTION public.create_disbursement_voucher(
  p_expense_id uuid, p_recipient_name text, p_recipient_id_number text,
  p_recipient_phone text, p_amount numeric, p_payment_method public.voucher_payment_method,
  p_transfer_reference text, p_work_description text, p_signature_data text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fy uuid; v_id uuid; v_num text;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGES';
  END IF;
  SELECT fiscal_year_id INTO v_fy FROM public.expenses WHERE id = p_expense_id;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'EXPENSE_NOT_FOUND'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE expense_id = p_expense_id) THEN
    RAISE EXCEPTION 'EXPENSE_HAS_INVOICE';
  END IF;
  IF EXISTS (SELECT 1 FROM public.disbursement_vouchers WHERE expense_id = p_expense_id AND status <> 'void') THEN
    RAISE EXCEPTION 'EXPENSE_HAS_ACTIVE_VOUCHER';
  END IF;
  v_num := public.generate_voucher_number();
  INSERT INTO public.disbursement_vouchers (
    voucher_number, expense_id, fiscal_year_id,
    recipient_name, recipient_id_number, recipient_phone,
    amount, payment_method, transfer_reference,
    work_description, signature_data, status, created_by
  ) VALUES (
    v_num, p_expense_id, v_fy,
    p_recipient_name, p_recipient_id_number, p_recipient_phone,
    p_amount, p_payment_method, p_transfer_reference,
    p_work_description, p_signature_data, 'draft', auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- RPC: approve
CREATE OR REPLACE FUNCTION public.approve_disbursement_voucher(p_voucher_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'ADMIN_ONLY'; END IF;
  UPDATE public.disbursement_vouchers
    SET status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = p_voucher_id AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'VOUCHER_NOT_FOUND_OR_NOT_DRAFT'; END IF;
END;
$$;

-- RPC: void
CREATE OR REPLACE FUNCTION public.void_disbursement_voucher(p_voucher_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'ADMIN_ONLY'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'VOID_REASON_REQUIRED'; END IF;
  UPDATE public.disbursement_vouchers
    SET status = 'void', void_reason = p_reason, voided_at = now()
    WHERE id = p_voucher_id AND status <> 'void';
  IF NOT FOUND THEN RAISE EXCEPTION 'VOUCHER_NOT_FOUND_OR_ALREADY_VOID'; END IF;
END;
$$;

-- Block invoices for expense with active voucher
CREATE OR REPLACE FUNCTION public.prevent_invoice_for_expense_with_voucher()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.expense_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.disbursement_vouchers
    WHERE expense_id = NEW.expense_id AND status <> 'void'
  ) THEN
    RAISE EXCEPTION 'EXPENSE_HAS_ACTIVE_VOUCHER';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_blocks_voucher ON public.invoices;
CREATE TRIGGER trg_invoice_blocks_voucher
  BEFORE INSERT OR UPDATE OF expense_id ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.prevent_invoice_for_expense_with_voucher();

-- Storage policies for disbursement-vouchers bucket
CREATE POLICY "Admins all on disbursement-vouchers bucket"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'disbursement-vouchers' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'disbursement-vouchers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants all on disbursement-vouchers bucket"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'disbursement-vouchers' AND has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (bucket_id = 'disbursement-vouchers' AND has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Beneficiary and waqif read approved vouchers"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'disbursement-vouchers'
    AND (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.disbursement_vouchers v
      WHERE v.pdf_path = storage.objects.name
        AND v.status = 'approved'
        AND is_fiscal_year_accessible(v.fiscal_year_id)
    )
  );
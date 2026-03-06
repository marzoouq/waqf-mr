
-- 1. حقول VAT + ZATCA على invoices
ALTER TABLE invoices ADD COLUMN vat_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN vat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN amount_excluding_vat numeric;
ALTER TABLE invoices ADD COLUMN zatca_uuid uuid DEFAULT gen_random_uuid();
ALTER TABLE invoices ADD COLUMN invoice_hash text;
ALTER TABLE invoices ADD COLUMN icv integer;
ALTER TABLE invoices ADD COLUMN zatca_status text DEFAULT 'not_submitted';
ALTER TABLE invoices ADD COLUMN zatca_xml text;

-- 2. حقول VAT + ZATCA + file_path على payment_invoices
ALTER TABLE payment_invoices ADD COLUMN vat_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE payment_invoices ADD COLUMN vat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE payment_invoices ADD COLUMN zatca_uuid uuid DEFAULT gen_random_uuid();
ALTER TABLE payment_invoices ADD COLUMN zatca_status text DEFAULT 'not_submitted';
ALTER TABLE payment_invoices ADD COLUMN file_path text;

-- 3. جدول شهادات ZATCA
CREATE TABLE zatca_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_type text NOT NULL,
  certificate text NOT NULL,
  private_key text NOT NULL,
  request_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE zatca_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage zatca_certificates" ON zatca_certificates FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 4. جدول سلسلة التحقق
CREATE TABLE invoice_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  icv integer NOT NULL,
  previous_hash text NOT NULL DEFAULT '0',
  invoice_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoice_chain ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage invoice_chain" ON invoice_chain FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 5. دالة ICV ذرية
CREATE OR REPLACE FUNCTION get_next_icv()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_next int;
BEGIN
  SELECT COALESCE(MAX(icv), 0) + 1 INTO v_next FROM invoice_chain;
  RETURN v_next;
END;
$$;

-- 6. Trigger منع تعديل الفواتير بعد الإرسال لـ ZATCA
CREATE OR REPLACE FUNCTION prevent_issued_invoice_modification()
RETURNS trigger AS $$
BEGIN
  IF OLD.zatca_status IN ('submitted', 'cleared', 'reported') THEN
    RAISE EXCEPTION 'لا يمكن تعديل فاتورة تم إرسالها لـ ZATCA';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_zatca_invoice_mod
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION prevent_issued_invoice_modification();

CREATE TRIGGER trg_prevent_zatca_payment_invoice_mod
  BEFORE UPDATE ON payment_invoices
  FOR EACH ROW EXECUTE FUNCTION prevent_issued_invoice_modification();

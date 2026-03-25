-- Trigger للتحقق من وجود invoice_id في الجدول المناسب حسب source_table
CREATE OR REPLACE FUNCTION validate_invoice_chain_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_table = 'payment_invoices' THEN
    IF NOT EXISTS (SELECT 1 FROM payment_invoices WHERE id = NEW.invoice_id) THEN
      RAISE EXCEPTION 'invoice_id % does not exist in payment_invoices', NEW.invoice_id;
    END IF;
  ELSIF NEW.source_table = 'invoices' THEN
    IF NOT EXISTS (SELECT 1 FROM invoices WHERE id = NEW.invoice_id) THEN
      RAISE EXCEPTION 'invoice_id % does not exist in invoices', NEW.invoice_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid source_table: %', NEW.source_table;
  END IF;
  RETURN NEW;
END;
$$;

-- ربط الـ trigger بجدول invoice_chain
DROP TRIGGER IF EXISTS trg_validate_invoice_chain_ref ON invoice_chain;
CREATE TRIGGER trg_validate_invoice_chain_ref
  BEFORE INSERT OR UPDATE ON invoice_chain
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_chain_reference();
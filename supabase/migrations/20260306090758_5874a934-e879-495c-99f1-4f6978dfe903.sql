
-- Fix search_path for prevent_issued_invoice_modification
CREATE OR REPLACE FUNCTION prevent_issued_invoice_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.zatca_status IN ('submitted', 'cleared', 'reported') THEN
    RAISE EXCEPTION 'لا يمكن تعديل فاتورة تم إرسالها لـ ZATCA';
  END IF;
  RETURN NEW;
END;
$$;

-- SEC-02: منع تفعيل شهادة PLACEHOLDER — استخدام validation trigger
CREATE OR REPLACE FUNCTION validate_zatca_certificate_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true AND NEW.certificate LIKE 'PLACEHOLDER%' THEN
    RAISE EXCEPTION 'لا يمكن تفعيل شهادة وهمية (PLACEHOLDER) في بيئة الإنتاج';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_zatca_cert_activation ON zatca_certificates;
CREATE TRIGGER trg_validate_zatca_cert_activation
  BEFORE INSERT OR UPDATE ON zatca_certificates
  FOR EACH ROW
  EXECUTE FUNCTION validate_zatca_certificate_activation();

-- HI-01: دالة تنظيف سجلات invoice_chain المعلقة بـ PENDING
CREATE OR REPLACE FUNCTION cleanup_pending_invoice_chain()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM invoice_chain 
  WHERE invoice_hash = 'PENDING' 
  AND created_at < NOW() - INTERVAL '10 minutes';
$$;

-- سحب صلاحيات التنفيذ من العموم
REVOKE EXECUTE ON FUNCTION validate_zatca_certificate_activation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cleanup_pending_invoice_chain() FROM PUBLIC;
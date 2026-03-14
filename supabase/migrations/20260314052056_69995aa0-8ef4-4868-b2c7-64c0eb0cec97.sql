
-- تنظيف المشغّلات المكررة — الإبقاء على واحد فقط
DROP TRIGGER IF EXISTS encrypt_zatca_private_key_trigger ON public.zatca_certificates;
DROP TRIGGER IF EXISTS trg_encrypt_zatca_private_key ON public.zatca_certificates;

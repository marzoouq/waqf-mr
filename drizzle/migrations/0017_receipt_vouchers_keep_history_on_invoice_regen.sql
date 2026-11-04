-- السند وثيقة دائمة: لا يمنع إعادة توليد الفواتير غير المسددة، ويحتفظ بمعرّف الفاتورة كمرجع تاريخي
ALTER TABLE public.receipt_vouchers DROP CONSTRAINT IF EXISTS receipt_vouchers_payment_invoice_id_fkey;
ALTER TABLE public.receipt_vouchers DROP CONSTRAINT IF EXISTS receipt_vouchers_contract_id_fkey;
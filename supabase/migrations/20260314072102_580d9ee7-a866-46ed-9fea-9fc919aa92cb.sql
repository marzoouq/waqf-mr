
-- ============================================================
-- إصلاحات الفحص الجنائي — السنة المالية المقفلة 2024-2025
-- ============================================================

-- تعطيل مؤقت لمشغلات حماية السنة المقفلة
ALTER TABLE distributions DISABLE TRIGGER prevent_closed_fy_distributions;
ALTER TABLE payment_invoices DISABLE TRIGGER prevent_closed_fy_payment_invoices;

-- ─── إصلاح A: ربط التوزيعات اليتيمة بالسنة المقفلة ───
UPDATE distributions
SET fiscal_year_id = (
  SELECT fy.id FROM fiscal_years fy
  JOIN accounts a ON a.fiscal_year_id = fy.id
  WHERE a.id = distributions.account_id
  LIMIT 1
)
WHERE fiscal_year_id IS NULL;

-- ─── إصلاح B: تحديث العقارات السكنية كمعفاة من الضريبة ───
UPDATE properties
SET vat_exempt = true
WHERE property_type IN ('مبنى سكني', 'شقق سكنية', 'سكني', 'شقة', 'فيلا')
  AND vat_exempt = false;

-- ─── إصلاح C: تصفير ضريبة الفواتير السكنية غير الموقعة ───
UPDATE payment_invoices pi
SET vat_rate = 0, vat_amount = 0
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE pi.contract_id = c.id
  AND p.vat_exempt = true
  AND pi.vat_rate > 0
  AND (pi.zatca_status IS NULL OR pi.zatca_status = 'not_submitted')
  AND pi.icv IS NULL;

-- ─── إصلاح D: ربط فواتير الدفعات اليتيمة بسنتها المالية ───
UPDATE payment_invoices pi
SET fiscal_year_id = c.fiscal_year_id
FROM contracts c
WHERE pi.contract_id = c.id
  AND pi.fiscal_year_id IS NULL
  AND c.fiscal_year_id IS NOT NULL;

-- إعادة تفعيل المشغلات
ALTER TABLE distributions ENABLE TRIGGER prevent_closed_fy_distributions;
ALTER TABLE payment_invoices ENABLE TRIGGER prevent_closed_fy_payment_invoices;

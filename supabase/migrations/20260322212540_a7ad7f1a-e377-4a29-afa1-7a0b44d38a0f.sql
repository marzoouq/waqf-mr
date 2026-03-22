-- M-01: تصحيح البيانات — ربط fiscal_year_id من accounts للتوزيعات بدون سنة مالية
UPDATE distributions d
SET fiscal_year_id = a.fiscal_year_id
FROM accounts a
WHERE d.account_id = a.id
  AND d.fiscal_year_id IS NULL;
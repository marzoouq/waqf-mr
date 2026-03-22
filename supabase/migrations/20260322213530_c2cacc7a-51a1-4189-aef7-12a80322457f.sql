-- تعطيل مؤقت لمشغل حماية السنة المقفلة
ALTER TABLE public.distributions DISABLE TRIGGER prevent_closed_fy_distributions;

-- M-01: تصحيح البيانات — ربط fiscal_year_id من accounts
UPDATE public.distributions d
SET fiscal_year_id = a.fiscal_year_id
FROM public.accounts a
WHERE d.account_id = a.id
  AND d.fiscal_year_id IS NULL;

-- إعادة تفعيل المشغل فوراً
ALTER TABLE public.distributions ENABLE TRIGGER prevent_closed_fy_distributions;
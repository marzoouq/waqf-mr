-- #14: إضافة قيد فريد على fiscal_year_id في جدول accounts
-- لمنع إنشاء حسابين ختاميين لنفس السنة المالية
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_fiscal_year_id_unique UNIQUE (fiscal_year_id);
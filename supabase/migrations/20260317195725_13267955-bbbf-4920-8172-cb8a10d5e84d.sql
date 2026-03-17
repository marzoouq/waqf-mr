
-- سحب EXECUTE من anon للدوال الحساسة (الجداول والعروض تم سحبها في migration سابق)
REVOKE EXECUTE ON FUNCTION public.is_fiscal_year_accessible(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) FROM anon;

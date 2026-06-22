-- R10: تقليل سطح الهجوم — منع anon/authenticated من استدعاء دوال rate-limit الداخلية
-- المبرر: تُستدعى حصراً من Edge Functions عبر service_role؛ لا استخدام client مباشر
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_count(text) FROM anon, authenticated;
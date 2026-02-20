-- ═══════════════════════════════════════════════════════
-- إصلاح أمني: تقييد تنفيذ الدوال الحساسة
-- ═══════════════════════════════════════════════════════

-- 1. منع anon من استدعاء دوال الإشعارات (خطر تضخيم السجلات)
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_all_beneficiaries(text, text, text, text) FROM anon;

-- 2. تقييد log_access_event: السماح لـ anon و authenticated فقط (مطلوب لتسجيل الدخول الفاشل)
-- لكن منع PUBLIC العام وإعادة المنح بشكل صريح
REVOKE EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) TO anon, authenticated;

-- 3. تقييد notify_admins و notify_all_beneficiaries للمصادق فقط
GRANT EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all_beneficiaries(text, text, text, text) TO authenticated;

-- 4. تقييد has_role: مطلوبة في RLS لذا تبقى PUBLIC (مطلوب)
-- لا تغيير

-- 5. get_public_stats: مصممة للعرض العام - تبقى PUBLIC (مطلوب)
-- لا تغيير
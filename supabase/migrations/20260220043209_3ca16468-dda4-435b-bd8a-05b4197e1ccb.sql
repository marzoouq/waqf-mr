
-- ═══════════════════════════════════════════════════════════
-- P0: سحب صلاحية تنفيذ log_access_event من anon
-- السبب: دالة SECURITY DEFINER تُدخل في access_log مباشرة
-- يجب أن تبقى متاحة لـ authenticated (لتسجيل login_failed من صفحة الدخول)
-- ═══════════════════════════════════════════════════════════

-- سحب الصلاحية من PUBLIC أولاً ثم من anon تحديداً
REVOKE EXECUTE ON FUNCTION public.log_access_event FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_access_event FROM anon;

-- إعادة المنح لـ authenticated فقط
GRANT EXECUTE ON FUNCTION public.log_access_event TO authenticated;

-- أيضاً: get_public_stats لا حاجة لها من anon (تُستدعى فقط من الصفحة الرئيسية بعد التحميل)
-- لكنها مصممة كإحصائيات عامة، لذا نبقيها لكن نضيف rate limiting عبر التحقق

# Supabase Migrations — سياسة الإدارة

## الوضع الحالي (2026-07-08)

- **العدد**: 389 ملف migration في `supabase/migrations/`
- **الأداة**: Lovable Cloud (Supabase managed) — تُطبَّق تلقائيًا
- **الترتيب**: زمني حسب الطابع في اسم الملف

## قواعد إلزامية

1. **لا تُعِد تسمية migration قديم** — الترتيب الزمني ثابت. إعادة التسمية تكسر البيئات المنشورة.
2. **لا تحذف migration مطبَّقًا** — أنشئ migration عكسيًا جديدًا.
3. **كل `CREATE TABLE public.*` يجب أن يتبعه `GRANT` في نفس migration** (راجع `AGENTS.md`).
4. **RLS إلزامي** لكل جدول جديد في `public`. الترتيب: `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`.
5. **ممنوع `ALTER DATABASE postgres`** — يُرفض من Lovable Cloud.
6. **Triggers للتحقق الزمني** بدلًا من CHECK constraints.

## دمج migrations القديمة (Squash)

غير مستحسن طالما الإنتاج يعمل. إن اضطررت: فرع اختباري + snapshot جديد + اختبار على قاعدة نظيفة قبل الدمج.

## المرجع

- سياسة GRANT و RLS: `AGENTS.md`
- بروتوكول ما قبل الدفع: `CONTRIBUTING.md`

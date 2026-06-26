# خطة الترقيات البصرية للتطبيق

نظام التصميم الحالي قوي (CSS variables موحدة، Tailwind v4، Tajawal/Amiri، Dark Mode، RTL، 6 ثيمات قابلة للتبديل). الفرص الحقيقية ليست إعادة هوية — بل **تلميع** يرفع الإحساس بالجودة دون كسر شيء.

## الموجة 1 — Polish أساسي (مخاطر صفر)

1. **توحيد الظلال** عبر CSS tokens جديدة:
   - `--shadow-sm` / `--shadow-md` / `--shadow-elegant` / `--shadow-glow`
   - استبدال أي `shadow-lg` متناثر في البطاقات الرئيسية
2. **توحيد نصف القطر** (`--radius` حالياً مفرد) — إضافة طبقات `xl`/`2xl` لبطاقات KPI
3. **Focus rings محسّنة** لـ a11y: ring بسماكة 2px بلون `--ring` مع offset
4. **Skeleton loaders موحّدة** بدل spinners المتناثرة (مكوّن `<KpiSkeleton/>` و `<TableSkeleton/>`)
5. **Empty states موحّدة**: مكوّن `<EmptyState icon title description action/>` بأيقونة Lucide ونص عربي

## الموجة 2 — Motion & Micro-interactions

6. **انتقالات الصفحات**: `fade-in` خفيف (200ms) على `<RouteOutlet>` لتخفيف القفز البصري
7. **Hover states على الجداول**: تباين أعلى + cursor pointer للصفوف القابلة للنقر
8. **Animated counters** لأرقام KPI الكبيرة في Dashboards (count-up 600ms)
9. **Toast variants ملوّنة** (success/warning/destructive) بدل اللون الواحد الحالي
10. **Loading button states**: spinner داخلي + تعطيل تلقائي أثناء mutations

## الموجة 3 — Dashboard hierarchy (اختياري)

11. **Bento Grid** لبطاقات KPI الرئيسية في `WaqifDashboard` و `BeneficiaryDashboard` (بطاقة كبيرة + 3 صغيرة)
12. **Sparklines مصغّرة** داخل بطاقات الإيرادات/المصروفات (Recharts موجود)
13. **Badge محسّن للحالات** (مدفوع/متأخر/معلّق) بألوان dot + نص

## ما لن أغيّره
- الهوية (Tajawal/Amiri، الثيمات الـ6، الألوان الأساسية)
- البنية (Pages/Hooks/Components)
- أي منطق أعمال

## التحقق
- TSC + Vitest بعد كل موجة
- لقطات Playwright قبل/بعد لـ 3 صفحات (Dashboard ناظر، Dashboard مستفيد، Settings)

## الاختيار
- **(أ)** الموجة 1 فقط — دقائق، تأثير فوري ملموس
- **(ب)** الموجتان 1 + 2 — موصى به
- **(ج)** الموجات الثلاث كاملة
- **(د)** تقرير تدقيق بصري مفصّل قبل أي تنفيذ

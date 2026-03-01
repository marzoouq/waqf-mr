

# إصلاح عدم ظهور البيانات في بيئة الإنتاج

## المشكلة الجذرية

في بيئة الإنتاج (Live)، جدول الحسابات الختامية (`accounts`) يحتوي على سجلين لكن عمود `fiscal_year_id` فارغ (NULL) في كليهما:
- حساب 2024-2025: `fiscal_year_id = NULL`
- حساب 2025-2026: `fiscal_year_id = NULL`

بينما في بيئة التطوير (Test) نفس الحسابات مربوطة بشكل صحيح بالسنوات المالية.

عندما يختار المستفيد سنة مالية، الكود يبحث عن حسابات بـ `fiscal_year_id = UUID` لكن لا يجد شيئاً لأن القيمة فارغة في الإنتاج.

## الحل (خطوتان)

### الخطوة 1: إصلاح البيانات في الإنتاج (يدوي)
يجب تشغيل استعلام SQL في بيئة الإنتاج لربط الحسابات بالسنوات المالية:

```sql
UPDATE accounts a
SET fiscal_year_id = fy.id
FROM fiscal_years fy
WHERE a.fiscal_year = fy.label
  AND a.fiscal_year_id IS NULL;
```

هذا الاستعلام يربط كل حساب بالسنة المالية المقابلة بناءً على حقل `fiscal_year` (النص).

### الخطوة 2: حماية مستقبلية في الكود
تعديل `useAccountByFiscalYear` في `src/hooks/useAccounts.ts` ليبحث أيضاً بحقل `fiscal_year` (النص) كخطة بديلة عند عدم وجود نتائج بـ `fiscal_year_id`. هذا يمنع تكرار المشكلة إذا أُضيفت حسابات جديدة بدون ربطها.

### التفاصيل التقنية

**الملف:** `src/hooks/useAccounts.ts`

تعديل دالة `queryFn` في `useAccountByFiscalYear` لتضيف fallback:
- أولاً: البحث بـ `fiscal_year_id`
- إذا لم تُرجع نتائج والـ `fiscalYearLabel` متوفر: البحث بـ `fiscal_year` (النص)

هذا يضمن عمل التطبيق حتى لو لم يُربط `fiscal_year_id` بعد.


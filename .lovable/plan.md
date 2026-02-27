

# إصلاح 4 مشاكل مؤكدة من الفحص الجنائي العميق

## نتائج التحقق

بعد قراءة كل ملف سطراً بسطر، من أصل 10 بنود في التقرير:
- **4 مشاكل حقيقية تستحق الإصلاح**
- **3 بنود صحيحة لكنها قرارات تصميمية واعية** (shareBase سالب، تحيز AI، logger)
- **2 بند خطره أقل مما يبدو** (isNonAdmin محمي بـ isLoading، cache invalidation يعمل صحيحاً)
- **1 بند خاطئ** (cache invalidation -- React Query يستخدم prefix match)

---

## الإصلاحات المطلوبة

### 1. [امني - عاجل] كلمة المرور 6 vs 8 في guard-signup

**الملف:** `supabase/functions/guard-signup/index.ts` سطر 61

**المشكلة:** الواجهة تفرض 8 أحرف لكن الـ Edge Function تقبل 6.

**الإصلاح:** تغيير `< 6` الى `< 8` وتحديث رسالة الخطأ:
```text
password.length < 8  -->  "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً"
```

### 2. [اداء] logger.warn في كل render

**الملف:** `src/hooks/useFiscalYears.ts` سطر 37-39

**المشكلة:** `logger.warn` خارج `useEffect` يُنفّذ في كل render. لا أثر في production لكن يُولّد ضجيج في development.

**الإصلاح:** لف الـ log في `useEffect`:
```text
useEffect(() => {
  if (!active && fiscalYears.length > 0) {
    logger.warn('No active fiscal year found...');
  }
}, [active, fiscalYears.length]);
```

### 3. [تقني] omitOnCreate dead code في useCrudFactory

**الملف:** `src/hooks/useCrudFactory.ts` سطر 31-32

**المشكلة:** `omitOnCreate` معرّف في الـ interface لكن غير مُستخدم في `useCreate`.

**الإصلاح:** حذف الخاصية من الـ interface والتعليق المرافق لها (سطران فقط). لا يوجد أي مستهلك لها في المشروع.

### 4. [امني - محدود] اضافة RLS على accounts لفلترة السنوات غير المنشورة

**الملف:** Migration جديد

**المشكلة:** جدول `accounts` يسمح للمستفيد بقراءة حسابات سنوات مالية غير منشورة. باقي الجداول (contracts, income, expenses, invoices) تطبق `is_fiscal_year_accessible` لكن `accounts` لا.

**الإصلاح:** اضافة سياسة RLS تقييدية:
```text
CREATE POLICY "Restrict unpublished fiscal year data on accounts"
ON public.accounts FOR SELECT AS RESTRICTIVE
USING (is_fiscal_year_accessible(fiscal_year_id));
```

---

## بنود تم التحقق منها ولا تحتاج اصلاح

| البند | السبب |
|-------|-------|
| shareBase سالب | قرار محاسبي صحيح -- الخسارة معلومة مفيدة للناظر |
| isNonAdmin قبل تحميل role | محمي بـ `isLoading = true` اثناء التحميل |
| Cache invalidation | React Query يستخدم prefix match -- يعمل صحيحا |
| تحيز AI prompt | تصميم مقصود من صاحب المشروع (الناظر) |
| Logger في production | تصميم امني مقصود لمنع تسريب معلومات |

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/guard-signup/index.ts` | تغيير حد كلمة المرور من 6 الى 8 |
| `src/hooks/useFiscalYears.ts` | لف logger.warn في useEffect |
| `src/hooks/useCrudFactory.ts` | حذف omitOnCreate dead code |
| Migration جديد | اضافة RLS على accounts لفلترة السنوات غير المنشورة |

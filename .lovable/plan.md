
# إصلاح توجيه الواقف + تعليق الاختبار

## ملخص
إصلاحان بسيطان تم التحقق من صحتهما بالكامل مقابل الكود الفعلي.

---

## الإصلاح 1: توجيه الواقف إلى لوحته المخصصة
**الملف:** `src/pages/Index.tsx` سطر 40-42

**المشكلة:** الواقف يُوجَّه إلى `/beneficiary` بدلاً من `/waqif` رغم وجود المسار `/waqif` في `App.tsx`.

**التغيير:**
- حذف التعليق الخاطئ وتغيير `navigate('/beneficiary')` إلى `navigate('/waqif')`

---

## الإصلاح 2: تحديث اسم الاختبار
**الملف:** `src/contexts/FiscalYearContext.test.tsx` سطر 48

**المشكلة:** اسم الاختبار يقول `defaults to "all"` لكن التوقع الفعلي هو `'fy-1'` (السنة المالية النشطة).

**التغيير:**
- تحديث اسم الاختبار من `defaults to "all" for admin when no selection` إلى `defaults to active fiscal year for admin when no selection`

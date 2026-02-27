

# خطة إصلاح المشاكل المؤكدة من الجولة الثانية

## التحقق من ادعاءات التقرير

بعد قراءة الكود الفعلي، تبيّن أن **7 من 11 ادعاء تستشهد بكود قديم مُصلَح بالفعل**:

| الادعاء | الحالة الفعلية |
|---------|---------------|
| `execute_distribution` بدون idempotency | **مُصلَح** — سطر 41-48: EXISTS guard موجود |
| `execute_distribution` يثق بـ `p_total_distributed` | **مُصلَح** — سطر 116-124: يحسب SUM من DB |
| `signUp` يكشف `error?.message` | **مُصلَح** — يستخدم `getSafeErrorMessage()` |
| `admin-manage-users` سطر 65 | **مُصلَح** — `"إجراء غير صالح"` |
| `notifyUser` inbox spoofing | **غير صحيح** — RLS تمنع INSERT من غير admin |
| `shareBase` تناقض منطقي | **تصميم مقصود** — يعرض القيمة المحسوبة للمقارنة |
| `audit_trigger_func` — `user_id = NULL` | **سلوك متوقع** — العمليات الآلية (cron) ليس لها مستخدم |

---

## المشاكل المؤكدة فعلياً (4 مشاكل)

### 1. `admin-manage-users/index.ts` سطر 395 — `default` case يعكس `action`

رغم أنه غير قابل للوصول عملياً (الفحص في سطر 64 يمنع الوصول)، يبقى نمطاً غير آمن كطبقة دفاع إضافية.

**الإصلاح:** تغيير `Invalid action: ${action}` إلى `"إجراء غير صالح"`

### 2. `useCarryforwardBalance` — `fiscalYearId` لا يُستخدم في الاستعلام

الدالة تقبل `fiscalYearId` وتضعه في `queryKey` لكن لا تُطبّقه على الاستعلام. هذا لا يسبب مشكلة مالية فعلية لأن الترحيلات النشطة يجب خصمها بغض النظر عن مصدرها — المنطق التجاري الصحيح هو جلب **كل** الترحيلات النشطة للمستفيد. لكن وجود `fiscalYearId` في المعاملات والـ `queryKey` مُضلّل.

**الإصلاح:** إزالة `fiscalYearId` من المعاملات والـ `queryKey` لأنه غير مستخدم ومضلل، أو إضافة تعليق يوضح أن الجلب متعمّد لكل السنوات.

### 3. `useTenantPayments` سطر 106 — `error.message` يُكشف للمستخدم

`error.message` من Supabase/PostgREST قد يحتوي على أسماء جداول وأعمدة.

**الإصلاح:** حذف `+ error.message` من `toast.error`

### 4. `distributions` — trigger `prevent_closed_fy` غير مُنشأ

جداول `income`, `expenses`, `invoices`, `contracts`, `advance_requests` كلها محمية بالـ trigger، لكن `distributions` غير محمي. رغم أن `execute_distribution` هي SECURITY DEFINER (تتجاوز RLS)، فإن الحماية ضرورية ضد التعديل المباشر عبر client API.

**الإصلاح:** إنشاء trigger عبر migration

---

## ملخص التغييرات

| الملف | التغيير | الأولوية |
|-------|---------|----------|
| `supabase/functions/admin-manage-users/index.ts` | سطر 395: رسالة ثابتة | منخفض |
| `src/hooks/useTenantPayments.ts` | سطر 106: حذف `error.message` | متوسط |
| `src/hooks/useAdvanceRequests.ts` | توضيح أو تنظيف `fiscalYearId` | منخفض |
| Migration جديد | إنشاء trigger على `distributions` | متوسط |


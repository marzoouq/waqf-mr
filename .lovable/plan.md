

# إصلاح 3 مشاكل متبقية من الفحص الجنائي

## 1. FiscalYearContext -- حماية من عرض بيانات 'all' قبل تحديد الدور

**الملف:** `src/contexts/FiscalYearContext.tsx`

**المشكلة:** `isLoading` يخص fiscal_years فقط. عندما `role = null` (لم يُحمَّل بعد) يُحسب `isNonAdmin = false` فيُعاد `'all'` مؤقتاً.

**الإصلاح:** استخدام `loading` من `useAuth()` (يغطي تحميل الدور) مع `isLoading` الخاص بالسنوات المالية:

```text
const { role, loading: authLoading } = useAuth();
// ...
const fiscalYearId = (isLoading || authLoading)
  ? '__none__'
  : noPublishedYears ...
```

ملاحظة: `noPublishedYears` يحتاج نفس الحماية:
```text
const noPublishedYears = !isLoading && !authLoading && isNonAdmin && fiscalYears.length === 0;
```

---

## 2. accountsCalculations -- حماية shareBase من القيم السالبة

**الملف:** `src/utils/accountsCalculations.ts` سطر 47

**المشكلة:** اذا المصروفات + الزكاة اكبر من الدخل، تصبح حصص الناظر والواقف سالبة.

**الإصلاح:** اضافة `Math.max(0, ...)` على shareBase:

```text
const shareBase = Math.max(0, totalIncome - totalExpenses - zakatAmount);
```

هذا يمنع الحصص السالبة مع الحفاظ على باقي الحسابات (netAfterExpenses, netAfterVat, netAfterZakat) كما هي لعرض الخسارة الفعلية.

---

## 3. useTenantPayments -- نقل منطق التحصيل الى RPC

**الملف:** `src/hooks/useTenantPayments.ts` + Migration جديد

**المشكلة:** SELECT ثم UPSERT ثم INSERT income -- ثلاث عمليات منفصلة بدون transaction. ضغطتان سريعتان تُسبب سجلات دخل مكررة.

**الإصلاح:** انشاء Postgres Function `upsert_tenant_payment` تنفذ كل المنطق داخل transaction واحد:
- تقرأ `paid_months` الحالي مع `FOR UPDATE`
- تنفذ UPSERT على `tenant_payments`
- تنشئ سجلات الدخل التلقائية اذا زادت الدفعات
- تُعيد النتيجة

ثم تحديث `useUpsertTenantPayment` لاستدعاء RPC بدلاً من المنطق الحالي.

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/contexts/FiscalYearContext.tsx` | اضافة authLoading من useAuth |
| `src/utils/accountsCalculations.ts` | Math.max(0, shareBase) |
| Migration جديد | دالة upsert_tenant_payment |
| `src/hooks/useTenantPayments.ts` | استدعاء RPC بدلاً من client-side logic |




# إصلاح الخطأين الحرجين المتبقيين

## 1. تناقض مالي: `waqfRevenue: netAfterZakat` في `accountsCalculations.ts`

**الملف:** `src/utils/accountsCalculations.ts` سطر 59

**المشكلة:** عند السنة غير المقفلة، `waqfRevenue` يُعاد كـ `netAfterZakat` بينما `useComputedFinancials.ts` يُعيده كـ `0`. هذا يُنشئ تناقضاً بين لوحة المدير ولوحة المستفيد.

**الإصلاح:** تغيير السطر 59 من `waqfRevenue: netAfterZakat` إلى `waqfRevenue: 0`

---

## 2. تواريخ استحقاق خاطئة لـ `quarterly`/`semi_annual` في `contractAllocation.ts`

**الملف:** `src/utils/contractAllocation.ts` سطور 43-54

**المشكلة:** الدفعات الربعية والنصف سنوية تسقط في فرع `else` العام الذي يوزع بالتساوي بناء على الأيام بدلاً من استخدام فترات شهرية دقيقة (كل 3 أو 6 أشهر).

**الإصلاح:** إضافة فرعين صريحين قبل `else`:

```text
if (payment_type === 'monthly') → setMonth(i + 1)
else if (payment_type === 'quarterly') → setMonth((i + 1) * 3)
else if (payment_type === 'semi_annual') → setMonth((i + 1) * 6)
else → evenly spaced (كما هو)
```

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/utils/accountsCalculations.ts` | سطر 59: `waqfRevenue: 0` |
| `src/utils/contractAllocation.ts` | سطور 47-54: إضافة فرعي `quarterly` و `semi_annual` |

**الإجمالي:** ملفان، تعديلان


# hooks/domain/

طبقة الحسابات المشتقة (Domain Logic). تستهلك `hooks/data/` فقط ولا تتصل بـ Supabase مباشرة.

## القاعدة

- ✅ مسموح: قراءة من `hooks/data/*`, دوال نقية من `utils/`, hooks محلية للحالة المشتقة
- ❌ ممنوع: `supabase.from(...)`, `supabase.auth.*`, `supabase.rpc(...)` — استخدم `hooks/data/`
- ❌ ممنوع: استدعاء mutations مباشرة — هذا اختصاص `hooks/page/`

## الهوكات الحالية

### financial/
- `useRawFinancialData` — جلب البيانات الخام (إيرادات/مصروفات/ضريبة/زكاة)
- `useComputedFinancials` — السلسلة المالية الموحّدة (revenue→net→distributable)
- `useMyShare` — حصة المستفيد الحالي
- `useDistributionCalculation` — حساب التوزيع التناسبي
- `useContractAllocationMap` — توزيع دفعات العقود على السنوات
- `usePropertyFinancials`, `usePropertyPerformance` — أداء العقار
- `useAccountsData`, `useAccountsCalculations`, `useAccountsSettings`, `useAccountsEditing`, `useAccountsActions` — مكوّنات صفحة الحسابات

## نمط الاستخدام

```ts
// ✅ صحيح
export function useMyDomain() {
  const { data } = useRawFinancialData(fiscalYearId);
  return useMemo(() => computeStuff(data), [data]);
}

// ❌ خطأ — domain يجب ألا يلمس supabase
export function useMyDomain() {
  return supabase.from('contracts').select(); // ⛔
}
```



# خطة تنفيذ الأولويات العالية والمتوسطة — 10 مهام

---

## الأولويات العالية (5 مهام)

### المهمة 1: إزالة `as any` من `zatca_certificates_safe`
**الملفات:** `useZatcaCertificates.ts`, `useZatcaManagement.ts`, `diagnosticsService.ts`

المشكلة: الـ view موجود في `types.ts` تحت `Views` لكن `supabase.from()` لا يقبله بالنوع الصارم.

الحل: استخدام type assertion على مستوى الـ client بدل `as any`:
```typescript
// بدل as any:
.from('zatca_certificates_safe' as 'zatca_certificates_safe' & keyof Database['public']['Views'])
```
أو الأبسط: تعريف helper يقبل أسماء Views:
```typescript
const fromView = <T extends keyof Database['public']['Views']>(name: T) =>
  supabase.from(name as any) as ...;
```
مع توثيق السبب في تعليق واحد بدل 3 `as any` متفرقة.

---

### المهمة 2: تحويل `useMaxAdvanceAmount` لـ `useQuery`
**الملف:** `src/hooks/data/financial/useMaxAdvanceAmount.ts`

الحل:
```typescript
export const useMaxAdvanceAmount = (beneficiaryId: string, fiscalYearId: string | undefined, enabled: boolean) => {
  const query = useQuery<ServerAdvanceData | null>({
    queryKey: ['max-advance', beneficiaryId, fiscalYearId],
    enabled: enabled && !!beneficiaryId && !!fiscalYearId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_max_advance_amount', { ... });
      if (error) throw error;
      return data as ServerAdvanceData;
    },
  });
  return {
    serverData: query.data ?? null,
    loading: query.isLoading,
    reset: () => query.refetch(), // أو invalidate
  };
};
```
يحافظ على نفس الـ API الخارجي (`serverData`, `loading`, `reset`) فلا كسر في `AdvanceRequestDialog`.

---

### المهمة 3: توحيد `useZatcaCertificates` + إضافة `staleTime` لـ `invoice-chain`
**الملفات:** `useZatcaCertificates.ts`, `useZatcaManagement.ts`

المشكلة: نفس `queryKey: ['zatca-certificates']` في ملفين بأعمدة مختلفة — يتصارعان في cache.

الحل:
- `useZatcaManagement` يستورد `useZatcaCertificates()` بدل تعريف query جديد
- توحيد الأعمدة المطلوبة في `useZatcaCertificates` (إضافة ما ينقص)
- إضافة `staleTime: STALE_FINANCIAL` لـ `useZatcaCertificates`
- إضافة `staleTime: STALE_FINANCIAL` لـ `invoice-chain` query (سطر 85)

---

### المهمة 4: إزالة `!` assertions في `useHistoricalComparison`
**الملف:** `src/hooks/page/admin/useHistoricalComparison.ts` — سطور 90-94

الحل:
```typescript
const d0 = yearData[0];
const d1 = yearData[1];
if (!d0 || !d1) {
  defaultNotify.error('بيانات السنوات غير مكتملة');
  return;
}
```

---

### المهمة 5: إصلاح `comparisonRows` dependency
**الملف:** `src/hooks/page/admin/useHistoricalComparison.ts` — سطر 83

الحل: تغيير `[selectedYears.length]` → `[selectedYears]`

---

## الأولويات المتوسطة (5 مهام)

### المهمة 6: إصلاح `webVitals` typing
**الملف:** `src/lib/monitoring/webVitals.ts` — سطر 28

الحل:
```typescript
const vitalsKeys = ['lcp', 'cls', 'inp', 'fcp', 'ttfb'] as const;
type VitalKey = typeof vitalsKeys[number];
function handleMetric(metric: Metric) {
  const key = metric.name.toLowerCase() as string;
  if (vitalsKeys.includes(key as VitalKey)) {
    snapshot[key as VitalKey] = Math.round(metric.value * 100) / 100;
    snapshot.updatedAt = Date.now();
  }
}
```

---

### المهمة 7: إنشاء `arabic-reshaper.d.ts`
**الملف الجديد:** `src/types/arabic-reshaper.d.ts`

```typescript
declare module 'arabic-reshaper' {
  export function convertArabic(text: string): string;
  export default { convertArabic };
}
```
ثم حذف `@ts-ignore` و `eslint-disable` من `arabicReshaper.ts`.

---

### المهمة 8: `useMemo` لـ `filteredInvoices` + نقل `statusBadgeVariant` خارج الهوك
**الملف:** `src/hooks/page/beneficiary/useInvoicesViewPage.ts`

الحل:
```typescript
// خارج الهوك — ثابتة لا تحتاج re-creation
const statusBadgeVariant = (status: string): ... => { ... };

// داخل الهوك
const filteredInvoices = useMemo(() => invoices.filter(...), [invoices, searchQuery]);
```

---

### المهمة 9: مركزة `statusBadgeVariant`
**ملف جديد:** `src/utils/ui/badgeVariants.ts`

```typescript
export const invoiceStatusBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (status === 'paid') return 'default';
  if (status === 'cancelled' || status === 'overdue') return 'destructive';
  return 'secondary';
};
```

تحديث 3 ملفات لاستيرادها: `useInvoicesPage.ts`, `useInvoicesViewPage.ts`, `InvoiceGridView.tsx`.

---

### المهمة 10: مركزة `ITEMS_PER_PAGE`
**ملف جديد:** `src/constants/pagination.ts`

```typescript
export const DEFAULT_PAGE_SIZE = 10;
export const PROPERTIES_PAGE_SIZE = 9;
export const BENEFICIARIES_PAGE_SIZE = 9;
```

تحديث 7+ هوكس لاستيراد `DEFAULT_PAGE_SIZE` بدل التعريف المحلي.

---

## ملخص التأثير

| # | الملفات المتأثرة | نوع التغيير | خطر الكسر |
|---|-----------------|------------|----------|
| 1 | 3 ملفات + helper جديد | type safety | صفر |
| 2 | 1 ملف | refactor → useQuery | صفر (نفس API) |
| 3 | 2 ملفات | توحيد + staleTime | صفر |
| 4-5 | 1 ملف | guard + dependency fix | صفر |
| 6 | 1 ملف | type fix | صفر |
| 7 | 1 ملف جديد + 1 تعديل | d.ts | صفر |
| 8 | 1 ملف | useMemo + extract | صفر |
| 9 | 1 ملف جديد + 3 تعديل | مركزة | صفر |
| 10 | 1 ملف جديد + 7 تعديل | مركزة | صفر |

**~18 ملف، صفر كسر متوقع، تحسين كبير في type safety والأداء والصيانة.**


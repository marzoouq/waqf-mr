# الخطوة #2 — مركزة مفاتيح ZATCA

## الجرد الكامل

**5 مفاتيح فريدة** موزّعة على **7 ملفات** (4 في `hooks/data/zatca/` + 1 في `hooks/page/admin/management/zatca/`):

| المفتاح الحالي | النوع | الملفات المستخدمة |
|---|---|---|
| `['zatca-certificates']` | ثابت | `useZatcaCertificates.ts`، `useZatcaOnboarding.ts` (×2)، `useZatcaCompliance.ts` (×2) |
| `['zatca-operation-log']` | ثابت | `useZatcaOperationLog.ts`، `useZatcaCompliance.ts` (×3) |
| `['zatca-required-settings']` | ثابت | `useZatcaOnboardingReadiness.ts` |
| `['zatca-invoices', statusFilter, fiscalYearId]` | بارامتري | `useZatcaInvoices.ts`، `useZatcaInvoiceActions.ts` (prefix invalidate) |
| `['zatca-payment-invoices', statusFilter, fiscalYearId]` | بارامتري | `useZatcaInvoices.ts`، `useZatcaInvoiceActions.ts` (prefix invalidate) |

**إجمالي:** 5 تعريفات `queryKey` + 9 استدعاءات `invalidateQueries` = **14 موضع تعديل**.

ملاحظة: مفاتيح `appSettingsKeys.byCategory('zatca')` تم تغطيتها في الخطوة #1 ولا تتأثر هنا.

## الملف الجديد

`src/lib/queryKeys/zatcaKeys.ts` على نمط `appSettingsKeys.ts`:

```ts
export const zatcaKeys = {
  certificates: () => ['zatca-certificates'] as const,
  operationLog: () => ['zatca-operation-log'] as const,
  requiredSettings: () => ['zatca-required-settings'] as const,
  invoices: (statusFilter: string, fiscalYearId: string | null) =>
    ['zatca-invoices', statusFilter, fiscalYearId] as const,
  paymentInvoices: (statusFilter: string, fiscalYearId: string | null) =>
    ['zatca-payment-invoices', statusFilter, fiscalYearId] as const,
  prefixes: {
    certificates: ['zatca-certificates'] as const,
    operationLog: ['zatca-operation-log'] as const,
    invoices: ['zatca-invoices'] as const,
    paymentInvoices: ['zatca-payment-invoices'] as const,
  },
} as const;
```

## خطوات التنفيذ (بالترتيب)

1. **إنشاء** `src/lib/queryKeys/zatcaKeys.ts`
2. **`useZatcaCertificates.ts`** — استبدال `queryKey` بـ `zatcaKeys.certificates()`
3. **`useZatcaOperationLog.ts`** — `zatcaKeys.operationLog()`
4. **`useZatcaOnboardingReadiness.ts`** — `zatcaKeys.requiredSettings()`
5. **`useZatcaInvoices.ts`** — استدعاءان: `zatcaKeys.invoices(...)` و `zatcaKeys.paymentInvoices(...)`
6. **`useZatcaInvoiceActions.ts`** — `prefixes.invoices` و `prefixes.paymentInvoices`
7. **`useZatcaOnboarding.ts`** — استبدال invalidations لـ `prefixes.certificates` (موضعان)
8. **`useZatcaCompliance.ts`** — 5 invalidations: `prefixes.certificates` (×2)، `prefixes.operationLog` (×3)

## معايير الإنجاز

- `rg "'zatca-(certificates|operation-log|required-settings|invoices|payment-invoices)'" src/` → صفر نتائج خارج `zatcaKeys.ts`.
- `bun run typecheck` و `bun run lint` نظيفان (تجاهل الأخطاء السابقة الـ3 غير المرتبطة).
- اختبار يدوي: `/dashboard/admin/zatca` — قائمة الفواتير، السجل، الشهادات تعمل وتُحدَّث بعد العمليات.

## التراجع

`git revert` واحد — كل التغييرات استبدالات دلالية متطابقة في الشكل النهائي للمفتاح.

## بعد الإنجاز

السؤال للمستخدم: المتابعة إلى الخطوة #3 (`fiscalYearKeys.ts`)؟



# خطة إصلاح أخطاء البناء — 7 إصلاحات

## المشكلة
4 barrel files تُصدّر أسماء غير موجودة في الملفات المصدرية + 3 ملفات تستورد من مسارات قديمة.

---

## الإصلاحات

### 1. `src/utils/format/index.ts` — إعادة كتابة التصديرات

**الحالي (خطأ):**
```ts
export { formatCurrency, formatDate, formatNumber, formatPercent } from './format';
export { safeErrorMessage } from './safeErrorMessage';
export { validateNationalId } from './validateNationalId';
```

**الصحيح:**
```ts
export { fmt, fmtInt, fmtSAR, fmtPct, fmtDate, fmtDateHijri } from './format';
export { normalizeArabicDigits } from './normalizeDigits';
export { maskBankAccount, maskNationalId } from './maskData';
export { safeNumber } from './safeNumber';
export { getSafeErrorMessage } from './safeErrorMessage';
export { validateSaudiNationalId, getNationalIdError } from './validateNationalId';
```

### 2. `src/utils/financial/index.ts` — إعادة كتابة التصديرات

**الصحيح:**
```ts
export { calculateFinancials, groupIncomeBySource, groupExpensesByType, computeTotals,
         type FinancialParams, type FinancialResult } from './accountsCalculations';
export { allocateContractToFiscalYears, getContractSpanInfo, generatePaymentDueDates,
         type FiscalAllocation } from './contractAllocation';
export * from './contractHelpers';
export { findAccountByFY } from './findAccountByFY';
export { computeMonthlyData, computeCollectionSummary, computeOccupancy,
         type MonthlyDataPoint, type CollectionSummaryResult, type OccupancyResult } from './dashboardComputations';
```

### 3. `src/utils/export/index.ts` — إصلاح xlsx

**الصحيح:**
```ts
export { buildCsv, buildCsvFromRows, downloadCsv } from './csv';
export { buildXlsx, downloadXlsx } from './xlsx';
export { printDistributionReport } from './printDistributionReport';
export { printShareReport } from './printShareReport';
```

### 4. `src/utils/zatca/index.ts` — إصلاح الاسم

**الصحيح:**
```ts
export { generateZatcaQrTLV, generateQrDataUrl } from './zatcaQr';
```

### 5. `src/hooks/page/admin/useSupportDashboardPage.ts` سطر 33

تغيير:
```ts
const { buildCsvFromRows, downloadCsv } = await import('@/utils/csv');
```
إلى:
```ts
const { buildCsvFromRows, downloadCsv } = await import('@/utils/export/csv');
```

### 6. `src/test/regressionFixes.test.ts` سطر 8

تغيير:
```ts
import { ... } from "@/utils/contractAllocation";
```
إلى:
```ts
import { ... } from "@/utils/financial/contractAllocation";
```

### 7. `src/utils/pdf/__tests__/paymentInvoice.test.ts` أسطر 63, 111, 144

تغيير كل `@/utils/zatcaQr` إلى `@/utils/zatca/zatcaQr`

---

## أيضاً: `src/hooks/financial/useAccountsPage.test.ts` سطر 91

يحتوي على `vi.mock('@/utils/contractAllocation', ...)` — يجب تحديثه إلى `@/utils/financial/contractAllocation`

---

## الملخص: 8 ملفات تُعدّل، صفر تغيير معماري

| # | الملف | نوع التغيير |
|---|-------|-------------|
| 1 | `src/utils/format/index.ts` | إعادة كتابة barrel |
| 2 | `src/utils/financial/index.ts` | إعادة كتابة barrel |
| 3 | `src/utils/export/index.ts` | إعادة كتابة barrel |
| 4 | `src/utils/zatca/index.ts` | إعادة كتابة barrel |
| 5 | `useSupportDashboardPage.ts` | إصلاح مسار import |
| 6 | `regressionFixes.test.ts` | إصلاح مسار import |
| 7 | `paymentInvoice.test.ts` | إصلاح 3 مسارات import |
| 8 | `useAccountsPage.test.ts` | إصلاح مسار mock |


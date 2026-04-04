# خطة إعادة الهيكلة المعمارية — 4 مراحل

## المرحلة 1: استخراج Page Hooks لصفحات المستفيدين (8 hooks جديدة)

إنشاء hook مخصص لكل صفحة يستخرج كل المنطق (state, effects, callbacks, data fetching). الصفحة تبقى UI فقط.

| الصفحة | Hook جديد | ما يُستخرج |
|--------|-----------|-----------|
| `AccountsViewPage.tsx` (145 سطر) | `useAccountsViewPage` | 7 hooks + handleExportPdf + guards logic |
| `BeneficiaryDashboard.tsx` (204 سطر) | `useBeneficiaryDashboardPage` | realtime subscription + fyProgress calc + guards |
| `AnnualReportViewPage.tsx` (225 سطر) | `useAnnualReportViewPage` | 6 data hooks + grouped items + PDF/CSV export |
| `BylawsViewPage.tsx` (189 سطر) | `useBylawsViewPage` | search + grouping + PDF export |
| `NotificationsPage.tsx` (163 سطر) | `useNotificationsPage` | filters + grouping + push permission |
| `InvoicesViewPage.tsx` (151 سطر) | `useInvoicesViewPage` | search + pagination + PDF + viewMode |
| `SupportPage.tsx` (65 سطر) | `useSupportPage` | useState for ticket/dialog |
| `BeneficiarySettingsPage.tsx` (113 سطر) | `useBeneficiarySettingsPage` | fetch beneficiaries + maskedId + retry |

**تحديث** `src/hooks/page/beneficiary/index.ts` لإضافة التصديرات الـ 8 الجديدة.

---

## المرحلة 2: تصنيف ملفات `src/utils/` الجذرية (17 ملف + اختباراتهم)

نقل الملفات إلى مجلدات فرعية مع إنشاء barrel files:

```
src/utils/
├── financial/    ← accountsCalculations, contractAllocation, contractHelpers, findAccountByFY, dashboardComputations + tests
├── format/       ← format, normalizeDigits, maskData, safeNumber, safeErrorMessage, validateNationalId + tests
├── export/       ← csv, xlsx, printDistributionReport, printShareReport + tests
├── chart/        ← chartHelpers + test
├── zatca/        ← zatcaQr + test
├── image/        ← resizeImage
├── fonts/        ← loadAmiriFonts + test
```

**تحديث جميع الاستيرادات** — مثلاً `safeNumber` مستورد في 73 ملف، سيتحول من `@/utils/safeNumber` إلى `@/utils/format/safeNumber` (أو عبر barrel `@/utils/format`).

---

## المرحلة 3: نقل `useIsMountedRef` إلى `hooks/ui/`

- نقل `src/hooks/useIsMountedRef.ts` → `src/hooks/ui/useIsMountedRef.ts`
- تحديث `src/hooks/ui/index.ts` لتصديره
- تحديث الاستيرادات في `LoginForm.tsx` و `useBiometricAuth.ts`

---

## المرحلة 4: تنظيف Type Safety في `pdfHelpers.ts`

إضافة interface صريح بدلاً من `as unknown as`:

```typescript
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

export const getLastAutoTableY = (doc: jsPDF, fallback = 90): number =>
  (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? fallback;
```

---

## الترتيب: المرحلة 1 → 2 → 3 → 4

**ملاحظات:**
- لن يتم تعديل أي ملف محمي
- المرحلة 2 هي الأكثر تأثيراً على الاستيرادات (73+ ملف لـ safeNumber وحده)
- كل الاستيرادات تستخدم `@/`

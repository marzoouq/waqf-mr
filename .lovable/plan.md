

# خطة إعادة الهيكلة المُصحّحة — 4 مراحل

## المرحلة 1: استخراج 6 Page Hooks إلزامية

إنشاء hook لكل صفحة في `src/hooks/page/beneficiary/` يستخرج كل المنطق. الصفحة تبقى JSX فقط.

| الصفحة | Hook جديد |
|--------|-----------|
| `AccountsViewPage.tsx` (145 سطر) | `useAccountsViewPage` |
| `BeneficiaryDashboard.tsx` (204 سطر) | `useBeneficiaryDashboardPage` |
| `AnnualReportViewPage.tsx` (225 سطر) | `useAnnualReportViewPage` |
| `BylawsViewPage.tsx` (189 سطر) | `useBylawsViewPage` |
| `NotificationsPage.tsx` (163 سطر) | `useNotificationsPage` |
| `InvoicesViewPage.tsx` (151 سطر) | `useInvoicesViewPage` |

**مستبعدة:** `SupportPage` (65 سطر) و `BeneficiarySettingsPage` (113 سطر — اختيارية)

تحديث `src/hooks/page/beneficiary/index.ts` لتصدير الـ 6 hooks الجديدة.

---

## المرحلة 2: تصنيف 19 ملف utils في 7 مجلدات فرعية

| المجلد | الملفات |
|--------|---------|
| `utils/financial/` | accountsCalculations, contractAllocation, contractHelpers, findAccountByFY, dashboardComputations |
| `utils/format/` | format, normalizeDigits, maskData, safeNumber, safeErrorMessage, validateNationalId |
| `utils/export/` | csv, xlsx, printDistributionReport, printShareReport |
| `utils/chart/` | chartHelpers |
| `utils/zatca/` | zatcaQr |
| `utils/image/` | resizeImage |
| `utils/fonts/` | loadAmiriFonts |

لكل مجلد: barrel file + تحديث جميع الاستيرادات (~100 ملف).

---

## المرحلة 3: نقل `useIsMountedRef` إلى `hooks/ui/`

نقل الملف + تحديث barrel file + تحديث استيرادات `LoginForm.tsx` و `useBiometricAuth.ts`.

---

## المرحلة 4: تحسين Type Safety في `pdfHelpers.ts`

إضافة `interface JsPDFWithAutoTable` بدلاً من `as unknown as` المباشر.

---

## ترتيب التنفيذ: 1 → 2 → 3 → 4

- لن يتم تعديل أي ملف محمي
- المرحلة 2 هي الأكثر تأثيراً على عدد الاستيرادات


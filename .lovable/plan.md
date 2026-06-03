# تنفيذ الخطة الشاملة — حالة 2026-06-03

## ✅ مُنجَز

### المرحلة 1 — إصلاحات H-02 المستفيد + Medium
- `useDisclosurePage.ts`: إضافة `distLoading` إلى `isLoading` + guard `isFyReady` على `useMyDistributions`.
- `useAccountsViewPage.ts`: استبدال `?? 'all'` بـ `isFyReady(...) ? id : 'all'`.
- `AccountantDashboardView.tsx`: استبدال `return null` بـ `DashboardSkeleton`، تصحيح "عقود بدون سنة" → "عقود بدون فواتير"، استبدال أيقونة `Link` بـ `FileX`.
- `MonthlyCollectionCard.tsx`: استبدال `return null` الصامت بـ EmptyState.
- (ملاحظة) `AiAssistant.tsx` غير موجود في المشروع — أُسقط من النطاق.

### المرحلة 2 — تقرير سنوي مُجمَّع PDF للناظر
- `src/utils/pdf/reports/aggregatedAnnualReport.ts` (جديد): مولّد PDF كامل — مؤشرات سريعة + تسلسل مالي كامل + إيرادات/مصروفات/مستفيدين/توزيعات + YoY + إنجازات/تحديات/خطط/حالة عقارات.
- `src/hooks/page/admin/dashboard/useAggregatedAnnualReport.ts` (جديد): يجمع من `useDashboardSummary` (أرقام موثوقة) + `useIncomeByFiscalYear` + `useExpensesByFiscalYear` + `useAnnualReportItems` + `useProperties` + استعلام `distributions` مباشر.
- `src/utils/pdf/index.ts`: تصدير `generateAggregatedAnnualReportPDF`.
- `src/pages/dashboard/AdminDashboard.tsx`: زر "تقرير سنوي مُجمَّع" (admin فقط، disabled حتى تجهز البيانات).

## ⏸️ مُؤجَّل للجلسة القادمة (نطاق كبير — يحتاج وقت تنفيذ مستقل)

### المرحلة 3 — تقرير تباين RPC ↔ Hooks (variance report)
ملف `src/lib/diagnostics/varianceReport.ts` + تكامل في صفحة Diagnostics + اختبار.

### المرحلة 4 — اختبارات E2E (Vitest + RTL)
ثلاث ملفات في `src/test/e2e/` لتدفقات admin/beneficiary/accountant.

### المرحلة 5 — فحص عددي شامل
`src/lib/diagnostics/checks/numericalAudit.ts` كفحص #8.

### المرحلة 6 — فحص تكامل الأزرار/التبويبات
`src/lib/diagnostics/checks/uiIntegrityCheck.ts` كفحص #9.

### قرار منتج معلَّق
H-02/H-03 صلاحيات المحاسب — بانتظار قرار المنتج.



# خطة تنفيذ توصيات التدقيق — 5 خطوات

## الخطوة 1: استخراج hooks لأربع صفحات

| الصفحة (المسار الفعلي) | Hook جديد | ما يُستخرج |
|---|---|---|
| `src/pages/beneficiary/ContractsViewPage.tsx` (139 سطر) | `useContractsViewPage.ts` | pagination state, stats memo, isExpiringSoon, paginatedContracts, PDF export, propertiesMap |
| `src/pages/beneficiary/WaqifDashboard.tsx` (186 سطر) | `useWaqifDashboardPage.ts` | 8 data hooks, contractualRevenue, collectionSummary, kpis, monthlyData, clock/greeting logic, overviewStats |
| `src/pages/beneficiary/FinancialReportsPage.tsx` (198 سطر) | `useFinancialReportsPage.ts` | queryClient invalidation, chart data memos (incomeVsExpenses, distributionData, etc.), handleDownloadPDF |
| `src/pages/dashboard/SystemDiagnosticsPage.tsx` (211 سطر) | `useSystemDiagnostics.ts` | results state, run/runSingle/exportResults callbacks, totalChecks/failures/warnings, allCategories |

كل صفحة تتحول إلى UI فقط تستدعي hook واحد. الـ hooks الجديدة تُوضع في `src/hooks/page/` (المجلد الحالي — قبل التقسيم في الخطوة 3).

---

## الخطوة 2: إصلاح `any` types (3 ملفات)

| الملف | الإصلاح |
|---|---|
| `src/components/expenses/ExpensesDesktopTable.tsx` سطر 31 | `onEdit: (item: ExpenseItem) => void` بدل `any` — النوع `ExpenseItem` معرّف فعلاً في نفس الملف سطر 15 |
| `src/components/expenses/ExpensesMobileCards.tsx` سطر 30 | نفس الإصلاح — `onEdit: (item: ExpenseItem) => void` |
| `src/pages/dashboard/AdminDashboard.tsx` سطر 119 | إزالة `as any` من `allFiscalYears` وتحديد النوع الصحيح من types.ts |

إزالة تعليقات `eslint-disable` المصاحبة بعد الإصلاح.

---

## الخطوة 3: تقسيم `hooks/page/` إلى مجلدات فرعية

```text
src/hooks/page/
├── admin/           ← 25 ملف (Dashboard, Contracts, Expenses, Income, Invoices, Properties, etc.)
├── beneficiary/     ← 8 ملفات (MyShare, Messages, ContractsView, Financial, Waqif, Disclosure, etc.)
├── shared/          ← 8 ملفات (Auth, GlobalSearch, NavLinks, DataExport, Permission, Security, AiChat)
└── index.ts         ← barrel يُعيد تصدير الكل (يحافظ على التوافق مع الاستيرادات الحالية)
```

**التوافق العكسي**: الـ barrel الرئيسي `index.ts` يُعيد تصدير كل المجلدات الفرعية، فلا حاجة لتعديل أي استيراد في باقي الكود (كلها تستورد من `@/hooks/page`).

---

## الخطوة 4: استبدال `console.error` في `main.tsx`

سطر 51 في `src/main.tsx`: استبدال `console.error('[BOOT]...')` بـ `logger.error('[BOOT]...')` مع إزالة تعليق `eslint-disable`.

---

## الخطوة 5: إضافة barrel files

إنشاء `index.ts` في ~17 مجلد مكونات ناقص (مثل `components/audit/`, `components/zatca/`, `components/financial/`, `components/waqif/`, إلخ). خطوة تدريجية لا تؤثر على الوظائف.

---

## ملاحظات

- جميع التغييرات refactoring بحت — لا تغيير في السلوك
- لن يُعدّل أي ملف محمي
- الخطوة 3 مصممة بحيث لا تكسر أي استيراد قائم بفضل الـ barrel المركزي


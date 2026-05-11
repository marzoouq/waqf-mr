## السياق

الفحص الفعلي يُظهر أن الصفحات الست (إدارية + عرض) موجودة ومُسجَّلة في المسارات وتستخدم هوكات بيانات حقيقية مرتبطة بـ `useFiscalYear()`. لا توجد بيانات وهمية. لذلك "التفعيل" المطلوب يُترجم عمليًا إلى **تحقّق وتشغيل آمن** للجلب-حسب-السنة-المالية + إصلاح أي ثغرات في إعادة الجلب وعرض المحدد + إزالة الحواجز التي قد تجعل الصفحة تظهر فارغة.

## الصفحات المعنية

| المنطقة | الصفحة | المسار | الهوك |
|---|---|---|---|
| إدارية | الحسابات الختامية | `/dashboard/accounts` | `useAccountsPage` |
| إدارية | التقرير السنوي (إفصاح) | `/dashboard/annual-report` | `useAnnualReportPage` |
| إدارية | التقارير + توزيع الحصص | `/dashboard/reports` | `useReportsData` |
| عرض | الإفصاح السنوي | `/beneficiary/disclosure` | `useDisclosurePage` |
| عرض | الحسابات الختامية | `/beneficiary/accounts` | `useAccountsViewPage` |
| عرض | التقرير السنوي | `/beneficiary/annual-report` | `useAnnualReportViewPage` |

## الخطوات

### 1) تدقيق `queryKey` لكل هوك بيانات تستهلكه الصفحات الثلاث
- التحقق أن كل `useQuery` يعتمد بيانات FY يحتوي `fiscalYearId` ضمن المفتاح (income/expenses/accounts/contracts/distributions/annual_report_items/annual_report_status).
- إصلاح أي مفتاح ثابت لا يعيد الجلب عند تغيير السنة.

### 2) ضمان وجود مُحدِّد سنة مالية مرئي في كل صفحة
- `AccountsPage`: يحتوي `AccountsSettingsBar` مع `onFiscalYearChange` — تأكيد أنه يحدّث الـ Context (لا state محلي فقط).
- `AnnualReportPage` و`ReportsPage`: لا يحتويان مُحدِّد محلي — يعتمدان على `DashboardLayout`. التحقق أن `DashboardLayout` يعرض `FiscalYearSelector` للأدوار الإدارية، وإلا إضافة Badge مع زر تغيير سريع في الـ `PageHeaderCard` لكل صفحة.
- صفحات العرض (beneficiary/waqif): التأكد أن `RequirePublishedYears` لا يحجب الصفحة إذا كانت هناك سنة منشورة، وأن الـ FY المعروض = ما يختاره المستفيد.

### 3) إزالة الحواجز التي تُظهر "فارغ" خطأً
- `useDisclosurePage` و`useAccountsViewPage`: حالة "السنة النشطة لم تُغلق" — تأكيد عرض القيم الديناميكية (المحسوبة من income/expenses) بدل صفر، طبقًا لقاعدة الذاكرة *Active fiscal year balances are calculated dynamically*.
- منع إعادة `isAccountMissing` كحاجز نهائي على السنة النشطة؛ يجب عرض الأرقام المحسوبة وإخفاء فقط حقول الحصص.

### 4) ربط حقيقي لتقرير توزيع الحصص داخل صفحتين
- داخل `ReportsPage` (تبويب "المالية"): التأكد أن `BeneficiaryDistributionTable` يستهلك `distributionData` المحسوب فعليًا من `availableAmount × share_percentage / totalPct` (مُؤكَّد في `useReportsData`).
- داخل `AccountsPage`: التأكد أن `AccountsDistributionTable` يستهلك ملخص `useAccountsPage` للسنة المختارة.
- في صفحة المستفيد: `DisclosureFinancialStatement` يعرض `myShare` و`beneficiariesShare` للسنة المعروضة.

### 5) Realtime + إبطال
- التأكد أن `useDashboardRealtime` يُبطل مفاتيح: `['income']`, `['expenses']`, `['accounts']`, `['distributions']`, `['contracts']`, `['annual_report_items']`, `['annual_report_status']` عند أي تغيير في الجداول، وأن الإبطال يستخدم `exact: false` ليشمل كل سنوات الكاش.

### 6) قبول/تحقق يدوي بعد التنفيذ
- تبديل السنة من الواجهة → الصفحات الثلاث الإدارية والعرضية تُعيد الجلب وتعرض أرقام السنة الجديدة خلال ثانيتين.
- إنشاء حساب ختامي / تعديل دخل في السنة → ينعكس فورًا في الإفصاح وتوزيع الحصص.
- نشر التقرير السنوي من `/dashboard/annual-report` → يظهر للمستفيد مباشرة في `/beneficiary/annual-report`.
- صفر بيانات تجريبية/Placeholder.

## التفاصيل التقنية

```text
FY Source of Truth
───────────────────
sessionStorage(fiscal_year_id)
        │
useFiscalYearPersistence ──► useResolvedFiscalYear ──► FiscalYearContext
        │                                                       │
        └──────────────► every page hook reads fiscalYearId ◄────┘
                                    │
                ┌───────────────────┼─────────────────────┐
                ▼                   ▼                     ▼
         useIncomeBy…      useExpensesBy…        useAnnualReportItems
         queryKey:         queryKey:             queryKey:
         ['income',fy]     ['expenses',fy]       ['annual_report_items',fy]
```

### ملفات سيتم لمسها (تقدير مبدئي)

- `src/hooks/financial/useRawFinancialData.ts` — تأكيد عدم تجاوز السنة النشطة وعرض القيم الديناميكية.
- `src/hooks/page/admin/financial/useAccountsPage.ts` — التحقق من `fiscalYearId` بدل `'all'` عند الحساب.
- `src/hooks/page/admin/reports/useReportsData.ts` — تأكيد إبطال الكاش للسنة المختارة.
- `src/hooks/page/admin/reports/useAnnualReportPage.ts` — استبدال `?? 'all'` بـ `?? FY_NONE` لمنع جلب كل السنوات.
- `src/hooks/page/beneficiary/financial/useDisclosurePage.ts` — رفع حاجز `isAccountMissing` للسنة النشطة.
- `src/hooks/page/beneficiary/financial/useAccountsViewPage.ts` — نفس الإصلاح.
- `src/components/layout/DashboardLayout.tsx` — تأكيد ظهور `FiscalYearSelector` لأدوار العرض، وإضافة Badge موحّدة في الـ Header.

### معايير القبول

1. `rg "queryKey:.*'income'" src/` — كل ظهور يحتوي `fiscalYearId`.
2. تبديل السنة → DevTools يُظهر استعلامات جديدة بمفاتيح FY الجديدة.
3. لا توجد قيمة مُهَيَّأة بصفر لو كان هناك income/expenses فعلي للسنة.
4. كل الاختبارات الموجودة (`*.test.ts(x)` للصفحات الست) تمرّ.
5. لا تعديل على: `client.ts`, `types.ts`, `config.toml`, `.env`، ولا تغييرات RLS.

### خارج النطاق

- إعادة تصميم الـ UI أو إضافة تبويبات جديدة.
- تغييرات في منطق الإقفال السنوي أو معادلة التوزيع.
- إنشاء صفحة `/reports/distribution` مستقلة (يبقى التوزيع داخل ReportsPage و AccountsPage).

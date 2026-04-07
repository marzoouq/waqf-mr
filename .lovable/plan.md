

# خطة تنفيذ التقرير الشامل — 12 بنداً

## التحقق من الوضع الحالي

تم فحص جميع الملفات المذكورة وتأكيد كل البنود المعلقة:
- **A4**: `netAfterZakat` سطر 20 — بدون `Math.max` ✅ مؤكد
- **B1**: `monthlyData` سطر 50-59 — `monthly_income` فقط، دالة `buildMonthlyData` متوفرة وتدعم income+expenses ✅ مؤكد
- **B2**: `remainingBalance` سطر 33 — بدون guard ✅ مؤكد
- **B3**: `handlePrintReport` سطر 138 — لا تحذير للسنة النشطة ✅ مؤكد
- **B4**: `withPdfLoading` سطر 43 — يُعاد إنشاؤه كل render ✅ مؤكد
- **B5**: `summaryCards` سطر 46 و `handleExportCsv` سطر 72 — بدون memo/callback ✅ مؤكد
- **C1**: `myShareIsEstimated` يُرجع من `useMySharePage` لكن لا يُستورد في `MySharePage.tsx` ✅ مؤكد
- **D1-D4**: Realtime يشمل `distributions` + `accounts` فقط ✅ مؤكد
- **B6**: `fyProgress` لا يحتوي `notStarted` ✅ مؤكد
- **TS6**: `"typescript": "^6.0.2"` ✅ مؤكد
- **Dependabot**: `open-pull-requests-limit: 3` ✅ مؤكد

---

## التغييرات المخطط لها

### 🔴 حرجة — صحة الأرقام

**1. A4 — حماية `netAfterZakat`**
- `src/hooks/page/beneficiary/useBeneficiaryFinancials.ts` سطر 20
- تغيير: `const netAfterZakat = Math.max(0, netAfterVat - zakatAmount);`

**2. B2 — حماية `remainingBalance`**
- `src/hooks/page/beneficiary/useAccountsViewPage.ts` سطر 33
- تغيير: `const remainingBalance = Math.max(0, fin.availableAmount - fin.distributionsAmount);`

### 🟠 عالية — ميزات ناقصة

**3. B1 — المصروفات الشهرية في الرسم البياني**
- `src/hooks/page/beneficiary/useFinancialReportsPage.ts` سطر 50-60
- استبدال البناء اليدوي بـ `buildMonthlyData(dashData?.monthly_income ?? [], dashData?.monthly_expenses ?? [])` (نفس النمط المستخدم في `useWaqifDashboardPage`)

**4. B3 — تحذير الطباعة عند السنة النشطة**
- `src/hooks/page/beneficiary/useMySharePdfHandlers.ts` سطر 138-147
- إضافة: `if (!params.isClosed) defaultNotify.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية');` قبل `printShareReport`

**5. D1+D2+D4 — Realtime إضافي في لوحة المستفيد**
- `src/hooks/page/beneficiary/useBeneficiaryDashboardPage.ts` في `distSubscribeFn` (سطر 64-77)
- إضافة 3 اشتراكات جديدة:
  - `advance_requests` مع فلتر `beneficiary_id` → invalidate `beneficiary-dashboard`
  - `fiscal_years` → invalidate `beneficiary-dashboard`
  - `app_settings` → invalidate `beneficiary-dashboard`

**6. C1 — badge "تقديري" في صفحة حصتي**
- `src/pages/beneficiary/MySharePage.tsx`
- استيراد `myShareIsEstimated` من hook (موجود فعلاً في return)
- إضافة Badge بجانب مبلغ الحصة عند `myShareIsEstimated && !isClosed` يعرض "تقديري"

### 🟡 متوسطة — أداء + UX

**7. B4 — `useCallback` لـ `withPdfLoading`**
- `src/hooks/page/beneficiary/useMySharePdfHandlers.ts` سطر 43
- تحويل إلى `useCallback` مع dependency على `isPdfLoading`

**8. B5 — `useMemo` لـ `summaryCards` + `useCallback` لـ `handleExportCsv`**
- `src/hooks/page/beneficiary/useAnnualReportViewPage.ts`
- لف `summaryCards` (سطر 46) بـ `useMemo` مع dependencies: `totalIncome, totalExpenses, activeContracts, properties.length`
- لف `handleExportCsv` (سطر 72) بـ `useCallback` مع dependencies: `summaryCards, items, fiscalYear?.label`

**9. B6 — إضافة `notStarted` لـ `fyProgress`**
- `src/hooks/page/beneficiary/useBeneficiaryDashboardPage.ts` سطر 40-50
- إضافة فحص: `if (Date.now() < start) return { percent: 0, daysLeft, isClosed: false, notStarted: true }`

### 📦 بنية تحتية

**10. TypeScript downgrade**
- `package.json` سطر 85
- تغيير: `"typescript": "~5.8.3"` (آخر stable)

**11. Dependabot — رفع الحد + تجميد TS6**
- `.github/dependabot.yml`
- `open-pull-requests-limit: 10` (سطر 8)
- إضافة `ignore` لـ TypeScript `>=6.0.0`

**12. إضافة `^` لـ vite و plugin-react-swc**
- `package.json` سطر 75, 87
- `"vite": "^5.4.21"` و `"@vitejs/plugin-react-swc": "^3.11.0"` للسماح بتحديثات patch/minor

---

## ترتيب التنفيذ
1. البنود 1-2 (حماية أرقام سالبة)
2. البنود 3-4 (monthlyData + تحذير الطباعة)
3. البند 5 (Realtime)
4. البند 6 (badge تقديري)
5. البنود 7-9 (أداء + UX)
6. البنود 10-12 (بنية تحتية)
7. فحص TypeScript build للتأكد من عدم وجود أخطاء




# خطة استخراج أقسام AdminDashboard.tsx إلى مكونات فرعية

## التحليل

الملف حالياً 282 سطر. المكونات المرئية مستخرجة بالفعل بشكل جيد (DashboardAlerts, DashboardStatsGrid, DashboardKpiPanel, إلخ). ما تبقى هو:

1. **منطق حساب البيانات** (سطر 64–133) — ~70 سطر من `useMemo` لحساب العقود والإيرادات والتحية
2. **بطاقة مقارنة السنوات** (سطر 222–258) — ~36 سطر JSX مع منطق شرطي مضمّن

## التغييرات المقترحة

### 1. إنشاء `useAdminDashboardData.ts` (هوك جديد)
نقل كل منطق الحساب الوسيط من `AdminDashboard` إلى هوك مخصص:
- `pendingAdvancesCount` (سطر 65–68)
- `computedAccounts` + `useComputedFinancials` (سطر 71–84)
- `relevantContracts`, `activeContractsCount`, `contractualRevenue` (سطر 88–102)
- `isYearActive`, `sharesNote`, `expiringContracts` (سطر 104–113)
- `monthlyData`, `expenseTypes` (سطر 124–133)
- `greetingText` (سطر 136–144)

هذا يحوّل المكون من ~280 سطر إلى ~160 سطر (JSX + imports فقط)، والهوك ~120 سطر.

### 2. إنشاء `YearComparisonCard.tsx` (مكون جديد)
استخراج بطاقة المقارنة بين السنوات (سطر 222–258) إلى مكون مستقل يستقبل `allFiscalYears` و `fiscalYearId`.

## الملفات المتأثرة

| العملية | الملف |
|---------|-------|
| إنشاء | `src/hooks/page/useAdminDashboardData.ts` |
| إنشاء | `src/components/dashboard/YearComparisonCard.tsx` |
| تعديل | `src/pages/dashboard/AdminDashboard.tsx` (تقليص من ~282 إلى ~140 سطر) |


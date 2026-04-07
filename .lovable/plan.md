

# خطة تنفيذ توصيات الفحص الجنائي — الحالة النهائية

## ✅ تم التنفيذ

| # | البند | الحالة |
|---|-------|--------|
| 1 | استخراج `ChartBox` كمكون مشترك | ✅ |
| 2 | حذف `html2canvas` | ✅ |
| 3 | دمج `useFinancialSummary` في `useReportsData` | ✅ |
| 4 | تطبيق `ViewportRender` على صفحة التقارير | ✅ |
| 5 | A4 — حماية `netAfterZakat` بـ `Math.max(0,...)` | ✅ |
| 6 | B2 — حماية `remainingBalance` بـ `Math.max(0,...)` | ✅ |
| 7 | B1 — إضافة المصروفات الشهرية للرسم البياني | ✅ |
| 8 | B3 — تحذير الطباعة عند السنة النشطة | ✅ |
| 9 | D1+D2+D4 — Realtime لـ advance_requests + fiscal_years + app_settings | ✅ |
| 10 | C1 — badge "تقديري" في صفحة حصتي | ✅ |
| 11 | B4 — `useCallback` لـ `withPdfLoading` | ✅ |
| 12 | B5 — `useMemo` لـ `summaryCards` + `useCallback` لـ `handleExportCsv` | ✅ |
| 13 | B6 — إضافة `notStarted` لـ `fyProgress` | ✅ |
| 14 | TypeScript downgrade من `^6.0.2` إلى `~5.8.3` | ✅ |
| 15 | Dependabot — رفع الحد + تجميد TS6 | ✅ |
| 16 | إضافة `^` لـ vite و plugin-react-swc | ✅ |

## ⏭️ لم يُنفَّذ (بالتصميم)

| # | البند | السبب |
|---|-------|-------|
| VirtualTable لجدول العقود | البنية المجمّعة غير متوافقة مع VirtualTable |

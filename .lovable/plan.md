## استئناف التنفيذ — ما تبقّى من الخطة الموثّقة في `.lovable/plan.md`

أُكمل ما تبقى ضمن نفس PR. المُنجَز سابقاً: A1، A2، A3 (Migration + Types + mapEntry).

### A4 — توحيد عرض الصافي كثلاث أعمدة (P0)
- `useHistoricalComparison.comparisonRows`: صفوف منفصلة لـ `netAfterExpenses` / `netAfterZakat` / `waqfRevenue` + 3 خطوط في `chartData`.
- `useYearComparisonState`: نفس التحديث للسنتين.
- `generateYearComparisonPDF` و `generateMultiYearComparisonPDF`: تحديث الجداول/المخططات.

### الموجة B — الأمان والتقارير والتواريخ
- **B1** `src/utils/export/xlsx.ts`: `sanitizeXlsxCell` يُسبق `= + - @ \t \r` بـ `'` + اختبار.
- **B2** `SortableBylawItem.tsx` و `BylawsViewPage.tsx`: `disallowedElements={['script','iframe','style','object','embed']}` + `unwrapDisallowed`.
- **B3** `src/lib/diagnostics/sanitizeErrorMetadata.ts`: تنظيف `url/stack/user_agent` + تطبيقه في `reportClientError`.
- **B4** `src/utils/date/dateOnly.ts`: `todayLocalISO`, `parseDateOnlyLocal`, `compareDateOnly`, `diffCalendarDays` + استبدال `toISOString().slice(0,10)` في `useOverdueSplit` و `collectionCompute:178` + اختبار.
- **B5** `src/lib/diagnostics/checks.ts`: 5 فحوص (partially_paid mismatch، distributions > available، closed بلا account، allocations=0 مع rent>0، partially_paid متأخرة).

### الموجة C — الوصول والأداء والتنظيف
- **C1** `BottomNav`: `if (!role) return null` بدل fallback `beneficiary`.
- **C2** `SortableBylawItem`: `aria-label="مقبض السحب"` لمقبض السحب.
- **C3** إضافة `aria-label` عربي لـ 7 `TabsList` الناقصة.
- **C4** اختبار يربط `QUICK_ACTIONS_BY_ROLE.accountant` بـ `ACCOUNTANT_EXCLUDED_ROUTES`.
- **C5** `CashFlowReport`: بناء `Map<month,{income,expenses}>` بمرور واحد بدل 12 filter.

### التحقق النهائي
- `bunx vitest run` (~1904 + اختبارات جديدة).
- مراجعة بصرية: 3 أعمدة صافي، XLSX يعرض `=SUM` كنص، BottomNav بدون وميض روابط، `access_log` بدون مسارات absolute.

### تفاصيل تقنية مختصرة
- لا تعديل على ملفات auth أو ملفات Supabase المحمية.
- كل نص جديد بالعربية. ألوان عبر CSS variables. `logger` بدل `console.*`.
- استخدام `??` في كل fallbacks مالية جديدة.

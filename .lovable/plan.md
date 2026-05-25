# تنفيذ الخيار A + مزامنة عناوين الصفحات

## التغييرات (4 ملفات)

### 1) `src/types/navigation.ts`
- `invoices: 'فواتير العقود'` → `'الفواتير الضريبية'`

### 2) `src/constants/routeRegistry.ts`
- `/dashboard/invoices.title: 'فواتير العقود'` → `'الفواتير الضريبية'`
- `/dashboard/reports.title` يبقى `'التقارير المالية والإفصاح'` ✓
- `/dashboard/annual-report.title` يبقى `'إدارة التقرير السنوي'` ✓
- `/dashboard/zatca.title` يبقى `'تكامل ZATCA'` ✓

### 3) `src/constants/navigation.ts`
- fallback label لـ `/dashboard/invoices`: `'فواتير العقود'` → `'الفواتير الضريبية'`

### 4) مزامنة عناوين الصفحات مع القائمة (3 صفحات)
- `src/pages/dashboard/ReportsPage.tsx`: `title="التقارير"` → `"التقارير المالية والإفصاح"`
- `src/pages/dashboard/AnnualReportPage.tsx`: `title="التقرير السنوي"` → `"إدارة التقرير السنوي"`
- `src/pages/dashboard/ZatcaManagementPage.tsx`: `title="إدارة ZATCA"` → `"تكامل ZATCA"`
- `src/pages/dashboard/InvoicesPage.tsx`: `title` يبقى `"إدارة الفواتير الضريبية"` (متطابق بدلالةً)

## خارج النطاق
- لا تغييرات routes/permissions/أيقونات.
- لا تعديل اختبارات (لا اختبار يربط بهذه النصوص).

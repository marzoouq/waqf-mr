
## موجة P8 — تنظيف 2 shim + توحيد MONTH_NAMES (مُتحقَّق جنائياً)

### نتائج الفحص الفعلي

| البند | الاستهلاك الحقيقي | ملاحظات |
|---|---|---|
| `types/export.ts` | ملفان: `dataFetcher.ts` + `useDataExport.ts` | ✅ آمن للحذف بعد الهجرة |
| `types/filters.ts` | 3 ملفات: `AdvancedFiltersBar.tsx` + `useIncomePage.ts` + `useExpensesPage.ts` | ✅ آمن للحذف بعد الهجرة |
| `MONTH_NAMES` | معرَّف في 5 ملفات بنفس المحتوى الحرفي | ✅ مرشّح لتوحيد كامل |

**اكتشاف مهم**: `MONTH_NAMES` المُعاد تصديره من `monthlyPerformanceCalc.ts` و `useYearComparisonState.ts` غير مستهلك من أي ملف خارجي (فقط داخلي) → الحذف آمن بعد استبدال الاستخدامات الداخلية.

### الخطوات

**1. هجرة `types/export.ts` shim:**
- تحديث `src/lib/services/dataFetcher.ts`: `from '@/types/export'` → `from '@/types/ui'`
- تحديث `src/hooks/page/shared/useDataExport.ts`: نفس التغيير (سطرَين)
- حذف `src/types/export.ts`

**2. هجرة `types/filters.ts` shim:**
- تحديث `src/components/filters/AdvancedFiltersBar.tsx`: `from '@/types/filters'` → `from '@/types/ui'`
- تحديث `src/hooks/page/admin/financial/useIncomePage.ts`: نفس التغيير
- تحديث `src/hooks/page/admin/financial/useExpensesPage.ts`: نفس التغيير
- حذف `src/types/filters.ts`

**3. توحيد `MONTH_NAMES`:**
- إنشاء `src/constants/calendar.ts` يصدِّر `MONTH_NAMES` (مصدر وحيد)
- تحديث 5 ملفات لاستيراد الثابت من المصدر الموحَّد:
  - `src/utils/reports/monthlyPerformanceCalc.ts` (حذف التعريف المحلي + حذف `export { MONTH_NAMES }`)
  - `src/components/contracts/accrual/accrualUtils.ts` (حذف التعريف، استيراد + إعادة تصدير للحفاظ على التوافق)
  - `src/components/reports/CashFlowReport.tsx` (استبدال التعريف باستيراد)
  - `src/components/dashboard/charts/IncomeMonthlyChart.tsx` (استبدال التعريف باستيراد)
  - `src/hooks/page/admin/reports/useYearComparisonState.ts` (حذف التعريف + الاستيراد، الحفاظ على إعادة التصدير الحالية إن لزم)

**4. التحقق النهائي:**
- `npx tsc --noEmit` → 0 أخطاء
- `npx eslint src` → 0 أخطاء
- `npm run build` → نجاح

### الضمانات
- ✅ لا لمس لـ AuthContext / ProtectedRoute / SecurityGuard / supabase files
- ✅ كل التغييرات alias-to-canonical (مرادفات حرفية مطابقة 100%)
- ✅ ملفات `@/types/database` (76 ملف) **لا تُلمس** — مؤجَّلة لـ P10
- ✅ PDF re-exports + diagnostics + ملفات > 200 سطر **لا تُلمس** — مؤجَّلة

### النتيجة المتوقعة
- −2 ملف shim (`types/export.ts`, `types/filters.ts`)
- −4 تعريفات `MONTH_NAMES` مكررة (يبقى مصدر وحيد + ملف ثوابت جديد)
- 0 انحدار سلوكي
- baseline `0 ESLint / 0 TS / build pass` محفوظ

### مؤجَّل (لا يُنفَّذ الآن)
- P9: تنقية PDF re-exports غير المستهلكة
- P10: هجرة 76 ملف من `@/types/database` → `@/types`
- P11: فحص backend الجنائي (RLS + Edge Functions)
- P12: تقسيم ملفات > 200 سطر

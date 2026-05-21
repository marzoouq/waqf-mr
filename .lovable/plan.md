## نتائج الفحص الجنائي بند ببند

### ✅ مؤكدة 100% بعد قراءة الكود


| #   | الادعاء                                 | الموقع المُتحقَّق                                                                                                                                                                                        | الحكم                                    |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | رابط ZATCA للمحاسب يقود لصفحة محظورة    | `AccountantDashboardView.tsx:54` `link="/dashboard/zatca"` + `navigation.ts:167` يضم `/dashboard/zatca` ضمن `ACCOUNTANT_EXCLUDED_ROUTES`                                                                 | **مؤكد**                                 |
| 2   | recent_contracts بلا فلترة سنة          | `useDashboardSummary.ts:99-104` لا يستخدم `.eq('fiscal_year_id', …)` بينما heatmap يستخدمه (`:86`)                                                                                                       | **مؤكد**                                 |
| 3   | تعارض query keys                        | `useDashboardSummary.ts:23` = `['dashboard-summary', id, label ?? '']` بينما `useDashboardPrefetch.ts:41` = `['dashboard-summary', fiscalYearId]` بدون label                                             | **مؤكد** — prefetch لا يملأ الكاش الفعلي |
| 4   | تصفية بطاقات بالنص العربي               | `useAdminDashboardStats.ts:21` `ADMIN_ONLY_TITLES = new Set(['حصة الناظر', …])` ثم `:106` `filter(s => !ADMIN_ONLY_TITLES.has(s.title))`                                                                 | **مؤكد**                                 |
| 5   | `settings: Record<string, string>` كاذب | `types/financial/dashboard.ts:88` `settings: Record<string, string>` بينما `useAdminDashboardData.ts:59-65` يقرأها كأرقام nullable                                                                       | **مؤكد**                                 |
| 6   | secondary لا يعيد أخطاء                 | `useDashboardSummary.ts:110-114` يعيد `isLoading` فقط بدون `isError/error`                                                                                                                               | **مؤكد**                                 |
| 9   | schema unknown                          | `lib/api/schemas/dashboardSummary.ts:14` `aggregated: z.unknown()`                                                                                                                                       | **مؤكد**                                 |
| 10  | documentationRate وهمي                  | `useAccountantDashboardData.ts:121-122` `documentationRate = expenseTypeCount > 0 ? 100 : 0` + `undocumentedExpensesCount = 0` — مع وجود util حقيقي غير مستخدم في `utils/financial/documentationRate.ts` | **مؤكد ومؤلم** — الحل جاهز ومُتجاهَل     |
| 13  | default allow في permission             | `usePermissionCheck.ts:47` `return true` لأي دور غير معروف                                                                                                                                               | **مؤكد**                                 |


### ⚠️ مؤكدة جزئياً (الادعاء صحيح لكن السياق يخفّف الخطورة)


| #   | البند                            | الواقع                                                                                                                                                                   |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7   | RequirePermission يعتمد على الأب | `RequirePermission.tsx:22` صراحةً يفترض ProtectedRoute عبر التعليق. ليس bug فعلي لكنه coupling صريح. خطورة منخفضة.                                                       |
| 8   | تكرار expenseRatio               | محسوب في `useAdminDashboardData.ts:74` وأيضاً `useAdminDashboardStats.ts:117`. كلاهما يُستخدم في مكانين مختلفين (للتنبيهات vs للـ KPI) لكن النتيجة يجب أن تتطابق دائماً. |
| 11  | تعليق "سيتم تحسينه لاحقاً"       | موجود حرفياً في `useAccountantDashboardData.ts:122`.                                                                                                                     |
| 12  | usePermissionCheck متعدد المصادر | صحيح لكن مركَّز فعلياً في `navigation.ts` (ACCOUNTANT_EXCLUDED + ADMIN_ROUTE_TO_SECTION + ADMIN_ROUTE_PERM_KEYS) — ليس مشتتاً كما يدّعي التقرير.                         |


### ❌ مبالغ فيها أو غير دقيقة


| #              | البند                                             | الواقع                                                                                                                                       |
| -------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 14             | "تكرار سياسات بين navigation/quickActions/Alerts" | `quickActions.ts` يُعرّف **اختصارات بصرية** (أيقونات/ألوان) بشكل مقصود، والتعليق في رأس الملف يوثق هذا القرار. ليس تكرار سياسة، بل فصل عرضي. |
| 15-17          | "الوثائق متفائلة"                                 | لا يمكن التحقق دون قراءة كل docs؛ خارج نطاق إصلاح الكود.                                                                                     |
| تقييم "6.7/10" | حكم ذوقي، لا يستحق نقاشاً تقنياً.                 | &nbsp;                                                                                                                                       |


### اكتشاف إضافي لم يذكره التقرير

- `useAccountantDashboardData` يقرأ `aggregated.expense_types` لتقدير documentationRate، لكن `**utils/financial/documentationRate.ts` يحوي `computeDocumentationStats` دالة حقيقية تعمل بالبيانات الموجودة فعلاً**. الحل موجود ومُكتمَل ومُختبَر (`documentationRate.test.ts`) — فقط لم يُربط.

---

## الخطة المعتمدة (مرتبة حسب الأثر الحقيقي)

### المرحلة 1 — إصلاحات حرجة (ملفان فقط، لا تمس قاعدة البيانات)

**1) إصلاح رابط ZATCA للمحاسب** — `src/components/dashboard/views/AccountantDashboardView.tsx`

- إزالة `link="/dashboard/zatca"` من بطاقة "ZATCA غير مُرسل" (يصبح card معلوماتي).
- البطاقة تبقى مفيدة (المحاسب يحتاج رؤية الرقم) لكن بلا توجيه محظور.

**2) فلترة recent_contracts بالسنة** — `src/hooks/data/financial/useDashboardSummary.ts`

- إضافة `if (!isAll) q = q.eq('fiscal_year_id', fiscalYearId);` بنفس نمط heatmap.
- الحفاظ على `isAll === 'all'` كاستثناء.

### المرحلة 2 — توحيد المصادر وإصلاح الكاش (3 ملفات)

**3) ملف query keys مركزي** — جديد `src/lib/queryKeys/dashboardKeys.ts`

```ts
export const dashboardKeys = {
  summary: (id: string, label?: string) => ['dashboard-summary', id, label ?? ''] as const,
  heatmap: (id: string) => ['dashboard-heatmap', id] as const,
  recentContracts: (id: string) => ['dashboard-recent-contracts', id] as const,
};
```

- استبدال المفاتيح الحرفية في:
  - `useDashboardSummary.ts` (queryKey + queryKey heatmap + queryKey recent)
  - `useDashboardPrefetch.ts` — يجب تمرير `fy?.label` للمطابقة الكاملة
  - `useAdminDashboardPage.ts` — في `extraKeys` لـ realtime

**4) إعادة أخطاء secondary** — `useDashboardSummary.ts`

- إضافة `isError`, `heatmapError`, `recentContractsError` إلى return value.
- بدون تغيير شكل البيانات الموجود.

### المرحلة 3 — صلابة أنواع وصلاحيات (4 ملفات)

**5) `settings` نوع حقيقي** — `src/types/financial/dashboard.ts`

- إضافة `AggregatedSettings` interface مع `admin_share_percentage?: number | null` … الخ.
- تحديث `AggregatedData.settings: AggregatedSettings`.
- لا تغيير في `useAdminDashboardData` (يقرأها أصلاً بهذا الشكل، فقط النوع كان كاذباً).

**6) تصفية بطاقات بـ metadata بدل النص** — `src/types/dashboard.ts` + `useAdminDashboardStats.ts`

- إضافة `visibility?: 'all' | 'admin-only'` إلى `StatItem`.
- وسم البطاقات الثلاث (`حصة الناظر`, `حصة الواقف`, `ريع الوقف`) عند بنائها بـ `visibility: 'admin-only'`.
- الفلترة: `if (role === 'accountant') return allStats.filter(s => s.visibility !== 'admin-only');`
- حذف `ADMIN_ONLY_TITLES` Set.

**7) default deny في permission check** — `usePermissionCheck.ts:47`

- استبدال `return true` بـ `return false` للأدوار غير المعروفة.
- التحقق أن `admin/accountant/beneficiary/waqif` كلها تُعالَج صراحة قبل الوصول للسطر — وهي كذلك.

### المرحلة 4 — schema حقيقي + إزالة metrics وهمية (3 ملفات)

**8) schema Zod حقيقي** — `src/lib/api/schemas/dashboardSummary.ts`

- بناء `aggregatedTotalsSchema`, `aggregatedCollectionSchema`, `aggregatedOccupancySchema`, `aggregatedCountsSchema`, `aggregatedSettingsSchema`, `aggregatedYoYSchema`, `aggregatedFiscalYearSchema`.
- جعل الحقول الاختيارية `.optional()` للسماح بتطور RPC تدريجياً دون كسر.
- تحديث `schemas.test.ts` للحالات الجديدة.

**9) ربط documentationRate الحقيقي** — `useAccountantDashboardData.ts`

- إضافة `expenses` و `invoices` كمدخلات (تُمرَّر من `useAdminDashboardPage` بعد جلبها — أو نُبقي placeholder لكن نضعه `null` ونعرض "غير متاح" بدلاً من رقم وهمي).
- **الخيار الأبسط والمحدود**: إرجاع `documentationRate: null` و إخفاء البطاقة في `AccountantDashboardView` عند `null`. هذا يُزيل الكذب دون توسيع scope الجلب. (الخيار الموسّع — جلب expenses الفعلية — يُؤجَّل لتفادي توسيع المعمارية.)

### ما **لن** أمسّه

- ❌ `ProtectedRoute.tsx`, `AuthContext.tsx`, `SecurityGuard.tsx`
- ❌ Edge Function `dashboard-summary/index.ts` (لا حاجة)
- ❌ قاعدة البيانات / RLS / RPC
- ❌ `quickActions.ts` (الفصل مقصود وموثّق)
- ❌ تكرار `expenseRatio` (دالة 1-سطرية، استخراجها مبالغة)
- ❌ `RequirePermission` (التغيير إلى spinner قد يكسر تدفقات أخرى تعتمد على هذا السلوك)
- ❌ ملفات navigation/quickActions الأخرى

### التحقق

1. تشغيل اختبارات: `useDashboardSummary*`, `usePermissionCheck*`, `dashboardSummary.schema`, `useAdminDashboardStats*`, `documentationRate.test`, `permissionsParity`, `permissionsResilience`.
2. فتح `/dashboard` كناظر: التأكد من ظهور كل البطاقات الـ 13.
3. فتح `/dashboard` كمحاسب: التأكد من إخفاء البطاقات الثلاث، وأن بطاقة ZATCA لا تنقر للتوجيه.
4. اختيار سنة مالية محددة: التأكد من فلترة recent_contracts.
5. التبديل بين السنوات بسرعة: مراقبة devtools للتأكد من إصابة prefetch للكاش (مفتاح موحد).

### قائمة الملفات النهائية المُعدَّلة

```
src/components/dashboard/views/AccountantDashboardView.tsx     (إزالة link)
src/hooks/data/financial/useDashboardSummary.ts                (فلترة + أخطاء + queryKeys)
src/hooks/data/dashboard/useDashboardPrefetch.ts               (queryKeys + label)
src/hooks/page/admin/dashboard/useAdminDashboardPage.ts        (queryKeys في extraKeys)
src/lib/queryKeys/dashboardKeys.ts                             (جديد)
src/types/financial/dashboard.ts                               (AggregatedSettings)
src/types/dashboard.ts                                         (StatItem.visibility)
src/hooks/page/admin/dashboard/useAdminDashboardStats.ts       (metadata بدل ADMIN_ONLY_TITLES)
src/hooks/application/usePermissionCheck.ts                    (default deny)
src/lib/api/schemas/dashboardSummary.ts                        (schema حقيقي)
src/lib/api/schemas/schemas.test.ts                            (تحديث الاختبار)
src/hooks/page/admin/dashboard/useAccountantDashboardData.ts   (documentationRate: null)
src/components/dashboard/views/AccountantDashboardView.tsx     (إخفاء بطاقة عند null)
```

13 ملف، صفر تغييرات قاعدة بيانات، صفر تغييرات Edge Functions، صفر تغييرات على ملفات المصادقة المحمية.  
تحذير عدم الامساس بالمكونات الاخرى 
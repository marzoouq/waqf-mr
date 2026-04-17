

# خطة معالجة المشاكل المعمارية #11-#25

## الفحص قبل التخطيط
- `maybeSingle.ts` غير موجود لكن `maybeSingle.test.ts` موجود (#18) — اختبار يتيم
- `src/hooks/page/admin/` لا يحتوي `index.ts` (#19)
- `STALE_STATIC === STALE_SETTINGS` (#12)
- `pickLabels` يستخدم `?? key` (#15 صحيح في pickLabels لكن `ROLE_SECTION_DEFS` يستخدم `?? ''`)

## الإصلاحات (15 ملاحظة)

### مجموعة A — تنقية constants (#11, #12, #14, #15, #16, #17, #25)
1. **#12** دمج `STALE_SETTINGS` ليُشير لـ `STALE_STATIC` (`export const STALE_SETTINGS = STALE_STATIC`)
2. **#15** تغيير `?? ''` إلى `?? key` في `ROLE_SECTION_DEFS` لكشف المفاتيح المفقودة
3. **#16/#17** استبدال `defaultAdminSections`/`defaultBeneficiarySections` المُكرَّرة في `navigation.ts` بـ `makeDefaults(ADMIN_SECTION_KEYS)` من `sections.ts` — مصدر واحد للحقيقة
4. **#14** إضافة `chart_of_accounts` إلى `ROLE_SECTION_DEFS` (مفقود رغم وجوده في كل المصادر الأخرى)
5. **#13** إضافة المسارات المفقودة (`zatca`, `support`, `annual-report`, `comparison`, `diagnostics`) إلى `MenuLabels` و `linkLabelKeys` — مع توسعة `MenuLabels` interface
6. **#11** نقل الأيقونات من `navigation.ts` إلى مجموعة منفصلة لتمكين tree-shaking أفضل — **سأتركها كما هي**: أيقونات Lucide تُستخدم في القائمة الجانبية للجميع (admin/beneficiary/waqif) بدون استثناء، ولا توجد استيرادات ذرية لباقي الثوابت بدون الأيقونات. التحسين سيكون نظري فقط بدون فائدة قابلة للقياس.
7. **#25** `BENEFICIARY_ROUTE_PERM_KEYS` يعيّن `share` لمسارين — **لن أغيّره**: هذا قرار منتجي مقصود (carryforward جزء من حصة المستفيد). توثيق فقط بتعليق.

### مجموعة B — تنظيف ملفات (#18, #19, #21, #22)
8. **#18** حذف `src/lib/maybeSingle.test.ts` (يتيم، لا يوجد source)
9. **#19** إنشاء `src/hooks/page/admin/index.ts` barrel للاتساق مع `beneficiary/index.ts`
10. **#21, #22** **توثيق فقط** — `bottomNavLinks.ts` و `quickActions.ts` انفصالها مقصود (مكونات UI مختلفة). إضافة تعليق في كل منهما يشير لـ `navigation.ts` كمصدر للحقيقة.

### مجموعة C — FiscalYearContext (#24)
11. **#24** نقل منطق Prefetch من `FiscalYearContext` إلى hook منفصل `useDashboardPrefetch`
    - **حساس** — سأحافظ على نفس السلوك بالضبط
    - الـ hook الجديد يُستهلك في `FiscalYearProvider` (مكان واحد) لإبقاء التأثير محصوراً
    - فائدة: مسؤولية واحدة + قابلية اختبار + يمكن تعطيله مستقبلاً بسهولة

### مجموعة D — تخطي (#20, #23)
- **#20** `lib/theme/` و `components/theme/` — تقسيم سليم (logic vs UI)، لا تغيير
- **#23** سبق إصلاحه في الجولة السابقة ✅

## الملفات المتأثرة

| ملف | إجراء |
|-----|------|
| `src/lib/queryStaleTime.ts` | #12 دمج STALE_SETTINGS |
| `src/constants/sections.ts` | #15 `?? key`، #14 إضافة chart_of_accounts |
| `src/constants/navigation.ts` | #16/#17 استبدال defaults، #13 توسعة linkLabelKeys، #25 تعليق توثيقي |
| `src/types/navigation.ts` | #13 توسعة MenuLabels |
| `src/lib/maybeSingle.test.ts` | #18 حذف |
| `src/hooks/page/admin/index.ts` | #19 إنشاء barrel |
| `src/constants/bottomNavLinks.ts` | #21 تعليق توثيقي |
| `src/constants/quickActions.ts` | #22 تعليق توثيقي |
| `src/hooks/data/dashboard/useDashboardPrefetch.ts` | #24 إنشاء hook جديد |
| `src/contexts/FiscalYearContext.tsx` | #24 استبدال useEffect بـ hook |

## الضمانات
- صفر تغيير سلوكي — كل الإصلاحات إعادة تنظيم
- `defaultAdminSections` ستبقى exported بنفس الاسم (للتوافقية) لكن مشتقة من `makeDefaults`
- منطق Prefetch ينتقل حرفياً بدون تعديل (نفس queryKey, queryFn, staleTime, شروط التشغيل)
- TypeScript check بعد كل خطوة



## الهدف
تطبيق `filterLinksBySectionVisibility` على `BOTTOM_NAV_LINKS` في `BottomNav` بحيث يختفي أي رابط في الشريط السفلي إذا تم تعطيل قسمه من إعدادات الرؤية — بنفس منطق `Sidebar`.

## الفحص المطلوب قبل التنفيذ
- مراجعة `useNavLinks.ts` لمعرفة كيف يحصل على `sectionsVisibility` و`routeToSection` map.
- فحص `constants/sections.ts` و`navigation.ts` للتأكد من توفر خريطة `route → sectionKey` قابلة لإعادة الاستخدام.
- التأكد أن الأقسام الأربعة الظاهرة في BottomNav (الرئيسية/العقارات/العقود/الحسابات...) لها مفاتيح أقسام معرّفة.

## التغييرات المقترحة

### 1) استخراج/إعادة استخدام خريطة `routeToSection`
- إذا كانت معرّفة داخل `useNavLinks`، أنقلها إلى `src/constants/navigation.ts` (أو ملف مساعد `routeMaps.ts`) كـ `export const ROUTE_TO_SECTION` لتُشارَك بين Sidebar و BottomNav.
- لا تغيير في السلوك — فقط نقل + export.

### 2) `BottomNav.tsx`
- استيراد `useSectionsVisibility` (أو الـ hook الحالي الذي يقرأ `app_settings.sectionsVisibility` / `beneficiarySections`).
- استيراد `filterLinksBySectionVisibility` و `ROUTE_TO_SECTION`.
- اختيار خريطة الرؤية المناسبة حسب الدور:
  - admin/accountant → `sectionsVisibility`
  - beneficiary/waqif → `beneficiarySections`
- تطبيق:
  ```ts
  const visibleLinks = useMemo(
    () => filterLinksBySectionVisibility(navLinks, ROUTE_TO_SECTION, visibilityMap),
    [navLinks, visibilityMap]
  );
  ```
- استخدام `visibleLinks.map(...)` بدل `navLinks.map(...)`.

### 3) معالجة حالة الحافة
- إذا فُلتِرت كل الروابط (نظرياً مستحيل لأن `/dashboard` و`/beneficiary` دائماً مرئيان)، يبقى زر "المزيد" فقط — مقبول.
- لا تغيير في التصميم/التخطيط.

### 4) اختبارات
- إضافة اختبار في `BottomNav.test.tsx` (إن وُجد) أو إنشاؤه:
  - عند `sectionsVisibility.properties = false`، لا يظهر رابط `/dashboard/properties`.
  - عند تفعيل كل الأقسام، تظهر الروابط الأربعة + المزيد.

## الملفات المتأثرة
- **معدّل:** `src/components/layout/BottomNav.tsx`
- **معدّل (نقل export فقط):** `src/hooks/page/shared/useNavLinks.ts` + `src/constants/navigation.ts` (أو ملف جديد `src/constants/routeMaps.ts`)
- **معدّل/مُنشأ:** `src/components/layout/BottomNav.test.tsx`

## الضمانات
- صفر تغيير في API الخارجي للمكونات.
- صفر تغيير في DB/RLS/Auth.
- المنطق نقي وقابل للاختبار (يعيد استخدام الدالة المختبَرة في الموجة 3).
- توافق كامل: إن لم يكن هناك مفتاح قسم لرابط ما، يبقى ظاهراً (افتراض آمن من `filterLinksBySectionVisibility`).

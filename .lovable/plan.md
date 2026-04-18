
## الهدف
إنشاء hook مشترك `useSectionsVisibility` يُغلِّف منطق قراءة `sections_visibility` و `beneficiary_sections` من `app_settings` ودمجهما مع القيم الافتراضية، لإزالة التكرار من 3 ملفات.

## المنطق المُكرَّر حالياً
نفس الكتلة (4 أسطر) موجودة حرفياً في:
- `src/components/layout/BottomNav.tsx` (سطر 38-45)
- `src/hooks/page/shared/useNavLinks.ts` (سطر 22-29)
- `src/hooks/page/shared/usePermissionCheck.ts` (سطر 22-23)

```ts
{ ...defaultAdminSections, ...getJsonSetting('sections_visibility', {}) }
{ ...defaultBeneficiarySections, ...getJsonSetting('beneficiary_sections', {}) }
```

## التغييرات المقترحة

### 1) إنشاء `src/hooks/data/settings/useSectionsVisibility.ts`
hook نقي يُرجع الكائنين بشكل ثابت (`useMemo`) لتجنّب re-renders:

```ts
export function useSectionsVisibility() {
  const { getJsonSetting } = useAppSettings();
  
  const adminSections = useMemo(
    () => ({ ...defaultAdminSections, ...getJsonSetting<Record<string, boolean>>('sections_visibility', {}) }),
    [getJsonSetting]
  );
  
  const beneficiarySections = useMemo(
    () => ({ ...defaultBeneficiarySections, ...getJsonSetting<Record<string, boolean>>('beneficiary_sections', {}) }),
    [getJsonSetting]
  );
  
  return { adminSections, beneficiarySections };
}
```

**ملاحظة مهمة:** `usePermissionCheck` حالياً لا يستخدم `useMemo` (يحسب في كل render). الـ hook الجديد سيُحسِّن هذا تلقائياً — تحسين جانبي مقبول.

### 2) تحديث المستهلكين الثلاثة
- **`BottomNav.tsx`:** حذف `useMemo` المحلي، استبدال بـ `const { adminSections, beneficiarySections } = useSectionsVisibility();` ثم `const visibility = isAdminLike ? adminSections : beneficiarySections;`
- **`useNavLinks.ts`:** نفس الاستبدال، الاحتفاظ بنفس أسماء المتغيرات داخلياً (`sectionsVisibility = adminSections`).
- **`usePermissionCheck.ts`:** نفس الاستبدال (مع المكسب الجانبي للـ memoization).

### 3) اختبار وحدة `useSectionsVisibility.test.ts`
- يُرجع defaults عند عدم وجود إعدادات.
- يدمج إعدادات المستخدم فوق defaults بشكل صحيح.
- مرجع ثابت بين renders عند ثبات الإدخال (memoization check).

### 4) التحقق
- تشغيل `npx tsc --noEmit`.
- تشغيل اختبارات `BottomNav` + `useNavLinks` (إن وُجدت) + الجديد.
- لا تغيير في API الخارجي لأي من الـ hooks الثلاثة.

## الملفات المتأثرة
| الملف | الإجراء |
|---|---|
| `src/hooks/data/settings/useSectionsVisibility.ts` | جديد |
| `src/hooks/data/settings/useSectionsVisibility.test.ts` | جديد |
| `src/components/layout/BottomNav.tsx` | معدّل |
| `src/hooks/page/shared/useNavLinks.ts` | معدّل |
| `src/hooks/page/shared/usePermissionCheck.ts` | معدّل |

## الضمانات
- صفر تغيير في DB/RLS/Auth/Edge Functions.
- صفر تغيير في APIs العامة للـ hooks الثلاثة (`isRouteAllowed`, `links`, render output).
- صفر تغيير بصري.
- `BottomNav.test.tsx` الموجود يجب أن يستمر بالنجاح دون تعديل (mock لـ `getJsonSetting` يعمل عبر الطبقة الجديدة).
- مكسب جانبي: memoization صحيح في `usePermissionCheck`.

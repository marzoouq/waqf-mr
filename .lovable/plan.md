
## إكمال الخطة — المهام المتبقية (7 و 8)

### المهمة 7 — Hooks إعدادات متخصصة

**جديد في `src/hooks/data/settings/`:**

1. **`useBannerSettings.ts`** + test
   - يقرأ مفاتيح `banner_*` من `app_settings` (banner_enabled, banner_text, banner_variant, banner_link...)
   - يُرجِع كائناً موحَّداً `{ enabled, text, variant, link, ... }` مع defaults
   - `useMemo` لمرجع ثابت

2. **`useAppearanceSettings.ts`** + test
   - يقرأ مفاتيح المظهر (theme_*, appearance_*, primary_color, ...)
   - يُرجِع `{ theme, primaryColor, ... }` مع defaults
   - `useMemo` لمرجع ثابت

3. **`useBeneficiaryWidgets.ts`** + test
   - يدمج `getJsonSetting('beneficiary_widgets', {})` مع defaults من `BENEFICIARY_WIDGET_KEYS`
   - يُرجِع `{ widgets: Record<key, boolean>, isVisible(key) }`
   - `useMemo` لمرجع ثابت

**خطوات التنفيذ:**
- `code--search_files` لتحديد المستهلكين الفعليين لكل مجموعة مفاتيح:
  - `banner_` → BannerEditor / Layout banner
  - `theme_` / `appearance_` → AppearanceTab / ThemeProvider
  - `beneficiary_widgets` → BeneficiaryDashboard + PermissionsControlPanel
- استبدال القراءات المتفرقة بالـ hooks الجديدة (تحديث ~6-10 ملفات)
- export من `src/hooks/data/settings/index.ts`

**الإضافة لـ `index.ts`:**
```ts
export { useBannerSettings } from './useBannerSettings';
export { useAppearanceSettings } from './useAppearanceSettings';
export { useBeneficiaryWidgets } from './useBeneficiaryWidgets';
```

---

### المهمة 8 — مراجعة 8 `eslint-disable`

**خطوات:**
1. `code--search_files` للنمط `eslint-disable` عبر `src/**`
2. لكل موقع، تقييم:
   - **مشروع** (في test/mock/generated) → ترك مع تعليق `// reason: ...`
   - **يُصلَح** (متاح بدون تعطيل) → إزالة + إصلاح الكود
   - **يُوثَّق** (ضروري لكن غير واضح) → إضافة `// eslint-disable-next-line <rule> -- <reason>`

3. تطبيق الإصلاحات/التعليقات
4. `npx tsc --noEmit` نهائي

---

### الضمانات
- صفر تغيير في DB/RLS/Auth/Edge Functions
- صفر تغيير في APIs الخارجية للمكونات
- صفر تغيير بصري (المهمة 7 = إعادة قراءة نفس المفاتيح؛ المهمة 8 = جودة كود فقط)
- بعد كل مهمة: `npx tsc --noEmit` + الاختبارات الجديدة
- لا تُعدَّل ملفات المصادقة أو `components/ui/sidebar.tsx`

### النطاق المتوقع
- **جديد:** 6 ملفات (3 hooks + 3 tests)
- **معدَّل:** 8-12 ملف (مستهلكو الإعدادات + مواقع eslint-disable + index.ts)

### التسليم
بعد المهمة 7: تقرير مع قائمة الملفات + نتيجة `tsc`.
بعد المهمة 8: تقرير ختامي شامل لكل الموجة (المهام 1→8) + قائمة بكل المواقع المُصلَحة/الموثَّقة.

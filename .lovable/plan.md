# تنفيذ خيار A — تنظيف ESLint + إزالة dependency غير مستخدمة

## السياق
بعد تدقيق المعمارية، الحالة 9.7/10 — لا مشاكل بنيوية. هذه الخطة تنفّذ الخيار A المعتمد:
- بند 1 (P1): إصلاح خطأ react-hooks في `useLandingStatsSettings`
- بند 2 (P2): تنظيف re-exports زائدة في `MenuCustomizationTab`
- بند 3 (P2): كتم تحذير React Compiler في `VirtualTable`
- بند 4 (P4): إزالة `tailwindcss-animate` (✅ مُنفَّذ بالفعل عبر `bun remove`)

## نتائج الاستكشاف الجديدة

**بند 2 يحتاج تعديلاً جوهرياً عن الخطة الأصلية**: `MenuLabels` و`defaultMenuLabels` **موجودان أصلاً في `@/types/navigation`** (السطر 14 من الملف). السطران 16-17 مجرد re-exports احتفظت بها قديماً، وفحص المستهلكين أكّد أن **لا أحد يستوردهما من `MenuCustomizationTab`** — يكفي حذف الـre-exports فقط (لا حاجة لإنشاء `constants/menuLabels.ts`).

**بند 4 آمن**: `tailwind.config.ts` لديه `plugins: []` — لم يكن يستخدم `tailwindcss-animate`. الإزالة لا تكسر شيئاً.

## التغييرات المطلوبة

### 1. `src/hooks/page/admin/settings/useLandingStatsSettings.ts` (إعادة كتابة)
استبدال نمط `useState + useEffect([data]) → setForms` بنمط **uncontrolled-with-overrides**:
- `forms` المعروضة = `useMemo(merge(remote_data, local_overrides))`
- `overrides` = `useState<Partial>` يحتفظ بتعديلات المستخدم فقط
- `handleSave` يمسح `overrides` بعد النجاح فتصبح القيم الجديدة هي remote
- يحذف الخطأ ويقلّل re-renders + يصلح bug خفي: قبل التعديل كان `useEffect` يعيد كتابة `forms` عند كل refetch ويفقد تعديلات المستخدم

### 2. `src/components/settings/system/MenuCustomizationTab.tsx` (تعديل صغير)
حذف السطرين 16-17:
```ts
export type { MenuLabels };
export { defaultMenuLabels };
```
لأن المصدر الصحيح هو `@/types/navigation` ولا مستهلك يعتمد على الـre-exports.

### 3. `src/components/common/VirtualTable.tsx:91` (تعليق + disable)
إضافة تعليق توضيحي + `// eslint-disable-next-line react-hooks/incompatible-library` فوق `useVirtualizer`.

### 4. `tailwindcss-animate` (✅ مُنفَّذ)
أُزيلت من `package.json` عبر `bun remove`.

## التحقق بعد التنفيذ
- `npx tsc --noEmit` (يجب أن يكون نظيفاً)
- `npx eslint src --ext .ts,.tsx` (يجب أن يختفي خطأ P1 ويبقى تحذير `MenuCustomizationTab` و`VirtualTable` فقط — وهذان سيُصلَحان أيضاً)

## ما لن أمسّه
- لا تغييرات على API السطحي لأي hook (التواقيع محفوظة).
- لا تغييرات على المستهلكين (صفر ملف خارج الثلاثة أعلاه).
- لا تغييرات على ملفات الكود المحمية.

## الأثر
- يحذف خطأ ESLint الوحيد + تحذيرين.
- يقلّل re-renders في صفحة إعدادات الهبوط.
- يصلح bug خفي (فقدان تعديلات المستخدم عند refetch خلفي).
- يقلّل bundle بإزالة dependency غير مستخدمة.
- صفر مخاطرة سلوكية.
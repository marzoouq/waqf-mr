

# خطة استعادة الاستقرار وإصلاح البناء

## التشخيص المؤكد

بعد فحص الملفات الفعلية، تأكدت المشكلات التالية:

1. **تعارض Tailwind v3/v4 حاد**: `package.json` يثبّت `tailwindcss@^4.2.2` و `@tailwindcss/postcss@^4.2.2`، بينما `tailwind.config.ts` مكتوب بصيغة v3 (بدون `export default` مع `defineConfig`). ملف `src/index.css` يستخدم صياغة v4 حصرياً (`@import "tailwindcss"`, `@plugin`, `@theme`). هذا التعارض يجعل البناء هشاً.
2. **PWA يُعيد تحميل الصفحة في المعاينة**: `pwaBootstrap.ts` يستدعي `window.location.reload()` عند تغيّر build ID — وهو ما يحدث مع كل HMR في المعاينة.
3. **`tailwindcss-animate` مُسجّل عبر `@plugin` في CSS لكنه غير مُدرج في `plugins[]` بـ `tailwind.config.ts`** — وهذا متوقع في v4 لكنه يتعارض مع وجود config بصيغة v3.

## خطة التنفيذ

### المرحلة 1: توحيد Tailwind على v4 (الوضع الفعلي الحالي)

**القرار**: الملف `src/index.css` (593 سطر) مكتوب بالكامل بصياغة v4 — تحويله إلى v3 مُكلف ومحفوف بالمخاطر. الأسلم هو **إتمام الانتقال إلى v4** بدلاً من التراجع.

- **`postcss.config.js`**: لا تغيير — `@tailwindcss/postcss` صحيح لـ v4 ✓
- **`package.json`**: إزالة `tailwindcss-animate` من dependencies (يُحمّل عبر `@plugin` في CSS)، التأكد من بقاء `tailwindcss@^4.2.2` و `@tailwindcss/postcss@^4.2.2`
- **`tailwind.config.ts`**: يبقى كما هو — v4 يقرأه تلقائياً عبر `@config` أو الاكتشاف التلقائي، والإعدادات فيه (colors, fonts, keyframes) مُكمّلة لـ `@theme` في CSS
- **تحديث الذاكرة**: تحديث memory constraint من "v3 فقط" إلى "v4 مع config compat"

### المرحلة 2: تحصين الإقلاع

- **`src/lib/pwaBootstrap.ts`**: منع `reload()` في بيئة المعاينة — بدلاً من إعادة التحميل، فقط مسح الكاش بدون reload. إضافة حارس iframe
- **`src/main.tsx`**: لف `runPwaCacheGuard()` في `try/catch` مع timeout 3 ثوانٍ. إضافة `removeSplash()` في `finally` لضمان إزالة splash حتى عند الفشل
- **`index.html`**: إضافة سكربت طوارئ (8 ثوانٍ) يُظهر زر "إعادة تحميل" إذا بقي splash ظاهراً

### المرحلة 3: كسر الاعتماديات الدائرية

- **`src/routes/RouteErrorBoundary.tsx`**: استيراد `ErrorBoundary` مباشرة من `@/components/common/ErrorBoundary` بدل barrel
- **`src/components/settings/MenuCustomizationTab.tsx`**: استيراد `defaultMenuLabels` من `@/components/layout/menuLabels` مباشرة (موجود أصلاً لكنه يسحب أيضاً من barrel)
- **`src/components/layout/DesktopTopBar.tsx`**: التحقق من استيراداته وإصلاح أي barrel import دائري

### المرحلة 4: تحسين UX التسجيل

- توضيح حالة التسجيل العام في صفحة `/auth`: عند تعطيل التسجيل يظهر رسالة واضحة بدل إخفاء التبويب صامتاً

### المرحلة 5: تعديل PWA في Vite

- **`vite.config.ts`**: إضافة `devOptions: { enabled: false }` لمنع تسجيل SW في التطوير

---

## الملفات المُعدّلة

| الملف | التعديل |
|-------|---------|
| `package.json` | إزالة `tailwindcss-animate` المكرر |
| `src/lib/pwaBootstrap.ts` | منع reload في preview، إضافة حارس iframe |
| `src/main.tsx` | try/catch + removeSplash() + timeout لـ PWA |
| `index.html` | سكربت طوارئ 8 ثوانٍ |
| `vite.config.ts` | `devOptions: { enabled: false }` |
| `src/routes/RouteErrorBoundary.tsx` | استيراد مباشر |
| `src/components/settings/MenuCustomizationTab.tsx` | إزالة barrel import مكرر |

## الملفات المحمية (لن تُلمس)

`AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`, `client.ts`, `types.ts`, `.env`, `config.toml`

## التحقق بعد التنفيذ

1. البناء يمر بدون أخطاء
2. المعاينة تفتح بدون تعليق على splash
3. صفحة `/auth` تظهر فوراً
4. لا reload loops في المعاينة
5. حالة التسجيل واضحة للمستخدم


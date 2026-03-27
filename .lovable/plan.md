

## خطة: تشديد قاعدة `no-console` في ESLint

### الوضع الحالي
- السطر 26: `"no-console": ["warn", { allow: ["warn", "error"] }]` — يسمح بـ `console.warn` و `console.error` ويحذّر فقط على الباقي
- الاختبارات (سطر 34): `"no-console": "off"` — معفاة ✅
- `src/lib/logger.ts`: يستخدم `console.*` داخلياً (مبرّر) — يحتاج إعفاء

### التغييرات

**ملف واحد: `eslint.config.js`**

1. **تشديد القاعدة العامة** (سطر 26):
   ```js
   "no-console": "error",
   ```
   تحويل من `warn` مع استثناءات إلى `error` بدون استثناءات — أي استخدام لـ `console.*` في كود الإنتاج سيكون خطأ بناء.

2. **إعفاء `src/lib/logger.ts`** — إضافة كتلة override جديدة:
   ```js
   {
     files: ["src/lib/logger.ts"],
     rules: {
       "no-console": "off",
     },
   },
   ```

3. **الاختبارات** معفاة بالفعل (`"no-console": "off"`) — لا تغيير.

4. **إعفاء `src/test/setup.ts`** — مشمول بنمط `src/test/**/*.ts` الموجود ✅

### النتيجة
- أي `console.log/warn/error/info` في كود الإنتاج → خطأ ESLint
- المطلوب استخدام `logger` من `@/lib/logger` بدلاً منه
- `logger.ts` نفسه والاختبارات معفاة




# إصلاح تعارض حزم Tailwind CSS

## المشكلة

ملف `package.json` يحتوي على `tailwindcss@^4.2.2` و `@tailwindcss/postcss@^4.2.2` (حزم الإصدار v4)، بينما ملف `tailwind.config.ts` مكتوب بصيغة الإصدار v3. هذا التعارض يكسر التطبيق.

إضافة لذلك، `postcss.config.js` يستخدم `@tailwindcss/postcss` (خاص بـ v4) ويشير إلى `tailwind.config.js` (بدلاً من `.ts`).

## الحل — ملفان فقط

### 1. `package.json` — تثبيت Tailwind v3
```
"tailwindcss": "3.4.17"        ← بدلاً من "^4.2.2"
```
وحذف `"@tailwindcss/postcss"` من devDependencies (خاص بـ v4).

### 2. `postcss.config.js` — استخدام إضافة v3
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```
هذا يكتشف `tailwind.config.ts` تلقائياً دون تحديد مسار.

## لماذا حدثت المشكلة
النسخة المسترجعة تحتوي على حزم v4 المتعارضة مع إعدادات v3 الموجودة في `tailwind.config.ts`.




# التحقق من حجم Precache الفعلي

## الحالة الحالية

إعدادات `vite.config.ts` صحيحة تماماً:

- **`globIgnores`** (سطر 48-59): يستبعد 9 حزم ثقيلة من precache:
  `vendor-pdf`, `vendor-pdf-table`, `vendor-recharts`, `vendor-d3`, `vendor-markdown`, `vendor-dnd`, `vendor-webauthn`, `vendor-qr`, `vendor-arabic`

- **`runtimeCaching`** (سطر 60-68): يلتقط هذه الحزم عند الطلب عبر `StaleWhileRevalidate` مع cache لمدة 30 يوم

## خطة التحقق

### الخطوة الوحيدة: بناء إنتاجي + فحص `sw.js`

1. تنفيذ `npx vite build` لتوليد ملفات الإنتاج
2. فحص ملف `dist/sw.js` والبحث عن أي ذكر لـ `vendor-pdf` أو `vendor-recharts` أو أي حزمة مستبعدة في قائمة precache
3. حساب الحجم الإجمالي لملفات precache (عدد الملفات + الحجم الكلي)
4. مقارنة النتيجة بالتقدير السابق (~4MB) للتأكد من التقليص

### النتيجة المتوقعة

- قائمة precache في `sw.js` يجب ألا تحتوي على أي ملف يبدأ بـ `vendor-pdf` أو `vendor-recharts` أو أي من الحزم التسع المستبعدة
- الحجم المتوقع بعد الاستبعاد: ~3MB بدلاً من ~4MB (توفير ~900KB)

### التفاصيل التقنية

```text
الأمر:
  npx vite build && grep -oP '"url":"[^"]*vendor-[^"]*"' dist/sw.js

إذا أعاد نتائج → الاستبعاد لم يعمل
إذا أعاد فارغاً → الاستبعاد يعمل بشكل صحيح
```


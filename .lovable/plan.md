

# خطة إصلاح فشل النشر — تعارض `next-themes` مع React 19

## المشكلة
`next-themes@0.3.0` لا يدعم React 19، مما يُفشل `npm ci` في GitHub Actions.

## الحل
تطبيق **الخيارين 1 و 2 معاً** لضمان الإصلاح الفوري والمستقبلي:

### 1. ترقية `next-themes` إلى `0.4.x`
- تحديث `package.json`: تغيير `"next-themes": "^0.3.0"` إلى `"next-themes": "^0.4.6"`
- الإصدار 0.4.x يدعم React 19 رسمياً

### 2. إضافة `--legacy-peer-deps` في workflow كشبكة أمان
- تحديث `.github/workflows/test.yml`: تغيير `npm ci` إلى `npm ci --legacy-peer-deps`
- هذا يحمي من أي تعارضات peer dependency مستقبلية مع حزم أخرى لم تُحدَّث بعد

### التفاصيل التقنية
- الملفات المتأثرة: `package.json`، `.github/workflows/test.yml`
- لا يوجد تغيير في API — `next-themes@0.4.x` متوافق تماماً مع الاستخدام الحالي (`useTheme`, `ThemeProvider`)
- لن يتأثر أي كود في المشروع


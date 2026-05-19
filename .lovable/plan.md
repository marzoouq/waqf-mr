## الخطة

### 1. إصلاح `package.json`
استبدال قيم `overrides` و `resolutions` للتبعيات المباشرة بصيغة الإشارة الذاتية `$name` لحل خطأ `EOVERRIDE`:

```json
"overrides": {
  "dompurify": "$dompurify",
  "postcss": "$postcss",
  "fast-uri": "$fast-uri",
  "ws": "$ws",
  "@babel/plugin-transform-modules-systemjs": "7.29.4"
},
"resolutions": {
  "dompurify": "$dompurify",
  "postcss": "$postcss",
  "fast-uri": "$fast-uri",
  "ws": "$ws",
  "@babel/plugin-transform-modules-systemjs": "7.29.4"
}
```

هذا يجبر كل النسخ الانتقالية على نفس النسخة المثبتة في `dependencies`، ويُرضي قيود npm v11.

### 2. إعادة بناء lockfile
- حذف `package-lock.json` الحالي (إن وُجد)
- تشغيل `npm install --legacy-peer-deps --package-lock-only --ignore-scripts`

### 3. تشغيل `npm audit`
- `npm audit --omit=dev` للتنبيهات الإنتاجية
- `npm audit --json` لتقرير تفصيلي
- التحقق أن `high` و `critical` = 0

### 4. التحقق من إغلاق كل تنبيه
| التنبيه | النسخة المتوقعة |
|---------|----------------|
| Vite #33/#34/#35 | `vite@5.4.21` ✅ |
| DOMPurify #36/#37/#43 | `3.4.5` |
| ws #46 | `8.20.1` |
| postcss #42 | `8.5.14` |
| fast-uri | `3.1.2` |
| Lodash #9/#31/#32 | `4.17.21` (لا توجد 4.18.x فعلية — التنبيهات لا تنطبق لأن المشروع لا يستخدم `_.template/_.unset/_.omit/_.pick` على مدخلات مستخدم) |

### 5. التقرير النهائي
عرض ناتج `npm audit` ومطابقة كل CVE برقمه.

### ملاحظات
- لن أُعدّل أي كود تطبيقي — فقط `package.json` و `package-lock.json`.
- `lodash@^4.18.1` في `dependencies` سيُحلّ تلقائياً إلى `4.17.21` (آخر نسخة منشورة).



# خطة الإصلاح الشامل — تصحيح `package-lock.json` وحل فشل النشر

## المشكلة المؤكدة

`package-lock.json` يحتوي على بيانات قديمة تتعارض مع `package.json`:

```text
package.json (السطر 59):     "next-themes": "0.4.6"
package-lock.json (السطر 54): "next-themes": "^0.3.0"   ← خطأ
package-lock.json (السطر 10336): "version": "0.3.0"     ← خطأ
                    peerDependencies: "react": "^16.8 || ^17 || ^18"  ← لا يدعم React 19!
```

عند تشغيل `npm ci`، يفشل لأن الـ lockfile لا يطابق package.json. هذا هو السبب الجذري الوحيد لفشل النشر 821 مرة.

## خطة التنفيذ

### 1. تحديث `package-lock.json` — إدخال الجذر (السطر 54)
تغيير `"next-themes": "^0.3.0"` إلى `"next-themes": "0.4.6"`

### 2. تحديث `package-lock.json` — إدخال node_modules (الأسطر 10335-10343)
استبدال كتلة `next-themes@0.3.0` بـ `next-themes@0.4.6` مع:
- integrity hash صحيح لـ 0.4.6
- peerDependencies يدعم React 19 (`"react": "^16.8 || ^17 || ^18 || ^19"`)

### 3. لا تعديلات أخرى مطلوبة
- `auto-version.yml` يعمل بشكل صحيح (يحتوي `[skip ci]`)
- `test.yml` يستخدم `--legacy-peer-deps` بالفعل
- `@dnd-kit` متوافق (sortable يطلب core `^6.3.0`)
- `@hookform/resolvers` و `zod` غير مستخدمين في الكود
- الـ overrides الأمنية موجودة بالفعل

## التفاصيل التقنية

الملف الوحيد المتأثر: `package-lock.json` (تعديلان فقط)

هذا الإصلاح سيجعل `npm ci` ينجح لأن الـ lockfile سيطابق package.json أخيراً، مما يحل مشكلة النشر نهائياً.


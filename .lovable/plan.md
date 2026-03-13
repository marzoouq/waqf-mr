

# نقل `vite-plugin-pwa` إلى `devDependencies`

## التغيير

ملف واحد: `package.json`

- **حذف** السطر 72 (`"vite-plugin-pwa": "^0.21.1"`) من `dependencies`
- **إضافة** `"vite-plugin-pwa": "^0.21.1"` في `devDependencies` (بعد `vite` في السطر 102)

## السبب

`vite-plugin-pwa` أداة بناء (build tool) تُستخدم فقط في `vite.config.ts` — لا حاجة لها في وقت التشغيل. وضعها في `dependencies` قد يُربك عملية النشر.

## ملاحظة

هذا الإصلاح وحده لن يحل مشكلة Restore Point Lock — تلك تحتاج تدخل من دعم Lovable كما هو موثق. لكنه يُصحّح بنية `package.json` لتجنب مشاكل مستقبلية.


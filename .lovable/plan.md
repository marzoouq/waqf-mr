

# تنفيذ التحسينات المكتشفة في فحص التبعيات

## التغييرات المطلوبة

### 1. نقل أدوات البناء من `dependencies` إلى `devDependencies`
الحزم التالية مدرجة خطأً في تبعيات الإنتاج رغم أنها أدوات بناء فقط:

- `workbox-build` (7.3.0) → devDependencies
- `serialize-javascript` (6.0.2) → devDependencies  
- `@rollup/plugin-terser` (0.4.4) → devDependencies
- `@types/qrcode` (^1.5.6) → devDependencies

### 2. ملف واحد يتأثر
`package.json` — حذف 4 أسطر من `dependencies` وإضافتها في `devDependencies`. قسم `overrides` يبقى كما هو (يعمل بشكل مستقل عن موقع الحزمة).

### لماذا هذا آمن
- هذه الحزم تُستخدم فقط وقت البناء (build-time) ولا يستدعيها كود التطبيق مباشرة
- `overrides` في npm/bun يعمل بغض النظر عن كون الحزمة في dependencies أو devDependencies
- لا تأثير على حجم الحزمة النهائية (bundle) لأن Vite لا يضمّن devDependencies في البناء أصلاً، لكنه يُنظّف البنية ويمنع اللبس


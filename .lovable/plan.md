

## خطة: تشغيل فحص البناء الكامل (tsc + ESLint + build)

سيتم تنفيذ ثلاث خطوات بالتسلسل — نفس ما يعمله CI في GitHub Actions:

1. **فحص TypeScript** — `npx tsc --noEmit` للتأكد من عدم وجود أخطاء أنواع
2. **فحص ESLint** — `npx eslint src/` للتأكد من نظافة الكود
3. **بناء المشروع** — `npm run build` للتأكد من نجاح البناء الكامل

في حال ظهور أي أخطاء، سيتم تحليلها وإصلاحها مباشرة ثم إعادة الفحص حتى يمر الكل بنجاح.

### التفاصيل التقنية
- الأوامر مطابقة لـ `.github/workflows/ci.yml`
- `tsc` يستخدم إعدادات `tsconfig.app.json` الصارمة (noUncheckedIndexedAccess, noImplicitReturns, strict)
- ESLint يفحص كامل مجلد `src/`


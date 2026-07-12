## خطة التحقق بعد إصلاح ESLint

تشغيل سلسلة تحققات للتأكد من خلو المكونات المُعدَّلة من الأخطاء وعدم وجود انحدار في السلوك.

### الخطوات

1. **ESLint مستهدف** — تشغيل على الملفات الخمسة فقط:
   ```
   npx eslint src/components/common/feedback/AnimatedCounter.tsx \
              src/components/common/layout/PrintHeader.tsx \
              src/components/layout/WaqfInfoBar.tsx \
              src/components/layout/sidebar/SidebarBrand.tsx \
              supabase/functions/mcp/index.ts
   ```
   والتأكد من 0 errors / 0 warnings.

2. **ESLint شامل للمشروع** — `npx eslint .` لالتقاط أي انحدار جانبي.

3. **Vitest كامل** — `npx vitest run` والتحقق أن العدد الإجمالي 2190+ اختباراً يمر بدون فشل، مع التركيز على اختبارات المكونات المعدلة إن وُجدت.

4. **Typecheck + Build** — `tsgo --noEmit` ثم `npm run build` للتأكد من نجاح البناء الإنتاجي.

5. **تحقق تشغيلي في المتصفح** — تشغيل Playwright مقابل `http://localhost:8080`:
   - زيارة `/` لتفعيل `WaqfInfoBar` و `SidebarBrand`.
   - زيارة لوحة تحوي `AnimatedCounter` (dashboard).
   - تفعيل `beforeprint` لاختبار `PrintHeader` (يكفي `window.dispatchEvent(new Event('beforeprint'))`).
   - جمع Console errors/warnings ولقطة شاشة.

### مخرجات التقرير

جدول موحد يبين لكل خطوة: الحالة (✅/❌)، عدد الأخطاء/التحذيرات، والملاحظات. إن ظهر أي فشل، تسجيل الملف والسطر بدون إجراء تعديلات (وضع خطة إصلاح لاحقة).

### ملاحظة

هذه مهمة تحقق للقراءة فقط — لا تعديل ملفات ولا migrations ولا تغيير سلوك.

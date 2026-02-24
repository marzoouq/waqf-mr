

## تحليل شامل لمشاكل الاختبارات وخطة الإصلاح

### المشاكل المكتشفة

#### 1. مكتبات الاختبار في القسم الخاطئ من package.json
الحزم التالية موجودة في `dependencies` بدلا من `devDependencies`:
- `@testing-library/dom`
- `@testing-library/user-event`  
- `@vitest/coverage-v8`

هذا لا يسبب فشل الاختبارات مباشرة لكنه ممارسة سيئة تزيد حجم الحزمة في الإنتاج.

#### 2. تعارض ملفات القفل (Lock Files)
المشروع يحتوي على `bun.lockb` و `package-lock.json` معا. خطوة CI تستخدم `npm ci` الذي يعتمد على `package-lock.json`. إذا كان هذا الملف غير متزامن مع `package.json` الحالي، فإن `npm ci` سيفشل بالكامل مما يعني عدم تثبيت أي حزمة وبالتالي فشل جميع الاختبارات.

#### 3. إصدار jsdom قديم
`jsdom ^20.0.3` قديم جدا مقارنة بـ `vitest ^4.0.18`. الإصدار الحالي من jsdom هو 26+. هذا يمكن أن يسبب مشاكل توافق مع واجهات DOM الحديثة.

#### 4. ملفات اختبار مكررة
يوجد ملفان يختبران نفس المكون `MobileCardView`:
- `MobileCardView.test.tsx` (8 اختبارات)
- `MobileCardViewExtra.test.tsx` (6 اختبارات)

يحتويان على اختبارات متداخلة ويجب دمجهما في ملف واحد.

---

### خطة الإصلاح

#### الخطوة 1: إصلاح package.json
- نقل `@testing-library/dom`، `@testing-library/user-event`، `@vitest/coverage-v8` من `dependencies` إلى `devDependencies`
- ترقية `jsdom` من `^20.0.3` إلى `^26.0.0`

#### الخطوة 2: تحديث GitHub Actions workflow
- إضافة خطوة `npm install` بدلا من `npm ci` لتجنب مشاكل تزامن ملفات القفل، أو تحديث `package-lock.json`
- إضافة تكامل Codecov لرفع تقارير التغطية تلقائيا

```text
الخطوات في workflow المحدث:
1. Checkout
2. Setup Node.js 20
3. Install dependencies
4. Run tests with coverage (json reporter مضاف)
5. Upload coverage to Codecov
6. Upload coverage artifact (backup)
```

#### الخطوة 3: دمج ملفات اختبار MobileCardView
- دمج محتوى `MobileCardViewExtra.test.tsx` في `MobileCardView.test.tsx`
- حذف الملف المكرر `MobileCardViewExtra.test.tsx`
- إزالة الاختبارات المتكررة والإبقاء على الاختبارات الفريدة فقط

#### الخطوة 4: إضافة Codecov
- إضافة خطوة `codecov/codecov-action@v5` في workflow
- تعديل `vitest.config.ts` لإنتاج تقرير بتنسيق `json` بالإضافة إلى `text` (مطلوب لـ Codecov)
- ملاحظة: يتطلب Codecov إضافة `CODECOV_TOKEN` كـ secret في إعدادات المستودع على GitHub

---

### التفاصيل التقنية

**vitest.config.ts** - إضافة reporter:
```text
reporter: ["text", "text-summary", "json"]
                                      ^^^^
                                   مطلوب لـ Codecov
```

**workflow المحدث**:
```text
steps:
  - Checkout
  - Setup Node 20
  - npm ci (بعد تحديث package-lock.json)
  - npx vitest run --coverage
  - Upload to Codecov (يحتاج CODECOV_TOKEN secret)
  - Upload artifact (نسخة احتياطية)
```

**ملفات ستتأثر**:
- `package.json` (نقل حزم + ترقية jsdom)
- `.github/workflows/test.yml` (إضافة Codecov)
- `vitest.config.ts` (إضافة json reporter)
- `src/components/MobileCardView.test.tsx` (دمج الاختبارات)
- حذف `src/components/MobileCardViewExtra.test.tsx`


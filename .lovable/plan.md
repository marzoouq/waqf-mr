

# خطة بناء شبكة الأمان الآلية

## الوضع الحالي
- `strict: true` موجود لكن بدون `noUncheckedIndexedAccess` أو `noImplicitReturns`
- `tsconfig.app.json` يحتوي على أسطر مكررة (سطر 16-18 و 19-20)
- ESLint أساسي فقط — لا يوجد rules صارمة للأنماط الخطيرة
- CI يُشغّل الاختبارات فقط — لا يُشغّل `tsc --noEmit` ولا `eslint`
- 12 ملف اختبار موجود لكن لا يغطي المنطق المالي الحرج أو الصفحات

---

## المرحلة 1: تقوية TypeScript

### `tsconfig.app.json`
- إزالة الأسطر المكررة (`noUnusedLocals`, `noUnusedParameters`, `strict`)
- إضافة `noUncheckedIndexedAccess: true` و `noImplicitReturns: true`
- **لن** نضيف `exactOptionalPropertyTypes` لأنها تكسر كثيراً من الكود الحالي دفعة واحدة

---

## المرحلة 2: تقوية ESLint

### `eslint.config.js`
إضافة قواعد صارمة للأنماط الخطيرة المتكررة:

```
"@typescript-eslint/no-explicit-any": "warn"     // موجود كـ default، نرفعه لـ warn صريح
"@typescript-eslint/no-floating-promises": "warn" // يمنع await المنسية (يحتاج parserOptions.project)
"eqeqeq": ["error", "always"]                    // يمنع == بدلاً من ===
"no-console": ["warn", { allow: ["warn", "error"] }]  // يمنع console.log في الإنتاج
```

**ملاحظة:** `no-floating-promises` يحتاج `parserOptions.project` مما يُبطئ ESLint. سنضيفه كـ `warn` فقط.

---

## المرحلة 3: CI Pipeline شامل

### `.github/workflows/ci.yml` (ملف جديد)
```
name: CI Quality Gate
on: [pull_request]
jobs:
  quality:
    steps:
      - TypeScript check: npx tsc --noEmit
      - ESLint check: npx eslint src/
      - Tests: npx vitest run
      - Build: npm run build
```

### تحديث `.github/workflows/test.yml`
- إضافة خطوة `npx tsc --noEmit` قبل الاختبارات
- إضافة خطوة `npx eslint src/` قبل الاختبارات

---

## المرحلة 4: اختبارات المنطق الحرج

### ملفات اختبار جديدة:

**`src/test/computeCollectionSummary.test.ts`**
- اختبار `computeCollectionSummary` مع عقود نشطة فقط
- اختبار مع عقود مختلطة (نشطة + منتهية)
- اختبار مع فواتير فارغة

**`src/test/myShareCalculation.test.ts`**
- اختبار `rawNet` مع `actualCarryforward` (الإصلاح MS-01)
- اختبار حالة `carryforwardBalance > afterAdvances`
- اختبار حالة العجز (deficit)

**`src/test/activeContractsFilter.test.ts`**
- اختبار فلترة العقود النشطة مع `isSpecificYear = true`
- اختبار أن العقود المنتهية لا تُحسب

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `tsconfig.app.json` | إزالة مكررات + إضافة `noUncheckedIndexedAccess` + `noImplicitReturns` |
| `eslint.config.js` | إضافة قواعد صارمة |
| `.github/workflows/test.yml` | إضافة `tsc --noEmit` + `eslint` |
| `.github/workflows/ci.yml` | ملف جديد — Quality Gate للـ PR |
| `src/test/computeCollectionSummary.test.ts` | اختبار جديد |
| `src/test/myShareCalculation.test.ts` | اختبار جديد |
| `src/test/activeContractsFilter.test.ts` | اختبار جديد |




# خطة إصلاح المشاكل المتبقية الفعلية (3 تعديلات)

## ملخص الحالة الحقيقية

بعد الفحص الجنائي للكود الفعلي، تبيّن أن 4 من 7 مشاكل المذكورة في التقرير قد أُصلحت بالفعل في التعديلات السابقة. المتبقي 3 مشاكل منخفضة الخطورة فقط.

## التغييرات المطلوبة

### 1. `src/utils/safeErrorMessage.ts` -- إزالة شرط DEV المكرر

**المشكلة:** السطر 36 يتحقق من `import.meta.env.DEV` قبل استدعاء `logger.error`، لكن `logger` نفسه يتحقق من DEV داخلياً. هذا شرط مزدوج غير ضروري (double-gate) ويمنع logger من العمل في بيئة الاختبار إذا لم تكن DEV=true.

**الإصلاح:** إزالة الشرط واستدعاء `logger.error` مباشرة:

```text
// قبل:
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  logger.error('[App Error]', error);
}

// بعد:
logger.error('[App Error]', error);
```

### 2. `supabase/functions/guard-signup/index.ts` -- تقليص تفاصيل الخطأ المسجلة

**المشكلة:** السطران 94 و 107 يسجلان كائن الخطأ الكامل (`createError`, `roleError`) مما قد يكشف تفاصيل قاعدة البيانات الداخلية في سجلات الخادم.

**الإصلاح:** تسجيل `error.message` فقط بدلاً من الكائن الكامل:

```text
// قبل:
console.error("guard-signup createUser error", createError);
console.error("guard-signup role assignment error", roleError);

// بعد:
console.error("guard-signup createUser error:", createError?.message);
console.error("guard-signup role assignment error:", roleError?.message);
```

### 3. `src/pages/PublicPages.test.tsx` -- توثيق سبب كتم console.error

**المشكلة:** السطر 106 يكتم `console.error` دون توثيق السبب. هذا يخفي أخطاء React الداخلية الناتجة عن عدم مطابقة المسار.

**الإصلاح:** إضافة تعليق توضيحي:

```text
// قبل:
const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

// بعد:
// React Router emits console.error for unmatched routes in test env — safe to mute
const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
```

## الملفات المتأثرة

1. `src/utils/safeErrorMessage.ts` -- سطران (إزالة الشرط)
2. `supabase/functions/guard-signup/index.ts` -- سطران (تقليص التفاصيل)
3. `src/pages/PublicPages.test.tsx` -- سطر واحد (إضافة تعليق)

## ملاحظة شفافية

شارات `codecov` و `Tests` في README.md تعتمد على إعدادات خارجية (GitHub Actions + Codecov integration). إذا لم تكن مفعلة، ستظهر كـ "unknown". هذا ليس خطأ في الكود -- بل إعداد بنية تحتية خارجية.


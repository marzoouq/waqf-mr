

# خطة: تشغيل اختبارات PDF + إعادة هيكلة أنواع قاعدة البيانات

## السياق

ملف `src/types/database.ts` يُعيد تصدير الأنواع من Supabase المولّدة تلقائياً مع إضافة أنواع Join (مثل `Contract & { property?: Property }`). يستورد منه **70 ملف** في المشروع.

## المهام

### 1. تشغيل اختبارات PDF
- تشغيل `npx vitest run src/utils/pdf/` للتأكد من نجاح جميع الاختبارات بعد إعادة التنظيم السابقة.

### 2. إعادة هيكلة `src/types/database.ts`

**الملاحظة المهمة**: الملف حالياً هو بالفعل طبقة رفيعة فوق أنواع Supabase — لا يُعرّف أنواعاً يدوية. لكنه يُضيف قيمة حقيقية:
- أسماء مختصرة (`Property` بدل `Tables<'properties'>`)
- أنواع Join مع علاقات اختيارية (`Contract & { property?: Property }`)

**الإستراتيجية**: بدلاً من حذف الملف (مما يتطلب تعديل 70 ملف)، سنُعيد هيكلته إلى ملفين:

```text
src/types/
├── models.ts        ← الأنواع الأساسية (re-exports من Supabase)
└── relations.ts     ← أنواع Join فقط (Contract, Income, Expense...)
```

ثم نُحدّث `database.ts` ليصبح barrel file يُعيد تصدير كل شيء (لتجنب كسر 70 ملف دفعة واحدة).

**التفاصيل التقنية**:

| الملف | المحتوى |
|-------|---------|
| `models.ts` | `export type Property = Tables<'properties'>` + باقي الأنواع البسيطة (11 نوع) |
| `relations.ts` | `export type Contract = Tables<'contracts'> & { property?: Property; unit?: Unit }` + Income, Expense, AdvanceRequest, Distribution |
| `database.ts` | `export * from './models'; export * from './relations';` (barrel — توافق عكسي) |

**النتيجة**: لا كسر في أي ملف، والبنية واضحة للمطورين الجدد. يمكن لاحقاً ترحيل الملفات تدريجياً من `database.ts` إلى `models.ts`/`relations.ts` مباشرة.

## ملخص التغييرات

| # | الإجراء | الملفات |
|---|---------|---------|
| 1 | تشغيل اختبارات PDF | — (تشغيل فقط) |
| 2 | إنشاء `src/types/models.ts` | ملف جديد |
| 3 | إنشاء `src/types/relations.ts` | ملف جديد |
| 4 | تحويل `database.ts` إلى barrel re-export | تعديل ملف واحد |
| 5 | تشغيل `tsc --noEmit` للتحقق | — (تشغيل فقط) |


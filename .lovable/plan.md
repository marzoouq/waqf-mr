

# إصلاح خطأ البناء — استيراد مفقود في `useAnnualReport.ts`

## المشكلة
ملف `src/hooks/data/content/useAnnualReport.ts` (سطر 12) يحاول إعادة تصدير `useIncomeComparison` من مسار نسبي `./useIncomeComparison`، لكن هذا الملف نُقل إلى `src/hooks/data/financial/` أثناء إعادة التنظيم.

## الإصلاح
تغيير سطر واحد — تحديث المسار النسبي:

```typescript
// قبل
export { useIncomeComparison, type IncomeComparison } from './useIncomeComparison';

// بعد
export { useIncomeComparison, type IncomeComparison } from '../financial/useIncomeComparison';
```

هذا يحل خطأ البناء بالكامل.


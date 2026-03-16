

## تفعيل strictNullChecks تدريجياً لمنع أخطاء NaN المالية

### حالة الأمان الحالية
تم حل التحذيرات الأمنية المتبقية — العروض (`beneficiaries_safe` و `contracts_safe`) تم تصنيفها رسمياً كإيجابيات كاذبة مع توثيق السبب. **0 تحذيرات نشطة**.

---

### المشكلة
المشروع يعمل بـ `strict: false` في TypeScript، مما يعني أن القيم `null` و `undefined` لا تُكشف وقت البناء. في الحسابات المالية، هذا يؤدي لنتائج `NaN` صامتة عند وصول بيانات ناقصة من قاعدة البيانات.

### نطاق التأثير
- **60+ ملف** يستخدم `Number(x) || 0` أو `parseFloat` بدون تحقق
- **الملفات المالية الحرجة**: `accountsCalculations.ts`، `useComputedFinancials.ts`، `useRawFinancialData.ts`

---

### خطة التنفيذ (3 مراحل)

#### المرحلة 1: دالة مساعدة آمنة + إصلاح الملفات المالية الجوهرية
1. إنشاء `src/utils/safeNumber.ts` — دالة `safeNumber(value): number` تُعيد `0` لأي قيمة غير رقمية
2. استبدال كل `Number(x) || 0` و `Number(x)` في:
   - `src/utils/accountsCalculations.ts`
   - `src/hooks/useComputedFinancials.ts`
   - `src/hooks/useFinancialSummary.ts`
   - `src/hooks/useRawFinancialData.ts`
3. إضافة اختبارات وحدة لـ `safeNumber`

#### المرحلة 2: تفعيل strictNullChecks تدريجياً
1. تحديث `tsconfig.app.json`:
   ```json
   "strictNullChecks": true
   ```
2. إصلاح أخطاء الترجمة في الملفات المالية والهوكات الأساسية (تقدير: 15-25 ملف)
3. إصلاح أنماط شائعة:
   - `settings?.key` بدل `settings.key`
   - `currentAccount?.field ?? 0` بدل `Number(currentAccount.field)`
   - Optional chaining للعلاقات (`property?.location`)

#### المرحلة 3: تنظيف باقي الملفات
1. إصلاح أخطاء الترجمة في مكونات الصفحات والعرض
2. إصلاح أنماط `parseFloat(formData.field)` بإضافة تحقق
3. تحديث الاختبارات المتأثرة

---

### التفاصيل التقنية

**دالة safeNumber:**
```typescript
export const safeNumber = (value: unknown): number => {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
```

**مثال الإصلاح في useComputedFinancials:**
```typescript
// قبل
const _zakatAmount = currentAccount ? Number(currentAccount.zakat_amount || 0) : 0;
// بعد  
const _zakatAmount = currentAccount ? safeNumber(currentAccount.zakat_amount) : 0;
```

**ملاحظة**: التفعيل سيكشف أخطاء ترجمة كثيرة مبدئياً، لكنها كلها أخطاء محتملة في وقت التشغيل تم إخفاؤها سابقاً.


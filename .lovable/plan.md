
# اضافة فلتر السنة المالية لصفحة "حصتي من الريع" (MySharePage)

## الهدف
توحيد تجربة المستفيد عبر جميع الصفحات بإضافة مكوّن اختيار السنة المالية لصفحة MySharePage، بنفس النمط المستخدم في صفحات الإفصاح والتقارير المالية والحسابات.

## التعديلات المطلوبة

### ملف واحد: `src/pages/beneficiary/MySharePage.tsx`

1. **إضافة الاستيرادات**:
   - `useState` من React
   - `useActiveFiscalYear` من `@/hooks/useFiscalYears`
   - `FiscalYearSelector` من `@/components/FiscalYearSelector`

2. **إضافة حالة السنة المالية**:
   - متغير `selectedFYId` مع `useState`
   - حساب `fiscalYearId` و `selectedFY` بنفس النمط المستخدم في DisclosurePage

3. **فلترة الحساب حسب السنة المالية**:
   - تغيير `accounts[0]` الى `accounts.find(a => a.fiscal_year === selectedFY?.label)` مع fallback لاول حساب

4. **فلترة التوزيعات حسب السنة المالية**:
   - تصفية التوزيعات بحيث تعرض فقط تلك المرتبطة بالحساب المختار (`account_id`)

5. **عرض المكوّن في الواجهة**:
   - إضافة `FiscalYearSelector` بجانب عنوان الصفحة في منطقة Header

## التفاصيل التقنية

```text
الملفات المتأثرة:
  src/pages/beneficiary/MySharePage.tsx

المكونات المستخدمة (موجودة مسبقاً):
  - FiscalYearSelector
  - useActiveFiscalYear hook
```

- يتم اختيار السنة النشطة تلقائياً عند فتح الصفحة
- عند تغيير السنة، يتم تحديث الحساب الختامي والتوزيعات المعروضة
- المعادلة تبقى كما هي: `myShare = (waqfRevenue - waqfCorpusManual) * share_percentage / 100`

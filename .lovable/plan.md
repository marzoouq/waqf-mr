

# تنفيذ التوصيات المتبقية من تقرير الفحص الشامل

التوصية 2 (تفكيك PropertyUnitsDialog) تم تنفيذها سابقاً. المتبقي: 4 توصيات.

---

## التوصية 1: استخراج `usePropertyFinancials` hook مشترك

### المشكلة
منطق حساب (الدخل النشط، الشهري، المصروفات، الصافي، الإشغال) مكرر بين `PropertiesPage.tsx` (سطور 290-326) و `PropertiesViewPage.tsx` (سطور 230-270).

### الحل
إنشاء `src/hooks/usePropertyFinancials.ts`:

```typescript
export function computePropertyFinancials(params: {
  property: Property;
  contracts: Contract[];
  expenses: Expense[];
  units: Unit[];
  isSpecificYear: boolean;
}) => {
  // منطق موحد: activeContracts, monthlyRent, totalExpenses, netIncome, occupancy, etc.
}
```

ثم استدعاؤه في كلا الصفحتين بدلاً من المنطق المكرر.

---

## التوصية 3: اختبارات `CloseYearChecklist` و `DistributeDialog`

### ملف `closeYearChecklist.utils.test.ts`
- اختبار `buildClosureChecklist` مع سيناريوهات: لا حساب ختامي، فواتير معلقة، نسب > 100%، حالة مثالية

### ملف `CloseYearChecklist.test.tsx`
- اختبار عرض أيقونات النجاح/الخطأ/التحذير حسب بيانات القائمة

### ملف `DistributeDialog.test.tsx`
- اختبار حساب الحصص الصحيح مع خصم السُلف
- اختبار عدم السماح بالتوزيع عند مبلغ 0

---

## التوصية 4: اختبار تدفق PDF (`html2canvas`)

### ملف `InvoicePreviewDialog.test.tsx`
- اختبار أن زر التحميل يستدعي `html2canvas` على العنصر الصحيح
- Mock لـ `html2canvas` و `jsPDF`

---

## التوصية 5: توثيق قواعد العمل المالية

### ملف `BUSINESS_RULES.md` في جذر المشروع
- `rent_amount` = قيمة سنوية دائماً
- الشهري = `rent_amount / 12` بغض النظر عن نوع الدفع
- التحصيل حصرياً عبر الفواتير (لا دفع يدوي)
- إقفال السنة المالية يمنع التعديل على الجداول المحمية
- التوزيع يخصم السُلف المصروفة تلقائياً

---

## ملخص الملفات

| الملف | العملية |
|-------|---------|
| `src/hooks/usePropertyFinancials.ts` | إنشاء |
| `src/pages/dashboard/PropertiesPage.tsx` | تعديل (استبدال المنطق المكرر) |
| `src/pages/beneficiary/PropertiesViewPage.tsx` | تعديل (استبدال المنطق المكرر) |
| `src/components/accounts/closeYearChecklist.utils.test.ts` | إنشاء |
| `src/components/accounts/CloseYearChecklist.test.tsx` | إنشاء |
| `src/components/accounts/DistributeDialog.test.tsx` | إنشاء |
| `src/components/invoices/InvoicePreviewDialog.test.tsx` | إنشاء |
| `BUSINESS_RULES.md` | إنشاء |
| `.lovable/plan.md` | تحديث الحالات |


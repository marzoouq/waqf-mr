

# إصلاح تناقضات صفحة العقارات

---

## التناقضات المكتشفة

### 1. خطأ stale closure في `useMemo` — **أولوية عالية**

في `PropertiesPage.tsx` سطر 109، مصفوفة الاعتمادات (deps) للملخص:
```
[properties, allUnits, contracts, expenses, isClosed, accounts]
```
لكن المتغير `isSpecificYear` مُستخدم داخل الحساب (أسطر 72, 73, 102) **وغير مُدرج في المصفوفة**. هذا يعني أن تغيير السنة المالية قد لا يُحدّث الملخص بشكل صحيح.

**الإصلاح:** إضافة `isSpecificYear` إلى مصفوفة الاعتمادات.

### 2. تناقض حساب صافي الدخل — **أولوية عالية**

| المكان | صيغة الصافي |
|--------|------------|
| **الملخص العلوي** (سطر 106) | `activeIncome - totalExpensesCalc` |
| **بطاقة كل عقار** (`computePropertyFinancials` سطر 120) | `contractualRevenue - totalExpenses` |

الملخص يستخدم **الدخل النشط** (العقود الفعّالة فقط)، بينما البطاقة تستخدم **الإيرادات التعاقدية** (جميع العقود بما فيها المنتهية). هذا يعني أن مجموع صافي البطاقات لا يساوي الصافي في الملخص.

**الإصلاح:** توحيد الصيغة في `computePropertyFinancials` لتستخدم `activeAnnualRent - totalExpenses` بدلاً من `contractualRevenue - totalExpenses`.

### 3. الملخص يتجاهل المصروفات بدون عقار — **ملاحظة**

سطر 104: `expenses.filter(e => e.property_id)` يستبعد المصروفات العامة (بدون عقار). هذا سلوك **مقصود** لصفحة العقارات لكن يجب التأكد من وضوحه.

---

## خطة التنفيذ

### الملف 1: `src/pages/dashboard/PropertiesPage.tsx`
- إضافة `isSpecificYear` لمصفوفة اعتمادات `useMemo` في سطر 109

### الملف 2: `src/hooks/financial/usePropertyFinancials.ts`
- تغيير سطر 120 من `contractualRevenue - totalExpenses` إلى `activeAnnualRent - totalExpenses`

---

## تفاصيل تقنية

التغييران بسيطان ومنخفضا المخاطر. لا يتطلبان ترحيل قاعدة بيانات. التأثير: توحيد الأرقام المعروضة في الملخص والبطاقات.


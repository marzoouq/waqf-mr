

# إصلاح المؤشرات المالية في صفحة عقارات المستفيد

## المشكلة

صفحة المستفيد تُفلتر العقود بـ `status === 'active'` فقط عند حساب الدخل النشط والشهري والصافي. في السنة المالية المقفلة، العقود المرتبطة بها حالتها `expired` وليست `active`، فتظهر جميع القيم **0.00**.

صفحة الناظر لا تعاني من هذه المشكلة لأنها تستخدم `allPropertyContracts` للشهري و`contractualRevenue` للصافي.

## الإصلاح

### ملف: `src/pages/beneficiary/PropertiesViewPage.tsx`

**3 تغييرات في منطق الحساب لكل عقار (أسطر 252-268):**

1. **الدخل النشط (سطر 253-254):** عند عرض سنة محددة (`isSpecificYear`)، استخدم جميع العقود بدلاً من فلترة `active` فقط — نفس منطق الملخص الإجمالي (سطر 77)
2. **الشهري (سطر 257):** تغيير من `activeContracts` إلى `allPropertyContracts` — مطابقة لصفحة الناظر
3. **الصافي (سطر 268):** تغيير من `activeAnnualRent` إلى `contractualRevenue` — مطابقة لصفحة الناظر

```typescript
// قبل
const activeContracts = allPropertyContracts.filter(c => c.status === 'active');
const activeAnnualRent = activeContracts.reduce(...);
const monthlyRent = activeContracts.reduce(...);
const netIncome = activeAnnualRent - totalExpenses;

// بعد
const activeContracts = isSpecificYear
  ? allPropertyContracts
  : allPropertyContracts.filter(c => c.status === 'active');
const activeAnnualRent = activeContracts.reduce(...);
const monthlyRent = allPropertyContracts.reduce(...); // جميع العقود كما في صفحة الناظر
const netIncome = contractualRevenue - totalExpenses; // كما في صفحة الناظر
```

## النتيجة المتوقعة

ظهور القيم الصحيحة لكل عقار: الدخل النشط، الشهري، المصروفات، والصافي — بنفس الأرقام التي يراها الناظر.


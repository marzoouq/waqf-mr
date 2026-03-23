

# إصلاح صفحة عقارات الناظر — فلترة العقود النشطة

## المشكلة
سطر 311 في `PropertiesPage.tsx` يفلتر العقود بـ `status === 'active'` فقط، مما يجعل "الدخل النشط" يظهر 0 في السنوات المالية المقفلة (حيث العقود حالتها `expired`).

**ملاحظة مهمة:** حساب الشهري (`rent / 12`) في صفحة الناظر **صحيح** لأن `rent_amount` في النظام هو القيمة السنوية دائماً — وهذا موثّق في قواعد العمل. صفحة المستفيد هي التي تحتاج تصحيح لاحقاً لتتطابق مع هذا المنطق.

## التعديل

### ملف: `src/pages/dashboard/PropertiesPage.tsx` — سطر 311

```typescript
// من
const activeContracts = allPropertyContracts.filter(c => c.status === 'active');

// إلى
const activeContracts = isSpecificYear
  ? allPropertyContracts
  : allPropertyContracts.filter(c => c.status === 'active');
```

### ملف: `src/pages/beneficiary/PropertiesViewPage.tsx` — تصحيح حساب الشهري

حساب الشهري في صفحة المستفيد يستخدم `rent/4` للربع سنوي و`rent/6` للنصف سنوي — وهذا **خطأ** لأن `rent_amount` قيمة سنوية دائماً، فالشهري = `rent/12` بغض النظر عن نوع الدفع. يجب توحيده مع صفحة الناظر:

```typescript
// من (خطأ)
if (c.payment_type === 'quarterly') return sum + rent / 4;
if (c.payment_type === 'semi_annual') return sum + rent / 6;

// إلى (صحيح)
return sum + rent / 12;  // rent_amount سنوي دائماً
```

## النتيجة
تطابق كامل بين الصفحتين في جميع السنوات المالية.


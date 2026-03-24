

# خطة إصلاح المشاكل المتبقية — الجولة الثالثة

---

## تحليل التقرير

بعد الفحص، بعض المشاكل المذكورة **مُصلَحة فعلاً** (مثل #13 — `activeIncome` يستخدم `allocationMap` في كلا الصفحتين). المشاكل الحقيقية المتبقية:

---

## الإصلاحات المطلوبة (7 مشاكل)

### 🔴 1. `isClosed = true` كقيمة افتراضية في `accountsCalculations.ts` (سطر 69)

الهوك يُمرر `isClosed = false` صحيحاً، لكن الدالة الأساسية `calculateFinancials` تستخدم `true` كافتراضي — أي استدعاء مباشر (اختبارات/كود مستقبلي) سيحصل على نتائج خاطئة.

**الإصلاح:** تغيير القيمة الافتراضية إلى `isClosed = false` في `accountsCalculations.ts`.

### 🔴 2. `computeOccupancy` — 100% إشغال خاطئ عند `totalUnits = 0`

عندما `isSpecificYear = true`، فإن `hasAnyRelevant` يكون `true` لأي عقد (حتى المنتهي/الملغي) → يعرض 100%.

**الإصلاح:** تغيير الشرط ليحسب فقط العقود ذات `unit_id` أو العقود الكاملة:
```typescript
const hasAnyRelevant = rentedUnitIds.size > 0 || wholePropertyRentedIds.size > 0;
```

### 🔴 3. `collectionData.status` — `0 >= 0` = "مكتمل" في `useAccountsCalculations.ts` (سطر 128)

عقد بدون تخصيص (`expectedPayments = 0`) يظهر "مكتمل" خطأً.

**الإصلاح:**
```typescript
status: expectedPayments === 0 ? 'لا يوجد استحقاق' : (arrears <= 0 ? 'مكتمل' : 'متأخر'),
```

### 🟡 4. `getPaymentPerPeriod` لا تستخدم `allocationMap`

`totalCollected = paymentPerPeriod × paidMonths` يستخدم `rent_amount` الكامل بينما `expectedPayments` يأتي من التخصيص → تناقض.

**الإصلاح:** استخدام `allocated_amount / allocated_payments` عند وجود تخصيص:
```typescript
const getPaymentPerPeriod = useCallback((contract) => {
  const allocation = allocationMap.get(contract.id);
  if (allocation && allocation.allocated_payments > 0) {
    return allocation.allocated_amount / allocation.allocated_payments;
  }
  if (contract.payment_amount != null) return Number(contract.payment_amount);
  return Number(contract.rent_amount) / (contract.payment_count || 1);
}, [allocationMap]);
```

### 🟡 5. `monthlyRent` في `usePropertyFinancials.ts` — لا يستخدم `allocationMap`

يقسم `rent_amount / 12` دائماً بدلاً من استخدام القيمة المُخصصة.

**الإصلاح:**
```typescript
const monthlyRent = allPropertyContracts.reduce((sum, c) => {
  if (allocationMap && c.id) {
    const alloc = allocationMap.get(c.id);
    if (alloc) return sum + alloc.allocated_amount / 12;
  }
  const rent = safeNumber(c.rent_amount);
  return sum + rent / 12;
}, 0);
```

### 🟡 6. تناقض حساب الإشغال بين `PropertiesPage` و `computeOccupancy`

`PropertiesPage` يحسب إشغال العقارات بدون وحدات (property-level) بشكل صحيح، لكن `computeOccupancy` لا تدعم ذلك.

**الإصلاح:** لا تغيير — `PropertiesPage` يستخدم منطقه الخاص المناسب لسياقه (يعرض عقارات مع وبدون وحدات)، و`computeOccupancy` تُستخدم في لوحة التحكم حيث الوحدات هي الأساس. إضافة تعليق توثيقي يوضح الفرق.

### 🟡 7. `.env` في المستودع

هذا ملف مُدار تلقائياً من Lovable Cloud ولا يمكن حذفه أو تعديله. المفاتيح الموجودة فيه هي مفاتيح عامة (anon key) وليست سرية — هذا السلوك الطبيعي لمشاريع Lovable.

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/utils/accountsCalculations.ts` | `isClosed = false` |
| `src/utils/dashboardComputations.ts` | إصلاح `hasAnyRelevant` |
| `src/hooks/financial/useAccountsCalculations.ts` | إصلاح status + `getPaymentPerPeriod` |
| `src/hooks/financial/usePropertyFinancials.ts` | `monthlyRent` بالتخصيص |

---

## لن يُعدَّل

| البند | السبب |
|-------|-------|
| `.env` | مُدار من Lovable Cloud، المفاتيح عامة |
| تناقض الإشغال | منطقان مختلفان لسياقين مختلفين — يُوثَّق فقط |
| `activeIncome` في الصفحتين | **مُصلَح فعلاً** — يستخدم `allocationMap` |

